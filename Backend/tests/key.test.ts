import { describe, expect, it, beforeAll } from "bun:test";
import { initDatabase, db } from "../src/db/database.js";
import { KeyService } from "../src/services/keyService.js";
import { computeSha256 } from "../src/utils/crypto.js";
import { StatsService } from "../src/services/statsService.js";

beforeAll(() => {
  initDatabase();
});

describe("Void Key System Backend & ModMenu Verification Sync", () => {
  it("computes SHA256 correctly matching C++ implementation", () => {
    const hash = computeSha256("test_string");
    expect(hash).toBe("4b641e9a923d1ea57e18fe41dcb543e2c4005c41ff210864a710b0fbb2654c11");
  });

  it("fails verification on empty or placeholder key", () => {
    const res1 = KeyService.verify("", "HWID-TEST-001");
    expect(res1.status).toBe("invalid");

    const res2 = KeyService.verify("PASTE_YOUR_KEY_HERE", "HWID-TEST-001");
    expect(res2.status).toBe("invalid");
  });

  it("fails verification on non-existent key", () => {
    const res = KeyService.verify("VOID-NONEXISTENT-KEY", "HWID-TEST-001");
    expect(res.status).toBe("invalid");
  });

  it("successfully creates and binds a new key on first use", () => {
    const createRes = KeyService.createKey(30, "Automated Test Key");
    expect(createRes.success).toBe(true);
    const newKey = createRes.key!;
    expect(newKey.key_str).toBeDefined();
    expect(newKey.hwid).toBeNull();

    const hwidDevice = "HWID-DEVICE-TEST-A1B2";
    const ts = Date.now();
    const payload = newKey.key_str + hwidDevice + String(ts) + "VOID_SECURE_SALT_2026";
    const hash = computeSha256(payload);

    // Verify first time -> binds HWID
    const res = KeyService.verify(newKey.key_str, hwidDevice, ts, hash);
    expect(res.status).toBe("authenticated");
    expect(res.hwid).toBe(hwidDevice);

    // Re-verify from same HWID -> authenticated
    const reRes = KeyService.verify(newKey.key_str, hwidDevice, ts, hash);
    expect(reRes.status).toBe("authenticated");

    // Verify from different HWID with proper hash computed by that device -> returns mismatch
    const attackerHwid = "HWID-ATTACKER-DEVICE";
    const attackerPayload = newKey.key_str + attackerHwid + String(ts) + "VOID_SECURE_SALT_2026";
    const attackerHash = computeSha256(attackerPayload);
    const mismatchRes = KeyService.verify(newKey.key_str, attackerHwid, ts, attackerHash);
    expect(mismatchRes.status).toBe("mismatch");
  });

  it("detects expired keys accurately", () => {
    const createRes = KeyService.createKey(1, "Expiring Key");
    expect(createRes.success).toBe(true);
    const expKey = createRes.key!;
    const pastTime = Date.now() - 100000;
    db.run("UPDATE keys SET hwid = 'HWID-EXP-DEVICE', expires_at = ?, status = 'expired' WHERE id = ?", [pastTime, expKey.id]);

    const res = KeyService.verify(expKey.key_str, "HWID-EXP-DEVICE");
    expect(res.status).toBe("expired");
  });

  it("allows HWID reset within max resets limit", () => {
    const createRes = KeyService.createKey(30, "Reset Test Key");
    const resetKey = createRes.key!;
    KeyService.verify(resetKey.key_str, "HWID-FIRST-DEVICE");

    // Reset HWID
    const resetRes = KeyService.resetHwid(resetKey.id);
    expect(resetRes.success).toBe(true);

    // Now bind to second device -> must succeed
    const bindSecond = KeyService.verify(resetKey.key_str, "HWID-SECOND-DEVICE");
    expect(bindSecond.status).toBe("authenticated");
    expect(bindSecond.hwid).toBe("HWID-SECOND-DEVICE");
  });

  it("handles batch key creation seamlessly", () => {
    const batchRes = KeyService.createBatchKeys(5, 7, "Batch Test Promo", "VOID");
    expect(batchRes.success).toBe(true);
    expect(batchRes.keys?.length).toBe(5);
    for (const k of batchRes.keys!) {
      expect(k.key_str.startsWith("VOID-")).toBe(true);
      expect(k.duration_days).toBe(7);
    }
  });

  it("reports accurate stats and logs telemetry", () => {
    const overview = StatsService.getOverview();
    expect(overview.totalKeys).toBeGreaterThan(0);
    expect(overview.totalVerifications).toBeGreaterThan(0);
  });
});
