import { db } from "../db/database.js";
import { CreditService } from "./creditService.js";
import type { VoucherRecord, UserPublicProfile } from "../types/index.js";

export const VoucherService = {
  getAll(): VoucherRecord[] {
    return db.query("SELECT * FROM vouchers ORDER BY id DESC").all() as VoucherRecord[];
  },

  create(code: string, credits: number, maxUses = 1, expiresAt?: number, createdBy = "admin"): { success: boolean; voucher?: VoucherRecord; error?: string } {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) return { success: false, error: "Code must be at least 4 chars" };
    if (credits <= 0) return { success: false, error: "Credits must be greater than 0" };

    const exists = db.query("SELECT id FROM vouchers WHERE code = ?").get(cleanCode);
    if (exists) return { success: false, error: "A voucher with this code already exists" };

    const res = db.run(
      "INSERT INTO vouchers (code, credits, max_uses, used_count, expires_at, created_by, created_at) VALUES (?, ?, ?, 0, ?, ?, ?)",
      [cleanCode, credits, maxUses, expiresAt || null, createdBy, Date.now()]
    );

    const v = db.query("SELECT * FROM vouchers WHERE id = ?").get(res.lastInsertRowid) as VoucherRecord;
    return { success: true, voucher: v };
  },

  redeem(code: string, user: UserPublicProfile): { success: boolean; creditsAdded: number; newBalance: number; error?: string } {
    const cleanCode = code.trim().toUpperCase();
    const v = db.query("SELECT * FROM vouchers WHERE code = ?").get(cleanCode) as VoucherRecord | undefined;

    if (!v) {
      return { success: false, creditsAdded: 0, newBalance: 0, error: "Invalid voucher code." };
    }

    if (v.expires_at && Date.now() > v.expires_at) {
      return { success: false, creditsAdded: 0, newBalance: 0, error: "This voucher code has expired." };
    }

    // Check if this user already redeemed this voucher
    const alreadyRedeemed = db.query("SELECT id FROM voucher_redemptions WHERE voucher_id = ? AND user_id = ?").get(v.id, user.id);
    if (alreadyRedeemed) {
      return { success: false, creditsAdded: 0, newBalance: 0, error: "You have already redeemed this voucher." };
    }

    if (v.used_count >= v.max_uses) {
      return { success: false, creditsAdded: 0, newBalance: 0, error: "This voucher has reached its redemption limit." };
    }

    const now = Date.now();

    // Increment voucher used count
    db.run("UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?", [v.id]);

    // Record redemption
    db.run(
      "INSERT INTO voucher_redemptions (voucher_id, user_id, username, credits_added, redeemed_at) VALUES (?, ?, ?, ?, ?)",
      [v.id, user.id, user.username, v.credits, now]
    );

    // Add credits to user
    const creditRes = CreditService.grantCredits(
      user.id,
      v.credits,
      { id: 0, username: "VOUCHER_SYSTEM", role: "owner", credits: 999999, status: "active", created_by: null, created_at: now },
      `Redeemed Gift Voucher Code: ${v.code}`
    );

    return {
      success: true,
      creditsAdded: v.credits,
      newBalance: creditRes.newBalance,
    };
  },

  delete(id: number): boolean {
    db.run("DELETE FROM vouchers WHERE id = ?", [id]);
    return true;
  },
};
