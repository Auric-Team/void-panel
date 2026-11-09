import { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync } from "fs";
import { CONFIG } from "../config/index.js";

const dataDir = join(import.meta.dir, "../../data");
try {
  mkdirSync(dataDir, { recursive: true });
} catch {}

export const uploadsReceiptsDir = join(import.meta.dir, "../../../uploads/receipts");
try {
  mkdirSync(uploadsReceiptsDir, { recursive: true });
} catch {}

export const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.argv.some((a) => a.includes(".test.") || a === "test");

const dbPath =
  process.env.DB_PATH ||
  join(dataDir, isTestEnv ? "test_panel.db" : "panel.db");
export const db = new Database(dbPath);

// Flush any existing WAL into the main .db file and use DELETE journal mode
// so that Backend/data/panel.db is always 100% self-contained for git add/commit/push.
try {
  db.run("PRAGMA wal_checkpoint(TRUNCATE);");
} catch {}
db.run("PRAGMA journal_mode = DELETE;");
db.run("PRAGMA synchronous = FULL;");
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
  try {
    db.run("ALTER TABLE keys ADD COLUMN customer_name TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE keys ADD COLUMN payment_amount REAL NOT NULL DEFAULT 0;");
  } catch {}
  try {
    db.run("ALTER TABLE keys ADD COLUMN payment_currency TEXT NOT NULL DEFAULT 'USD';");
  } catch {}
  try {
    db.run("ALTER TABLE keys ADD COLUMN payment_method TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE keys ADD COLUMN payment_ref TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE keys ADD COLUMN proof_image TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE keys ADD COLUMN receipt_id INTEGER;");
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

  // 11. Payment Receipts Table
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      username TEXT NOT NULL,
      customer_name TEXT DEFAULT '',
      amount_paid REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      credits_granted INTEGER NOT NULL DEFAULT 0,
      keys_summary TEXT DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT 'UPI / Crypto',
      transaction_ref TEXT DEFAULT '',
      proof_image TEXT DEFAULT '',
      key_str TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'paid',
      note TEXT DEFAULT '',
      issued_by_id INTEGER,
      issued_by_name TEXT NOT NULL DEFAULT 'owner',
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  try {
    db.run("ALTER TABLE payment_receipts ADD COLUMN proof_image TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE payment_receipts ADD COLUMN key_str TEXT DEFAULT '';");
  } catch {}

  // 12. Owner Key Creation Notifications & Dispatch Feed Table
  db.run(`
    CREATE TABLE IF NOT EXISTS owner_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL DEFAULT 'key_created', -- 'key_created' | 'batch_created'
      creator_id INTEGER,
      creator_username TEXT NOT NULL,
      creator_role TEXT NOT NULL DEFAULT 'reseller',
      quantity INTEGER NOT NULL DEFAULT 1,
      duration_days INTEGER NOT NULL DEFAULT 30,
      credit_cost INTEGER NOT NULL DEFAULT 0,
      balance_after INTEGER NOT NULL DEFAULT 0,
      max_resets INTEGER NOT NULL DEFAULT 3,
      keys_list TEXT NOT NULL DEFAULT '[]', -- JSON array of key strings
      note TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      payment_amount REAL NOT NULL DEFAULT 0,
      payment_currency TEXT NOT NULL DEFAULT 'USD',
      payment_method TEXT DEFAULT '',
      payment_ref TEXT DEFAULT '',
      proof_image TEXT DEFAULT '',
      receipt_no TEXT DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  try {
    db.run("ALTER TABLE owner_notifications ADD COLUMN customer_name TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE owner_notifications ADD COLUMN payment_amount REAL NOT NULL DEFAULT 0;");
  } catch {}
  try {
    db.run("ALTER TABLE owner_notifications ADD COLUMN payment_currency TEXT NOT NULL DEFAULT 'USD';");
  } catch {}
  try {
    db.run("ALTER TABLE owner_notifications ADD COLUMN payment_method TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE owner_notifications ADD COLUMN payment_ref TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE owner_notifications ADD COLUMN proof_image TEXT DEFAULT '';");
  } catch {}
  try {
    db.run("ALTER TABLE owner_notifications ADD COLUMN receipt_no TEXT DEFAULT '';");
  } catch {}

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

  // 1. Owner Account (Master Top Level) — match by username or owner role only if no owner exists
  const targetOwnerUsername = CONFIG.OWNER_USERNAME;
  const targetOwnerPass = CONFIG.OWNER_PASSWORD;

  const existingOwner =
    (db.query("SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER(?)").get(targetOwnerUsername) as any) ||
    (db.query("SELECT id, username, password_hash FROM users WHERE role = 'owner' ORDER BY id ASC LIMIT 1").get() as any);

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
      db.run("UPDATE users SET username = ?, password_hash = ?, role = 'owner', status = 'active' WHERE id = ?", [
        targetOwnerUsername,
        updatedHash,
        existingOwner.id,
      ]);
      console.log(`[DB SYNC] Updated Owner credentials from .env: @${targetOwnerUsername}`);
    }
  }

  // 2. Default Admin Account — ONLY match by exact targetAdminUsername so custom admins are NEVER overwritten or deleted!
  const targetAdminUsername = CONFIG.ADMIN_USERNAME;
  const targetAdminPass = CONFIG.ADMIN_PASSWORD;

  const existingAdmin = db
    .query("SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER(?)")
    .get(targetAdminUsername) as any;

  let adminId = existingAdmin?.id;
  if (!existingAdmin) {
    const adminHash = Bun.password.hashSync(targetAdminPass);
    const res = db.run(
      "INSERT INTO users (username, password_hash, role, credits, status, created_by, created_at) VALUES (?, ?, 'admin', 5000, 'active', ?, ?)",
      [targetAdminUsername, adminHash, ownerId || 1, now]
    );
    adminId = Number(res.lastInsertRowid);
    console.log(`[DB SEED] Created default Admin account: @${targetAdminUsername}`);
  } else if (isTestEnv) {
    const passMatches = Bun.password.verifySync(targetAdminPass, existingAdmin.password_hash);
    if (!passMatches) {
      const updatedHash = Bun.password.hashSync(targetAdminPass);
      db.run("UPDATE users SET password_hash = ?, role = 'admin', status = 'active' WHERE id = ?", [
        updatedHash,
        existingAdmin.id,
      ]);
    }
  }

  // 3. Default Reseller Account — ONLY match by exact targetResellerUsername so custom resellers are NEVER overwritten or deleted!
  const targetResellerUsername = CONFIG.RESELLER_USERNAME;
  const targetResellerPass = CONFIG.RESELLER_PASSWORD;

  const existingReseller = db
    .query("SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER(?)")
    .get(targetResellerUsername) as any;

  let resellerId = existingReseller?.id;
  if (!existingReseller) {
    const resellerHash = Bun.password.hashSync(targetResellerPass);
    const res = db.run(
      "INSERT INTO users (username, password_hash, role, credits, status, created_by, created_at) VALUES (?, ?, 'reseller', 100, 'active', ?, ?)",
      [targetResellerUsername, resellerHash, adminId || ownerId || 1, now]
    );
    resellerId = Number(res.lastInsertRowid);
    console.log(`[DB SEED] Created default Reseller account: @${targetResellerUsername}`);
  } else if (isTestEnv) {
    const passMatches = Bun.password.verifySync(targetResellerPass, existingReseller.password_hash);
    if (!passMatches) {
      const updatedHash = Bun.password.hashSync(targetResellerPass);
      db.run("UPDATE users SET password_hash = ?, role = 'reseller', status = 'active' WHERE id = ?", [
        updatedHash,
        existingReseller.id,
      ]);
    }
  }

  // Seed sample initial keys if none exist
  const keyCount = (db.query("SELECT COUNT(*) as count FROM keys").get() as { count: number }).count;
  if (keyCount === 0) {
    db.run(
      "INSERT INTO keys (key_str, status, duration_days, credit_cost, created_at, note, created_by_id, created_by_name) VALUES (?, 'active', 0, 3000, ?, 'Master Lifetime Key', ?, ?)",
      ["VOID-LIFETIME-PREMIUM-2026", now, ownerId || 1, targetOwnerUsername]
    );
    db.run(
      "INSERT INTO keys (key_str, status, duration_days, credit_cost, created_at, note, created_by_id, created_by_name) VALUES (?, 'active', 30, 180, ?, 'Standard 30 Day Key', ?, ?)",
      ["VOID-30D-TEST-ABC123XYZ", now, adminId || 2, targetAdminUsername]
    );
    db.run(
      "INSERT INTO keys (key_str, status, duration_days, credit_cost, created_at, note, created_by_id, created_by_name) VALUES (?, 'active', 1, 10, ?, '24 Hour Trial Key', ?, ?)",
      ["VOID-24H-TRIAL-888999", now, resellerId || 3, targetResellerUsername]
    );
  }

  // Backfill created_by_id on keys if null
  db.run(`
    UPDATE keys
    SET created_by_id = (SELECT id FROM users WHERE LOWER(users.username) = LOWER(keys.created_by_name) OR LOWER(users.role) = LOWER(keys.created_by_name) LIMIT 1)
    WHERE created_by_id IS NULL;
  `);

  // Clean up any leftover automated test accounts/rows from production panel.db
  if (!isTestEnv) {
    db.run(
      "DELETE FROM users WHERE username LIKE 'test_sub_reseller_%' OR username LIKE 'poor_res_%' OR username LIKE 'temp_res_%' OR username LIKE 'fake_admin_%'"
    );
    db.run("DELETE FROM payment_receipts WHERE customer_name IN ('@vip_buyer', 'Test Buyer')");
    db.run("DELETE FROM owner_notifications WHERE customer_name = '@vip_buyer'");
    db.run("DELETE FROM keys WHERE note = 'VIP Buyer Key'");
  }

  // Seed sample initial payment receipt if none exists
  const receiptCount = (db.query("SELECT COUNT(*) as count FROM payment_receipts").get() as { count: number }).count;
  if (receiptCount === 0) {
    db.run(
      `INSERT INTO payment_receipts (
        receipt_no, user_id, username, customer_name, amount_paid, currency, credits_granted, keys_summary, payment_method, transaction_ref, status, note, issued_by_id, issued_by_name, created_at
      ) VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, 'USDT (TRC20)', 'TXN-984120A7F', 'paid', 'Initial Reseller Credit Pack Settlement', ?, ?, ?)`,
      [
        "VOID-RCP-2026-0001",
        resellerId || 3,
        targetResellerUsername,
        "Reseller Partner Tier 1",
        25.0,
        250,
        "250 Reseller Credits Pack (25x 24H Keys Equivalent)",
        ownerId || 1,
        targetOwnerUsername,
        now,
      ]
    );
  }
}
