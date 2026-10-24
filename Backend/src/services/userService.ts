import { db } from "../db/database.js";
import { CreditService } from "./creditService.js";
import type { UserRecord, UserPublicProfile, UserRole } from "../types/index.js";

export const UserService = {
  getUsers(currentUser: UserPublicProfile): UserPublicProfile[] {
    let sql = `
      SELECT u.id, u.username, u.role, u.credits, u.status, u.created_by, u.created_at, u.last_login,
             c.username as creator_name
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
    `;
    const params: any[] = [];

    if (currentUser.role === "reseller") {
      sql += " WHERE u.id = ?";
      params.push(currentUser.id);
    } else if (currentUser.role === "admin") {
      // Admins see all resellers
      sql += " WHERE u.role = 'reseller'";
    } else {
      // Owner sees everyone except themselves if desired, or all
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
    }));
  },

  getUserById(id: number): UserPublicProfile | null {
    const r = db.query(`
      SELECT u.id, u.username, u.role, u.credits, u.status, u.created_by, u.created_at, u.last_login,
             c.username as creator_name
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

    // RBAC: Resellers cannot change status
    if (currentUser.role === "reseller") return false;
    // Admins can only suspend resellers
    if (currentUser.role === "admin" && target.role !== "reseller") return false;
    // Cannot suspend owner
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

    // RBAC Permissions:
    // Resellers cannot reset any passwords
    if (currentUser.role === "reseller") {
      return { success: false, error: "Permission denied: Resellers cannot reset passwords." };
    }

    // Admins can only reset passwords for Resellers
    if (currentUser.role === "admin") {
      if (target.role !== "reseller") {
        return { success: false, error: "Permission denied: Admins can only manage passwords for Resellers." };
      }
    }

    // Protect Owner account from modification by subordinates
    if (target.role === "owner" && currentUser.role !== "owner") {
      return { success: false, error: "Permission denied: Cannot modify Master Owner credentials." };
    }

    const newHash = Bun.password.hashSync(newPasswordPlain);
    db.run("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);

    // Terminate any active sessions for this user to force re-authentication
    db.run("DELETE FROM sessions WHERE user_id = ?", [userId]);

    return { success: true };
  },
};
