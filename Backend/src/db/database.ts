import { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync } from "fs";
import { CONFIG } from "../config/index.js";

const dataDir = join(import.meta.dir, "../../data");
try {
  mkdirSync(dataDir, { recursive: true });
} catch {}

const dbPath = process.env.DB_PATH || join(dataDir, "panel.db");
export const db = new Database(dbPath);

// Enable WAL mode & foreign keys for high concurrency and relational consistency
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA synchronous = NORMAL;");
db.run("PRAGMA foreign_keys = ON;");

export function initDatabase() {
  // 1. Users Table (Owner > Admin > Reseller hierarchy)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'reseller', -- 'owner', 'admin', 'reseller'
      credits INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended'
      created_by INTEGER,
      created_at INTEGER NOT NULL,
      last_login INTEGER,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 2. Keys Table
  db.run(`
    CREATE TABLE IF NOT EXISTS keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_str TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'expired', 'revoked'
      duration_days INTEGER NOT NULL DEFAULT 30, -- 0 for lifetime
      credit_cost INTEGER NOT NULL DEFAULT 0,
      hwid TEXT,
      bound_at INTEGER,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      note TEXT DEFAULT '',
      max_resets INTEGER NOT NULL DEFAULT 3,
      reset_count INTEGER NOT NULL DEFAULT 0,
      created_by_id INTEGER,
      created_by_name TEXT DEFAULT 'system',
      FOREIGN KEY(created_by_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Migrate legacy keys table if columns are missing
  try {
    db.run("ALTER TABLE keys ADD COLUMN credit_cost INTEGER NOT NULL DEFAULT 0;");
  } catch {}
  try {
    db.run("ALTER TABLE keys ADD COLUMN created_by_id INTEGER;");
  } catch {}
  try {
    db.run("ALTER TABLE keys ADD COLUMN created_by_name TEXT DEFAULT 'system';");
  } catch {}

  // 3. Credit Transactions Table (Full transparent audit trail)
  db.run(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'grant', 'deduct', 'key_create', 'key_refund', 'admin_adjustment'
      description TEXT NOT NULL,
      performed_by_id INTEGER,
      performed_by_name TEXT DEFAULT 'system',
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(performed_by_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 4. Client Verification Telemetry Logs Table
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_str TEXT NOT NULL,
      hwid TEXT,
      ip TEXT,
      status TEXT NOT NULL, -- 'authenticated', 'invalid', 'expired', 'mismatch', 'error'
      message TEXT,
      timestamp INTEGER NOT NULL
    );
  `);

  // 5. Persistent Session Tokens Table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 6. System Settings Table
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 7. Security Blacklist / Ban Table (HWID & IP bans)
  db.run(`
    CREATE TABLE IF NOT EXISTS bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'hwid' or 'ip'
      value TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      banned_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 8. Live Announcements & In-Game Broadcasts Table
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
  `);

  // 9. Credit Gift Vouchers Table
  db.run(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      credits INTEGER NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 10. Voucher Redemptions Audit Table
  db.run(`
    CREATE TABLE IF NOT EXISTS voucher_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      credits_added INTEGER NOT NULL,
      redeemed_at INTEGER NOT NULL,
      FOREIGN KEY(voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Default App Settings
  db.run(`
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('current_version', '2.6.0'),
      ('min_version', '2.0.0'),
      ('download_url', 'https://voidmenu.vip/download'),
      ('maintenance_mode', 'false'),
      ('maintenance_message', 'Void servers are undergoing scheduled database optimization. Back soon!'),
      ('discord_webhook_url', '')
    ;
  `);

  // Seed sample initial announcement if none exists
  const announcementCount = (db.query("SELECT COUNT(*) as c FROM announcements").get() as any).c;
  if (announcementCount === 0) {
    db.run(
      `INSERT INTO announcements (title, content, severity, is_active, created_at)
       VALUES (?, ?, 'info', 1, ?)`,
      ["Void v2.6 Online", "Native ARM64-v8a zero-latency socket gateway is live. Happy gaming!", Date.now()]
    );
  }

  // Seed sample voucher if none exists
  const voucherCount = (db.query("SELECT COUNT(*) as c FROM vouchers").get() as any).c;
  if (voucherCount === 0) {
    db.run(
      `INSERT INTO vouchers (code, credits, max_uses, used_count, created_by, created_at)
       VALUES (?, 100, 10, 0, 'owner', ?)`,
      ["VOID-WELCOME-100CR", Date.now()]
    );
  }

  // Seed & synchronize default hierarchy accounts from CONFIG / .env
  const now = Date.now();

  // 1. Owner Account (Master Top Level)
  const targetOwnerUsername = CONFIG.OWNER_USERNAME;
  const targetOwnerPass = CONFIG.OWNER_PASSWORD;

  const existingOwner = (db.query("SELECT id, username, password_hash FROM users WHERE role = 'owner'").get() as any) ||
                        (db.query("SELECT id, username, password_hash FROM users WHERE username = ?").get(targetOwnerUsername) as any);

  let ownerId = existingOwner?.id;
  if (!existingOwner) {
    const ownerHash = Bun.password.hashSync(targetOwnerPass);
    const res = db.run(
      "INSERT INTO users (username, password_hash, role, credits, status, created_by, created_at) VALUES (?, ?, 'owner', 999999, 'active', NULL, ?)",
      [targetOwnerUsername, ownerHash, now]
    );
    ownerId = Number(res.lastInsertRowid);
    console.log(`[DB SEED] Created Owner account from .env: @${targetOwnerUsername}`);
  } else {
    const passMatches = Bun.password.verifySync(targetOwnerPass, existingOwner.password_hash);
    if (!passMatches || existingOwner.username !== targetOwnerUsername) {
      const updatedHash = Bun.password.hashSync(targetOwnerPass);
      db.run("UPDATE users SET username = ?, password_hash = ? WHERE id = ?", [targetOwnerUsername, updatedHash, existingOwner.id]);
      console.log(`[DB SYNC] Updated Owner credentials from .env: @${targetOwnerUsername}`);
    }
  }

  // 2. Admin Account (2nd Top Level)
  const targetAdminUsername = CONFIG.ADMIN_USERNAME;
  const targetAdminPass = CONFIG.ADMIN_PASSWORD;

  const existingAdmin = (db.query("SELECT id, username, password_hash FROM users WHERE role = 'admin'").get() as any) ||
                        (db.query("SELECT id, username, password_hash FROM users WHERE username = ?").get(targetAdminUsername) as any);

  let adminId = existingAdmin?.id;
  if (!existingAdmin) {
    const adminHash = Bun.password.hashSync(targetAdminPass);
    const res = db.run(
      "INSERT INTO users (username, password_hash, role, credits, status, created_by, created_at) VALUES (?, ?, 'admin', 5000, 'active', ?, ?)",
      [targetAdminUsername, adminHash, ownerId || 1, now]
    );
    adminId = Number(res.lastInsertRowid);
    console.log(`[DB SEED] Created Admin account from .env: @${targetAdminUsername}`);
  } else {
    const passMatches = Bun.password.verifySync(targetAdminPass, existingAdmin.password_hash);
    if (!passMatches || existingAdmin.username !== targetAdminUsername) {
      const updatedHash = Bun.password.hashSync(targetAdminPass);
      db.run("UPDATE users SET username = ?, password_hash = ?, role = 'admin' WHERE id = ?", [targetAdminUsername, updatedHash, existingAdmin.id]);
      console.log(`[DB SYNC] Updated Admin credentials from .env: @${targetAdminUsername}`);
    }
  }

  // 3. Reseller Account (3rd Level with Credit Balance)
  const targetResellerUsername = CONFIG.RESELLER_USERNAME;
  const targetResellerPass = CONFIG.RESELLER_PASSWORD;

  const existingReseller = (db.query("SELECT id, username, password_hash FROM users WHERE role = 'reseller'").get() as any) ||
                           (db.query("SELECT id, username, password_hash FROM users WHERE username = ?").get(targetResellerUsername) as any);

  if (!existingReseller) {
    const resellerHash = Bun.password.hashSync(targetResellerPass);
    db.run(
      "INSERT INTO users (username, password_hash, role, credits, status, created_by, created_at) VALUES (?, ?, 'reseller', 100, 'active', ?, ?)",
      [targetResellerUsername, resellerHash, adminId || 2, now]
    );
    console.log(`[DB SEED] Created Reseller account from .env: @${targetResellerUsername}`);
  } else {
    const passMatches = Bun.password.verifySync(targetResellerPass, existingReseller.password_hash);
    if (!passMatches || existingReseller.username !== targetResellerUsername) {
      const updatedHash = Bun.password.hashSync(targetResellerPass);
      db.run("UPDATE users SET username = ?, password_hash = ?, role = 'reseller' WHERE id = ?", [targetResellerUsername, updatedHash, existingReseller.id]);
      console.log(`[DB SYNC] Updated Reseller credentials from .env: @${targetResellerUsername}`);
    }
  }

  // Seed sample initial keys if none exist
  const keyCount = (db.query("SELECT COUNT(*) as count FROM keys").get() as { count: number }).count;
  if (keyCount === 0) {
    db.run(
      "INSERT INTO keys (key_str, status, duration_days, credit_cost, created_at, note, created_by_name) VALUES (?, 'active', 0, 3000, ?, 'Master Lifetime Key', 'owner')",
      ["VOID-LIFETIME-PREMIUM-2026", now]
    );
    db.run(
      "INSERT INTO keys (key_str, status, duration_days, credit_cost, created_at, note, created_by_name) VALUES (?, 'active', 30, 180, ?, 'Standard 30 Day Key', 'admin')",
      ["VOID-30D-TEST-ABC123XYZ", now]
    );
    db.run(
      "INSERT INTO keys (key_str, status, duration_days, credit_cost, created_at, note, created_by_name) VALUES (?, 'active', 1, 10, ?, '24 Hour Trial Key', 'reseller')",
      ["VOID-24H-TRIAL-888999", now]
    );
  }
}
