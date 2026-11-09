import { db } from "../db/database.js";
import { SettingsService } from "./settingsService.js";
import type { OwnerNotificationRecord, UserPublicProfile, KeyReceiptInput } from "../types/index.js";

export const NotificationService = {
  recordKeyCreation(params: {
    eventType: "key_created" | "batch_created";
    creator?: UserPublicProfile;
    quantity: number;
    durationDays: number;
    creditCost: number;
    balanceAfter: number;
    maxResets: number;
    keysList: string[];
    note: string;
    receipt?: KeyReceiptInput;
    receiptNo?: string;
  }): OwnerNotificationRecord {
    const now = Date.now();
    const creatorId = params.creator?.id || null;
    const creatorUsername = params.creator?.username || "system";
    const creatorRole = params.creator?.role || "owner";

    const customerName = (params.receipt?.customerName || "").trim();
    const paymentAmount = Math.max(0, Number(params.receipt?.amountPaid) || 0);
    const paymentCurrency = (params.receipt?.currency || "USD").toUpperCase();
    const paymentMethod = (params.receipt?.paymentMethod || "").trim();
    const paymentRef = (params.receipt?.transactionRef || "").trim();
    const proofImage = (params.receipt?.proofImage || "").trim();
    const receiptNo = (params.receiptNo || "").trim();

    const res = db.run(
      `INSERT INTO owner_notifications (
        event_type, creator_id, creator_username, creator_role, quantity, duration_days,
        credit_cost, balance_after, max_resets, keys_list, note,
        customer_name, payment_amount, payment_currency, payment_method, payment_ref, proof_image, receipt_no,
        is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        params.eventType,
        creatorId,
        creatorUsername,
        creatorRole,
        params.quantity,
        params.durationDays,
        Number(params.creditCost) || 0,
        Number(params.balanceAfter) || 0,
        params.maxResets,
        JSON.stringify(params.keysList),
        params.note || "",
        customerName,
        paymentAmount,
        paymentCurrency,
        paymentMethod,
        paymentRef,
        proofImage,
        receiptNo,
        now,
      ]
    );

    const durationLabel = params.durationDays === 0 ? "Lifetime" : `${params.durationDays} Day(s)`;
    const keysPreview =
      params.keysList.length <= 5
        ? params.keysList.map((k) => `\`${k}\``).join(", ")
        : `${params.keysList.slice(0, 5).map((k) => `\`${k}\``).join(", ")} +${params.keysList.length - 5} more`;

    const receiptLine =
      paymentAmount > 0 || paymentMethod || paymentRef
        ? `\nPayment: **${paymentAmount.toFixed(2)} ${paymentCurrency}** via **${paymentMethod || "Direct"}** (Ref: \`${paymentRef || "N/A"}\`)${receiptNo ? ` · Receipt: \`${receiptNo}\`` : ""}`
        : "";

    SettingsService.sendDiscordWebhook(
      `🔑 ${params.quantity > 1 ? `Batch (${params.quantity} Keys)` : "License Key"} Created by @${creatorUsername}`,
      `Creator: **@${creatorUsername}** (\`${creatorRole.toUpperCase()}\`)\nDuration: **${durationLabel}** · Cost: **${params.creditCost} CR** · Balance After: **${params.balanceAfter} CR**\nCustomer: **${customerName || "N/A"}** · Memo: *${params.note || "None"}*${receiptLine}\nKey(s): ${keysPreview}`,
      0x3b82f6
    );

    return this.getById(Number(res.lastInsertRowid))!;
  },

  mapRow(r: any): OwnerNotificationRecord {
    let parsedKeys: string[] = [];
    try {
      parsedKeys = JSON.parse(r.keys_list || "[]");
    } catch {
      parsedKeys = [];
    }
    return {
      id: r.id,
      event_type: r.event_type,
      creator_id: r.creator_id,
      creator_username: r.creator_username,
      creator_role: r.creator_role,
      quantity: r.quantity,
      duration_days: r.duration_days,
      credit_cost: r.credit_cost,
      balance_after: r.balance_after,
      max_resets: r.max_resets,
      keys_list: parsedKeys,
      note: r.note || "",
      customer_name: r.customer_name || "",
      payment_amount: r.payment_amount || 0,
      payment_currency: r.payment_currency || "USD",
      payment_method: r.payment_method || "",
      payment_ref: r.payment_ref || "",
      proof_image: r.proof_image || "",
      receipt_no: r.receipt_no || "",
      is_read: Boolean(r.is_read),
      created_at: r.created_at,
    };
  },

  getById(id: number): OwnerNotificationRecord | null {
    const r = db.query("SELECT * FROM owner_notifications WHERE id = ?").get(id) as any;
    if (!r) return null;
    return this.mapRow(r);
  },

  getNotifications(currentUser: UserPublicProfile, limit = 100): {
    notifications: OwnerNotificationRecord[];
    unreadCount: number;
  } {
    let rows: any[] = [];
    let unreadCount = 0;

    if (currentUser.role === "reseller") {
      rows = db
        .query("SELECT * FROM owner_notifications WHERE creator_id = ? OR LOWER(creator_username) = LOWER(?) ORDER BY id DESC LIMIT ?")
        .all(currentUser.id, currentUser.username, limit) as any[];
      unreadCount = (
        db
          .query("SELECT COUNT(*) as c FROM owner_notifications WHERE (creator_id = ? OR LOWER(creator_username) = LOWER(?)) AND is_read = 0")
          .get(currentUser.id, currentUser.username) as any
      ).c;
    } else {
      rows = db
        .query("SELECT * FROM owner_notifications ORDER BY id DESC LIMIT ?")
        .all(limit) as any[];
      unreadCount = (
        db.query("SELECT COUNT(*) as c FROM owner_notifications WHERE is_read = 0").get() as any
      ).c;
    }

    return {
      notifications: rows.map((r) => this.mapRow(r)),
      unreadCount,
    };
  },

  markRead(ids?: number[]): number {
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      db.run(`UPDATE owner_notifications SET is_read = 1 WHERE id IN (${placeholders})`, ids);
      return ids.length;
    }
    const unread = (db.query("SELECT COUNT(*) as c FROM owner_notifications WHERE is_read = 0").get() as any).c;
    db.run("UPDATE owner_notifications SET is_read = 1 WHERE is_read = 0");
    return unread;
  },

  clearAll(currentUser: UserPublicProfile): number {
    if (currentUser.role === "reseller") return 0;
    const count = (db.query("SELECT COUNT(*) as c FROM owner_notifications").get() as any).c;
    db.run("DELETE FROM owner_notifications");
    return count;
  },
};
