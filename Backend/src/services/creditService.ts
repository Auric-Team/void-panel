import { db } from "../db/database.js";
import type { CreditTransactionRecord, UserPublicProfile } from "../types/index.js";

export const CreditService = {
  getBalance(userId: number): number {
    const row = db.query("SELECT credits FROM users WHERE id = ?").get(userId) as { credits: number } | undefined;
    return row ? row.credits : 0;
  },

  canAfford(userId: number, cost: number): boolean {
    const balance = this.getBalance(userId);
    return balance >= cost;
  },

  /**
   * Deduct credits from user account and record transaction (used for Key generation)
   */
  deductCredits(
    userId: number,
    amount: number,
    description: string,
    type: "key_create" | "deduct" = "key_create",
    performedBy?: UserPublicProfile
  ): { success: boolean; newBalance: number; error?: string } {
    if (amount <= 0) return { success: true, newBalance: this.getBalance(userId) };

    const user = db.query("SELECT id, username, credits, role FROM users WHERE id = ?").get(userId) as any;
    if (!user) return { success: false, newBalance: 0, error: "User not found" };

    // Owners have unlimited credits
    if (user.role === "owner") {
      return { success: true, newBalance: user.credits };
    }

    if (user.credits < amount) {
      return {
        success: false,
        newBalance: user.credits,
        error: `Insufficient credit balance. Required: ${amount} credits, available: ${user.credits} credits.`,
      };
    }

    const newBalance = user.credits - amount;
    const now = Date.now();

    // Atomic update
    db.run("UPDATE users SET credits = ? WHERE id = ?", [newBalance, userId]);

    // Record in transaction ledger
    db.run(
      `INSERT INTO credit_transactions (
        user_id, amount, balance_after, type, description, performed_by_id, performed_by_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        -amount,
        newBalance,
        type,
        description,
        performedBy?.id || userId,
        performedBy?.username || user.username,
        now,
      ]
    );

    return { success: true, newBalance };
  },

  /**
   * Grant credits to a user (performed by Owner or Admin)
   */
  grantCredits(
    targetUserId: number,
    amount: number,
    performedBy: UserPublicProfile,
    note?: string
  ): { success: boolean; newBalance: number; error?: string } {
    if (amount <= 0) return { success: false, newBalance: 0, error: "Amount must be greater than 0" };

    const target = db.query("SELECT id, username, credits, role, created_by FROM users WHERE id = ?").get(targetUserId) as any;
    if (!target) return { success: false, newBalance: 0, error: "Target user not found" };

    // RBAC Check: Admins cannot grant credits to other admins or owners, only to their resellers
    if (performedBy.role === "admin") {
      if (target.role !== "reseller") {
        return { success: false, newBalance: 0, error: "Admins can only grant credits to resellers." };
      }
      // Query live balance of admin directly from database
      const liveAdmin = db.query("SELECT credits FROM users WHERE id = ?").get(performedBy.id) as any;
      const currentAdminCredits = liveAdmin ? liveAdmin.credits : 0;
      if (currentAdminCredits < amount) {
        return {
          success: false,
          newBalance: 0,
          error: `Insufficient admin credits. You need ${amount} credits to transfer, but have ${currentAdminCredits}.`,
        };
      }
      // Deduct from admin
      this.deductCredits(performedBy.id, amount, `Transferred ${amount} credits to reseller @${target.username}`, "deduct", performedBy);
    }

    const newBalance = target.credits + amount;
    const now = Date.now();

    db.run("UPDATE users SET credits = ? WHERE id = ?", [newBalance, targetUserId]);

    const description = note || `Credited ${amount} units by ${performedBy?.role || "system"} @${performedBy?.username || "system"}`;
    const validPerformedById = performedBy?.id && performedBy.id > 0 ? performedBy.id : null;
    db.run(
      `INSERT INTO credit_transactions (
        user_id, amount, balance_after, type, description, performed_by_id, performed_by_name, created_at
      ) VALUES (?, ?, ?, 'grant', ?, ?, ?, ?)`,
      [targetUserId, amount, newBalance, description, validPerformedById, performedBy?.username || "system", now]
    );

    return { success: true, newBalance };
  },

  transferCredits(
    fromUserId: number,
    toUserId: number,
    amount: number,
    note: string,
    performedBy: UserPublicProfile
  ): { success: boolean; newBalance?: number; error?: string } {
    return this.grantCredits(toUserId, amount, performedBy, note);
  },

  getTransactions(userId?: number, limit = 100, offset = 0): CreditTransactionRecord[] {
    let sql = `
      SELECT t.*, u.username as target_user_name
      FROM credit_transactions t
      JOIN users u ON t.user_id = u.id
    `;
    const params: any[] = [];

    if (userId) {
      sql += " WHERE t.user_id = ?";
      params.push(userId);
    }

    sql += " ORDER BY t.id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    return db.query(sql).all(...params) as CreditTransactionRecord[];
  },
};
