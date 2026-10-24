import { db } from "../db/database.js";
import { computeSha256, generateKeyString } from "../utils/crypto.js";
import { CONFIG, getCreditCostForDuration } from "../config/index.js";
import { CreditService } from "./creditService.js";
import { BanService } from "./banService.js";
import { AnnouncementService } from "./announcementService.js";
import { SettingsService } from "./settingsService.js";
import type { KeyRecord, VerifyResult, UserPublicProfile } from "../types/index.js";

export { computeSha256, generateKeyString };

export const KeyService = {
  /**
   * 1000% Perfectly Synced with C++ Mod Menu KeySystem.cpp
   * Features: HWID Blacklist, Maintenance Killswitch, OTA Version Check, Live Announcements
   */
  verify(
    keyStr: string,
    hwid: string,
    timestamp?: number,
    hash?: string,
    ip = "127.0.0.1",
    clientVersion?: string
  ): VerifyResult {
    const now = Date.now();
    const cleanKey = (keyStr || "").trim();
    const cleanHwid = (hwid || "").trim();

    // 1. Maintenance Mode Killswitch
    const settings = SettingsService.getSettings();
    if (settings.maintenance_mode) {
      this.logAttempt(cleanKey, cleanHwid, ip, "error", "Rejected: Maintenance mode enabled");
      return {
        status: "maintenance",
        message: settings.maintenance_message,
      };
    }

    // 2. Security Blacklist / Ban Validation
    const banCheck = BanService.isBanned(cleanHwid, ip);
    if (banCheck.banned) {
      this.logAttempt(cleanKey, cleanHwid, ip, "invalid", `Rejected: Device Banned (${banCheck.reason})`);
      SettingsService.sendDiscordWebhook(
        "🚫 Blacklisted Device Connection Blocked",
        `A blacklisted device tried to authenticate with key \`${cleanKey}\` from IP \`${ip}\`.\nReason: **${banCheck.reason}**`,
        0xef4444
      );
      return {
        status: "banned",
        message: `DEVICE BLACKLISTED: ${banCheck.reason}`,
      };
    }

    // 3. OTA Client Version Enforcer
    if (clientVersion && settings.min_version) {
      if (clientVersion < settings.min_version) {
        this.logAttempt(cleanKey, cleanHwid, ip, "invalid", `Rejected: Outdated client version (${clientVersion} < ${settings.min_version})`);
        return {
          status: "update_required",
          message: `Update Required: Your mod menu (v${clientVersion}) is outdated. Please download v${settings.current_version}`,
          updateUrl: settings.download_url,
        };
      }
    }

    if (!cleanKey || cleanKey === "PASTE_YOUR_KEY_HERE" || cleanKey.length < 5) {
      this.logAttempt(cleanKey, cleanHwid, ip, "invalid", "Empty or placeholder key");
      return {
        status: "invalid",
        message: "Key is empty or invalid placeholder.",
      };
    }

    // 4. HMAC SHA256 integrity validation matching C++ client
    if (hash && timestamp) {
      const expectedPayload = cleanKey + cleanHwid + String(timestamp) + CONFIG.SECURE_SALT;
      const expectedHash = computeSha256(expectedPayload);
      if (expectedHash !== hash) {
        this.logAttempt(cleanKey, cleanHwid, ip, "invalid", "HMAC Payload hash mismatch");
        SettingsService.sendDiscordWebhook(
          "⚠️ Integrity Tamper Detected",
          `Client payload hash mismatch on key \`${cleanKey}\` from HWID \`${cleanHwid}\`.`,
          0xf59e0b
        );
        return {
          status: "invalid",
          message: "Request integrity hash mismatch. Possible tampering.",
        };
      }
    }

    // Lookup key from database
    const key = db.query("SELECT * FROM keys WHERE key_str = ?").get(cleanKey) as KeyRecord | undefined;

    if (!key) {
      this.logAttempt(cleanKey, cleanHwid, ip, "invalid", "Key does not exist in database");
      return {
        status: "invalid",
        message: "Invalid key! Key does not exist.",
      };
    }

    if (key.status === "paused") {
      this.logAttempt(cleanKey, cleanHwid, ip, "invalid", "Key is temporarily paused");
      return {
        status: "invalid",
        message: "Key has been temporarily paused by administration.",
      };
    }

    if (key.status === "revoked") {
      this.logAttempt(cleanKey, cleanHwid, ip, "invalid", "Key has been permanently revoked");
      return {
        status: "invalid",
        message: "Key has been permanently revoked.",
      };
    }

    // Check expiration if already bound
    if (key.expires_at && now > key.expires_at) {
      if (key.status !== "expired") {
        db.run("UPDATE keys SET status = 'expired' WHERE id = ?", [key.id]);
      }
      this.logAttempt(cleanKey, cleanHwid, ip, "expired", "Key validity period expired");
      return {
        status: "expired",
        message: "Your key has EXPIRED!",
        expiresAt: new Date(key.expires_at).toISOString(),
      };
    }

    // Check active announcement
    const activeAnnouncement = AnnouncementService.getActive();
    const announcementPayload = activeAnnouncement
      ? {
          title: activeAnnouncement.title,
          content: activeAnnouncement.content,
          severity: activeAnnouncement.severity,
        }
      : undefined;

    // Case 1: First-time binding (HWID is empty)
    if (!key.hwid || key.hwid.trim() === "") {
      let expiresAt: number | null = null;
      if (key.duration_days > 0) {
        expiresAt = now + key.duration_days * 86400000;
      }

      db.run(
        "UPDATE keys SET hwid = ?, bound_at = ?, expires_at = ?, status = 'active' WHERE id = ?",
        [cleanHwid, now, expiresAt, key.id]
      );

      this.logAttempt(cleanKey, cleanHwid, ip, "authenticated", "First time device activation & binding");
      SettingsService.sendDiscordWebhook(
        "✨ New Device Activated",
        `Key \`${cleanKey}\` was successfully bound to HWID \`${cleanHwid}\` (${key.duration_days > 0 ? key.duration_days + " Days" : "Lifetime"}).`,
        0x10b981
      );

      return {
        status: "authenticated",
        message: "Key Authenticated & Bound Successfully!",
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : "Lifetime",
        durationDays: key.duration_days,
        hwid: cleanHwid,
        key: cleanKey,
        announcement: announcementPayload,
      };
    }

    // Case 2: Matching HWID
    if (key.hwid === cleanHwid) {
      this.logAttempt(cleanKey, cleanHwid, ip, "authenticated", "Session re-authenticated");
      return {
        status: "authenticated",
        message: "Key Authenticated & Bound Successfully!",
        expiresAt: key.expires_at ? new Date(key.expires_at).toISOString() : "Lifetime",
        durationDays: key.duration_days,
        hwid: key.hwid,
        key: cleanKey,
        announcement: announcementPayload,
      };
    } else {
      // Case 3: Device mismatch
      this.logAttempt(cleanKey, cleanHwid, ip, "mismatch", `Bound to: ${key.hwid}, Tried from: ${cleanHwid}`);
      return {
        status: "mismatch",
        message: "Key is bound to another device!",
        boundHwid: key.hwid,
        durationDays: key.duration_days,
        expiresAt: key.expires_at ? new Date(key.expires_at).toISOString() : null,
      };
    }
  },

  logAttempt(keyStr: string, hwid: string, ip: string, status: string, message: string) {
    db.run(
      "INSERT INTO logs (key_str, hwid, ip, status, message, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      [keyStr, hwid || "", ip, status, message, Date.now()]
    );
  },

  /**
   * Create single key with automated credit deduction for resellers
   */
  createKey(
    durationDays = 30,
    note = "",
    customKey?: string,
    maxResets = 3,
    creator?: UserPublicProfile
  ): { success: boolean; key?: KeyRecord; error?: string; creditCost?: number } {
    const cost = getCreditCostForDuration(durationDays);
    const keyStr = (customKey || generateKeyString("VOID")).trim().toUpperCase();

    // Check if key already exists
    const exists = db.query("SELECT id FROM keys WHERE key_str = ?").get(keyStr);
    if (exists) {
      return { success: false, error: "A key with this string already exists." };
    }

    // Credit validation and deduction for Resellers & Admins (Owner has free generation)
    if (creator && creator.role !== "owner") {
      const deduction = CreditService.deductCredits(
        creator.id,
        cost,
        `Generated key ${keyStr} (${durationDays > 0 ? durationDays + " Days" : "Lifetime"})`,
        "key_create",
        creator
      );

      if (!deduction.success) {
        return { success: false, error: deduction.error, creditCost: cost };
      }
    }

    const now = Date.now();
    const insert = db.run(
      `INSERT INTO keys (
        key_str, status, duration_days, credit_cost, created_at, note, max_resets, reset_count, created_by_id, created_by_name
      ) VALUES (?, 'active', ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        keyStr,
        durationDays,
        cost,
        now,
        note,
        maxResets,
        creator?.id || null,
        creator?.username || "system",
      ]
    );

    const createdKey = db.query("SELECT * FROM keys WHERE id = ?").get(insert.lastInsertRowid) as KeyRecord;
    return { success: true, key: createdKey, creditCost: creator?.role === "owner" ? 0 : cost };
  },

  /**
   * Batch key generation with total credit calculation and deduction
   */
  createBatchKeys(
    count: number,
    durationDays: number,
    note: string,
    prefix: string,
    creator?: UserPublicProfile
  ): { success: boolean; keys?: KeyRecord[]; totalCost?: number; error?: string } {
    const safeCount = Math.min(Math.max(1, count), 500);
    const costPerKey = getCreditCostForDuration(durationDays);
    const totalCost = costPerKey * safeCount;

    // Check if creator can afford entire batch
    if (creator && creator.role !== "owner") {
      if (!CreditService.canAfford(creator.id, totalCost)) {
        const balance = CreditService.getBalance(creator.id);
        return {
          success: false,
          error: `Insufficient credits for batch generation. Total required: ${totalCost} credits (${safeCount} x ${costPerKey}), but your balance is ${balance} credits.`,
          totalCost,
        };
      }

      const deduction = CreditService.deductCredits(
        creator.id,
        totalCost,
        `Batch generated ${safeCount} keys of duration ${durationDays}D`,
        "key_create",
        creator
      );
      if (!deduction.success) {
        return { success: false, error: deduction.error, totalCost };
      }
    }

    const keys: KeyRecord[] = [];
    const now = Date.now();

    for (let i = 0; i < safeCount; i++) {
      const keyStr = generateKeyString(prefix);
      const res = db.run(
        `INSERT INTO keys (
          key_str, status, duration_days, credit_cost, created_at, note, max_resets, reset_count, created_by_id, created_by_name
        ) VALUES (?, 'active', ?, ?, ?, ?, 3, 0, ?, ?)`,
        [keyStr, durationDays, costPerKey, now, note, creator?.id || null, creator?.username || "system"]
      );

      const k = db.query("SELECT * FROM keys WHERE id = ?").get(res.lastInsertRowid) as KeyRecord;
      keys.push(k);
    }

    return { success: true, keys, totalCost };
  },

  getAllKeys(filters?: { search?: string; status?: string; limit?: number; offset?: number }, currentUser?: UserPublicProfile) {
    let sql = "SELECT * FROM keys WHERE 1=1";
    const params: any[] = [];

    // Role Scoping:
    // Reseller can only see keys they created
    if (currentUser?.role === "reseller") {
      sql += " AND created_by_id = ?";
      params.push(currentUser.id);
    }

    if (filters?.search) {
      sql += " AND (key_str LIKE ? OR hwid LIKE ? OR note LIKE ? OR created_by_name LIKE ?)";
      const pattern = `%${filters.search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (filters?.status && filters.status !== "all") {
      sql += " AND status = ?";
      params.push(filters.status);
    }

    sql += " ORDER BY id DESC";

    if (filters?.limit) {
      sql += " LIMIT ?";
      params.push(filters.limit);
      if (filters?.offset) {
        sql += " OFFSET ?";
        params.push(filters.offset);
      }
    }

    return db.query(sql).all(...params) as KeyRecord[];
  },

  getKeyById(id: number): KeyRecord | null {
    return (db.query("SELECT * FROM keys WHERE id = ?").get(id) as KeyRecord) || null;
  },

  resetHwid(id: number, currentUser?: UserPublicProfile): { success: boolean; message: string; resetsLeft?: number } {
    const key = this.getKeyById(id);
    if (!key) return { success: false, message: "Key not found" };

    if (currentUser?.role === "reseller" && key.created_by_id !== currentUser.id) {
      return { success: false, message: "Unauthorized: You can only reset keys created by you." };
    }

    if (currentUser?.role !== "owner" && key.reset_count >= key.max_resets) {
      return {
        success: false,
        message: `Maximum HWID resets limit reached (${key.max_resets}/${key.max_resets})`,
      };
    }

    const newCount = key.reset_count + 1;
    db.run("UPDATE keys SET hwid = NULL, bound_at = NULL, reset_count = ? WHERE id = ?", [newCount, id]);

    return {
      success: true,
      message: "HWID successfully reset. Key can now bind to a new device.",
      resetsLeft: Math.max(0, key.max_resets - newCount),
    };
  },

  updateStatus(id: number, status: "active" | "paused" | "expired" | "revoked", currentUser?: UserPublicProfile): boolean {
    const key = this.getKeyById(id);
    if (!key) return false;

    if (currentUser?.role === "reseller" && key.created_by_id !== currentUser.id) {
      return false;
    }

    db.run("UPDATE keys SET status = ? WHERE id = ?", [status, id]);
    return true;
  },

  extendDuration(id: number, additionalDays: number): boolean {
    const key = this.getKeyById(id);
    if (!key || additionalDays <= 0) return false;

    let newExpires = key.expires_at;
    if (key.expires_at) {
      newExpires = Math.max(Date.now(), key.expires_at) + additionalDays * 86400000;
    }

    db.run(
      "UPDATE keys SET duration_days = duration_days + ?, expires_at = ?, status = 'active' WHERE id = ?",
      [additionalDays, newExpires, id]
    );
    return true;
  },

  deleteKey(id: number, currentUser?: UserPublicProfile): boolean {
    const key = this.getKeyById(id);
    if (!key) return false;

    if (currentUser?.role === "reseller" && key.created_by_id !== currentUser.id) {
      return false;
    }

    db.run("DELETE FROM keys WHERE id = ?", [id]);
    return true;
  },

  bulkAction(
    action: "pause" | "activate" | "extend" | "reset_hwid" | "delete",
    keyIds: number[],
    extraDays = 30,
    currentUser?: UserPublicProfile
  ): { success: boolean; affected: number; message: string } {
    if (!keyIds || keyIds.length === 0) {
      return { success: false, affected: 0, message: "No keys specified" };
    }

    let affected = 0;
    for (const id of keyIds) {
      const key = this.getKeyById(id);
      if (!key) continue;

      // Reseller permission boundary
      if (currentUser?.role === "reseller" && key.created_by_id !== currentUser.id) {
        continue;
      }

      if (action === "pause") {
        this.updateStatus(id, "paused", currentUser);
        affected++;
      } else if (action === "activate") {
        this.updateStatus(id, "active", currentUser);
        affected++;
      } else if (action === "extend") {
        if (currentUser?.role !== "reseller") {
          this.extendDuration(id, extraDays);
          affected++;
        }
      } else if (action === "reset_hwid") {
        const res = this.resetHwid(id, currentUser);
        if (res.success) affected++;
      } else if (action === "delete") {
        this.deleteKey(id, currentUser);
        affected++;
      }
    }

    return {
      success: true,
      affected,
      message: `Successfully executed bulk ${action} on ${affected} license key(s).`,
    };
  },
};
