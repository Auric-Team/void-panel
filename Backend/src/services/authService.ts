import { db } from "../db/database.js";
import { generateSessionToken } from "../utils/crypto.js";
import { CONFIG } from "../config/index.js";
import type { UserRecord, UserPublicProfile, SessionData } from "../types/index.js";

export const AuthService = {
  async login(username: string, password: string): Promise<{ token: string; user: UserPublicProfile } | null> {
    const user = db.query("SELECT * FROM users WHERE username = ?").get(username) as UserRecord | undefined;
    if (!user) return null;

    if (user.status === "suspended") {
      throw new Error("Your account has been suspended by administration.");
    }

    const validPassword = Bun.password.verifySync(password, user.password_hash);
    if (!validPassword) return null;

    // Record last login
    const now = Date.now();
    db.run("UPDATE users SET last_login = ? WHERE id = ?", [now, user.id]);

    // Create session token
    const token = generateSessionToken(user.role);
    const expiresAt = now + CONFIG.SESSION_EXPIRY_MS;

    db.run(
      "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
      [token, user.id, now, expiresAt]
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        credits: user.credits,
        status: user.status,
        created_by: user.created_by,
        created_at: user.created_at,
      },
    };
  },

  logout(token: string): boolean {
    db.run("DELETE FROM sessions WHERE token = ?", [token]);
    return true;
  },

  getUserByToken(token: string): UserPublicProfile | null {
    if (!token) return null;
    const now = Date.now();

    const row = db.query(`
      SELECT s.token, u.id, u.username, u.role, u.credits, u.status, u.created_by, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as any;

    if (!row) return null;
    if (row.status === "suspended") return null;

    return {
      id: row.id,
      username: row.username,
      role: row.role,
      credits: row.credits,
      status: row.status,
      created_by: row.created_by,
      created_at: row.created_at,
    };
  },

  cleanExpiredSessions() {
    db.run("DELETE FROM sessions WHERE expires_at < ?", [Date.now()]);
  }
};
