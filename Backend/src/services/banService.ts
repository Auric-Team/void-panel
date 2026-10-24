import { db } from "../db/database.js";
import type { BanRecord } from "../types/index.js";

export const BanService = {
  getBans(): BanRecord[] {
    return db.query("SELECT * FROM bans ORDER BY id DESC").all() as BanRecord[];
  },

  isBanned(hwid?: string, ip?: string): { banned: boolean; reason?: string } {
    if (hwid) {
      const banHwid = db.query("SELECT * FROM bans WHERE type = 'hwid' AND value = ?").get(hwid) as BanRecord | undefined;
      if (banHwid) {
        return { banned: true, reason: banHwid.reason };
      }
    }

    if (ip && ip !== "127.0.0.1") {
      const banIp = db.query("SELECT * FROM bans WHERE type = 'ip' AND value = ?").get(ip) as BanRecord | undefined;
      if (banIp) {
        return { banned: true, reason: banIp.reason };
      }
    }

    return { banned: false };
  },

  addBan(type: "hwid" | "ip", value: string, reason: string, bannedBy: string): { success: boolean; ban?: BanRecord; error?: string } {
    const cleanVal = value.trim();
    if (!cleanVal) return { success: false, error: "Value cannot be empty" };

    const exists = db.query("SELECT id FROM bans WHERE type = ? AND value = ?").get(type, cleanVal);
    if (exists) return { success: false, error: `This ${type.toUpperCase()} is already banned.` };

    const now = Date.now();
    const res = db.run(
      "INSERT INTO bans (type, value, reason, banned_by, created_at) VALUES (?, ?, ?, ?, ?)",
      [type, cleanVal, reason || "Violation of terms", bannedBy, now]
    );

    const created = db.query("SELECT * FROM bans WHERE id = ?").get(res.lastInsertRowid) as BanRecord;
    return { success: true, ban: created };
  },

  removeBan(id: number): boolean {
    db.run("DELETE FROM bans WHERE id = ?", [id]);
    return true;
  },
};
