import { db } from "../db/database.js";
import { CreditService } from "./creditService.js";
import type { UserPublicProfile, UserRole, KeyRecord, CreditTransactionRecord, PaymentReceiptRecord } from "../types/index.js";

export const UserService = {
  getUsers(currentUser: UserPublicProfile): UserPublicProfile[] {
    let sql = `
      SELECT u.id, u.username, u.role, u.credits, u.status, u.created_by, u.created_at, u.last_login,
             c.username as creator_name,
             (SELECT COUNT(*) FROM keys k WHERE k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) as keys_generated,
             (SELECT COUNT(*) FROM keys k WHERE (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) AND k.status = 'active') as active_keys,
             (SELECT COUNT(*) FROM keys k WHERE (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) AND k.hwid IS NOT NULL AND k.hwid != '') as bound_keys,
             (SELECT COUNT(*) FROM keys k WHERE (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) AND k.status = 'expired') as expired_keys,
             (SELECT COUNT(*) FROM keys k WHERE (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) AND k.status = 'paused') as paused_keys,
             (SELECT COALESCE(SUM(k.credit_cost), 0) FROM keys k WHERE k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) as credits_spent,
             (SELECT COUNT(*) FROM payment_receipts pr WHERE pr.user_id = u.id OR LOWER(pr.username) = LOWER(u.username)) as receipts_count
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
    `;
    const params: any[] = [];

    if (currentUser.role === "reseller") {
      sql += " WHERE u.id = ?";
      params.push(currentUser.id);
    } else if (currentUser.role === "admin") {
      // Admins see resellers and themselves
      sql += " WHERE u.role = 'reseller' OR u.id = ?";
      params.push(currentUser.id);
    } else {
      // Owner sees everyone
      sql += " WHERE 1=1";
    }

    sql += " ORDER BY u.id ASC";

    const rows = db.query(sql).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      role: r.role,
      credits: r.credits,
      status: r.status,
      created_by: r.created_by,
      creator_name: r.creator_name || "System",
      created_at: r.created_at,
      last_login: r.last_login,
      keys_generated: r.keys_generated || 0,
      active_keys: r.active_keys || 0,
      bound_keys: r.bound_keys || 0,
      expired_keys: r.expired_keys || 0,
      paused_keys: r.paused_keys || 0,
      credits_spent: r.credits_spent || 0,
      receipts_count: r.receipts_count || 0,
    }));
  },

  getUserById(id: number): UserPublicProfile | null {
    const r = db.query(`
      SELECT u.id, u.username, u.role, u.credits, u.status, u.created_by, u.created_at, u.last_login,
             c.username as creator_name,
             (SELECT COUNT(*) FROM keys k WHERE k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) as keys_generated,
             (SELECT COUNT(*) FROM keys k WHERE (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) AND k.status = 'active') as active_keys,
             (SELECT COUNT(*) FROM keys k WHERE (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) AND k.hwid IS NOT NULL AND k.hwid != '') as bound_keys,
             (SELECT COUNT(*) FROM keys k WHERE (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) AND k.status = 'expired') as expired_keys,
             (SELECT COUNT(*) FROM keys k WHERE (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) AND k.status = 'paused') as paused_keys,
             (SELECT COALESCE(SUM(k.credit_cost), 0) FROM keys k WHERE k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username)) as credits_spent,
             (SELECT COUNT(*) FROM payment_receipts pr WHERE pr.user_id = u.id OR LOWER(pr.username) = LOWER(u.username)) as receipts_count
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
      WHERE u.id = ?
    `).get(id) as any;

    if (!r) return null;
    return {
      id: r.id,
      username: r.username,
      role: r.role,
      credits: r.credits,
      status: r.status,
      created_by: r.created_by,
      creator_name: r.creator_name || "System",
      created_at: r.created_at,
      last_login: r.last_login,
      keys_generated: r.keys_generated || 0,
      active_keys: r.active_keys || 0,
      bound_keys: r.bound_keys || 0,
      expired_keys: r.expired_keys || 0,
      paused_keys: r.paused_keys || 0,
      credits_spent: r.credits_spent || 0,
      receipts_count: r.receipts_count || 0,
    };
  },

  getUserAnalytics(id: number) {
    const user = this.getUserById(id);
    if (!user) return null;

    const keys = db
      .query(
        "SELECT * FROM keys WHERE created_by_id = ? OR LOWER(created_by_name) = LOWER(?) ORDER BY id DESC LIMIT 200"
      )
      .all(user.id, user.username) as KeyRecord[];

    const durationBreakdown = db
      .query(
        `SELECT duration_days,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN hwid IS NOT NULL AND hwid != '' THEN 1 ELSE 0 END) as bound_count,
                COALESCE(SUM(credit_cost), 0) as total_cost
         FROM keys
         WHERE created_by_id = ? OR LOWER(created_by_name) = LOWER(?)
         GROUP BY duration_days
         ORDER BY duration_days ASC`
      )
      .all(user.id, user.username) as any[];

    const transactions = db
      .query(
        `SELECT t.*, u.username as target_user_name
         FROM credit_transactions t
         JOIN users u ON t.user_id = u.id
         WHERE t.user_id = ? OR t.performed_by_id = ?
         ORDER BY t.id DESC LIMIT 50`
      )
      .all(user.id, user.id) as CreditTransactionRecord[];

    const receipts = db
      .query(
        "SELECT * FROM payment_receipts WHERE user_id = ? OR LOWER(username) = LOWER(?) ORDER BY id DESC LIMIT 50"
      )
      .all(user.id, user.username) as PaymentReceiptRecord[];

    return {
      user,
      keys,
      durationBreakdown,
      transactions,
      receipts,
    };
  },

  createUser(
    username: string,
    passwordPlain: string,
    targetRole: UserRole,
    initialCredits = 0,
    currentUser: UserPublicProfile
  ): { success: boolean; user?: UserPublicProfile; error?: string } {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: "Username must be at least 3 characters long." };
    }
    if (!passwordPlain || passwordPlain.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    // Role-Based Permission Validation
    if (currentUser.role === "reseller") {
      return { success: false, error: "Permission denied: Resellers cannot create users." };
    }

    if (currentUser.role === "admin") {
      if (targetRole !== "reseller") {
        return { success: false, error: "Permission denied: Admins can only create Resellers." };
      }
      if (initialCredits > 0) {
        const adminDb = db.query("SELECT credits FROM users WHERE id = ?").get(currentUser.id) as any;
        if (!adminDb || adminDb.credits < initialCredits) {
          return {
            success: false,
            error: `Insufficient admin credit balance. You have ${adminDb?.credits || 0} credits, but tried to allocate ${initialCredits}.`,
          };
        }
      }
    }

    if (currentUser.role === "owner") {
      if (targetRole !== "admin" && targetRole !== "reseller") {
        return { success: false, error: "Invalid role specified." };
      }
    }

    // Check if username taken
    const exists = db.query("SELECT id FROM users WHERE username = ?").get(cleanUsername);
    if (exists) {
      return { success: false, error: `Username '@${cleanUsername}' is already in use.` };
    }

    const passwordHash = Bun.password.hashSync(passwordPlain);
    const now = Date.now();

    const insert = db.run(
      `INSERT INTO users (username, password_hash, role, credits, status, created_by, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      [cleanUsername, passwordHash, targetRole, 0, currentUser.id, now]
    );

    const newUserId = Number(insert.lastInsertRowid);

    // If initial credits specified, grant them
    if (initialCredits > 0) {
      CreditService.grantCredits(newUserId, initialCredits, currentUser, "Initial credit allotment upon account creation");
    }

    const createdUser = this.getUserById(newUserId);
    return { success: true, user: createdUser! };
  },

  updateStatus(userId: number, status: "active" | "suspended", currentUser: UserPublicProfile): boolean {
    const target = this.getUserById(userId);
    if (!target) return false;

    if (currentUser.role === "reseller") return false;
    if (currentUser.role === "admin" && target.role !== "reseller") return false;
    if (target.role === "owner") return false;

    db.run("UPDATE users SET status = ? WHERE id = ?", [status, userId]);
    return true;
  },

  deleteUser(userId: number, currentUser: UserPublicProfile): { success: boolean; error?: string } {
    const target = this.getUserById(userId);
    if (!target) return { success: false, error: "User not found" };

    if (currentUser.role === "reseller") {
      return { success: false, error: "Unauthorized" };
    }
    if (currentUser.role === "admin" && target.role !== "reseller") {
      return { success: false, error: "Admins can only delete resellers." };
    }
    if (target.role === "owner") {
      return { success: false, error: "Cannot delete system owner." };
    }

    db.run("DELETE FROM users WHERE id = ?", [userId]);
    return { success: true };
  },

  deleteAllResellers(
    targetScope: "resellers" | "non_owner" = "resellers",
    currentUser: UserPublicProfile
  ): { success: boolean; affected: number; message: string } {
    if (currentUser.role === "reseller") {
      return { success: false, affected: 0, message: "Unauthorized" };
    }

    let whereSql = "WHERE role = 'reseller'";
    if (targetScope === "non_owner" && currentUser.role === "owner") {
      whereSql = "WHERE role != 'owner'";
    }

    const countRow = db.query(`SELECT COUNT(*) as c FROM users ${whereSql}`).get() as { c: number };
    const affected = countRow?.c || 0;

    db.run(`DELETE FROM users ${whereSql}`);

    return {
      success: true,
      affected,
      message: `Deleted ${affected} ${targetScope === "non_owner" ? "subordinate (admin & reseller)" : "reseller"} account(s).`,
    };
  },

  bulkUsersAction(
    action: "delete" | "suspend" | "activate" | "delete_all_resellers" | "delete_all_subordinates",
    userIds: number[],
    currentUser: UserPublicProfile
  ): { success: boolean; affected: number; message: string } {
    if (action === "delete_all_resellers") {
      return this.deleteAllResellers("resellers", currentUser);
    }
    if (action === "delete_all_subordinates") {
      return this.deleteAllResellers("non_owner", currentUser);
    }

    let affected = 0;
    for (const id of userIds || []) {
      if (id === currentUser.id) continue;
      if (action === "delete") {
        const res = this.deleteUser(id, currentUser);
        if (res.success) affected++;
      } else if (action === "suspend") {
        if (this.updateStatus(id, "suspended", currentUser)) affected++;
      } else if (action === "activate") {
        if (this.updateStatus(id, "active", currentUser)) affected++;
      }
    }

    return {
      success: true,
      affected,
      message: `Executed ${action} on ${affected} account(s).`,
    };
  },

  resetPassword(
    userId: number,
    newPasswordPlain: string,
    currentUser: UserPublicProfile
  ): { success: boolean; error?: string } {
    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    const target = this.getUserById(userId);
    if (!target) return { success: false, error: "Target user not found." };

    if (currentUser.role === "reseller") {
      return { success: false, error: "Permission denied: Resellers cannot reset passwords." };
    }

    if (currentUser.role === "admin") {
      if (target.role !== "reseller") {
        return { success: false, error: "Permission denied: Admins can only manage passwords for Resellers." };
      }
    }

    if (target.role === "owner" && currentUser.role !== "owner") {
      return { success: false, error: "Permission denied: Cannot modify Master Owner credentials." };
    }

    const newHash = Bun.password.hashSync(newPasswordPlain);
    db.run("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);
    db.run("DELETE FROM sessions WHERE user_id = ?", [userId]);

    return { success: true };
  },
};
