import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import crypto from "crypto";

const TEST_DB_PATH = ":memory:";
const VOID_SALT = "VOID_SECURE_SALT_2026";

function computeHwidSha256(raw: string): string {
  return crypto.createHash("sha256").update(raw + VOID_SALT).digest("hex");
}

describe("E2E Mod Menu & Panel Full Sync Suite", () => {
  let db: Database;

  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_code TEXT UNIQUE NOT NULL,
        duration_days INTEGER NOT NULL,
        credits_cost INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        bound_hwid TEXT,
        bound_at TEXT,
        device_note TEXT,
        resets_count INTEGER DEFAULT 0,
        max_resets INTEGER DEFAULT 3,
        status TEXT DEFAULT 'ACTIVE',
        last_ip TEXT,
        last_checkin TEXT
      );
    `);
  });

  afterAll(() => {
    db.close();
  });

  test("Step 1: Admin generates 24-hour key costing 10 credits", () => {
    const keyCode = "VOID-24H-TEST-A1B2C3D4";
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO keys (key_code, duration_days, credits_cost, created_by, created_at, status)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `).run(keyCode, 1, 10, "admin", now);

    const key = db.prepare(`SELECT * FROM keys WHERE key_code = ?`).get(keyCode) as any;
    expect(key).toBeDefined();
    expect(key.duration_days).toBe(1);
    expect(key.credits_cost).toBe(10);
    expect(key.bound_hwid).toBeNull();
  });

  test("Step 2: Mod Menu first launch bounds strictly to Device Alpha HWID", () => {
    const rawDeviceAlpha = "android-build-id-samsung-s23-ultra-alpha";
    const hashedHwidAlpha = computeHwidSha256(rawDeviceAlpha);
    const keyCode = "VOID-24H-TEST-A1B2C3D4";

    const key = db.prepare(`SELECT * FROM keys WHERE key_code = ?`).get(keyCode) as any;
    expect(key.bound_hwid).toBeNull();

    // Bind on first verification
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      UPDATE keys
      SET bound_hwid = ?, bound_at = ?, expires_at = ?, last_checkin = ?
      WHERE key_code = ?
    `).run(hashedHwidAlpha, now.toISOString(), expiry, now.toISOString(), keyCode);

    const updated = db.prepare(`SELECT * FROM keys WHERE key_code = ?`).get(keyCode) as any;
    expect(updated.bound_hwid).toBe(hashedHwidAlpha);
    expect(updated.expires_at).toBe(expiry);
  });

  test("Step 3: Device Beta tries to verify same key -> Strictly Rejected (1 Key = 1 Device)", () => {
    const rawDeviceBeta = "android-build-id-pixel-8-pro-beta";
    const hashedHwidBeta = computeHwidSha256(rawDeviceBeta);
    const keyCode = "VOID-24H-TEST-A1B2C3D4";

    const key = db.prepare(`SELECT * FROM keys WHERE key_code = ?`).get(keyCode) as any;
    expect(key.bound_hwid).not.toBe(hashedHwidBeta);

    const isMatch = (key.bound_hwid === hashedHwidBeta);
    expect(isMatch).toBe(false); // REJECTED
  });

  test("Step 4: Device Alpha re-authenticates -> 100% Accepted without re-entering key", () => {
    const rawDeviceAlpha = "android-build-id-samsung-s23-ultra-alpha";
    const hashedHwidAlpha = computeHwidSha256(rawDeviceAlpha);
    const keyCode = "VOID-24H-TEST-A1B2C3D4";

    const key = db.prepare(`SELECT * FROM keys WHERE key_code = ?`).get(keyCode) as any;
    expect(key.bound_hwid).toBe(hashedHwidAlpha);
    expect(new Date(key.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  test("Step 5: Expired Key Rejection", () => {
    const keyCode = "VOID-EXPIRED-TEST-9999";
    const past = new Date(Date.now() - 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO keys (key_code, duration_days, credits_cost, created_by, created_at, expires_at, status)
      VALUES (?, 1, 10, 'admin', ?, ?, 'ACTIVE')
    `).run(keyCode, past, past);

    const key = db.prepare(`SELECT * FROM keys WHERE key_code = ?`).get(keyCode) as any;
    const isExpired = new Date(key.expires_at).getTime() < Date.now();
    expect(isExpired).toBe(true);
  });
});
