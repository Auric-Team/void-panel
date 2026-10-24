import { describe, it, expect, beforeAll } from "bun:test";
import { initDatabase, db } from "../src/db/database.js";
import { KeyService } from "../src/services/keyService.js";
import { UserService } from "../src/services/userService.js";
import { computeSha256 } from "../src/utils/crypto.js";
import { CONFIG } from "../src/config/index.js";

describe("Strict 1-Key-to-1-Device Hardware Binding & Telemetry Verification", () => {
  let masterOwner: any;
  let testKeyStr: string;
  let testKeyId: number;

  const HWID_DEVICE_ALPHA = "ANDROID_SECURE_HWID_ALPHA_7701";
  const HWID_DEVICE_BETA = "ANDROID_SECURE_HWID_BETA_8802";
  const HWID_DEVICE_GAMMA = "ANDROID_SECURE_HWID_GAMMA_9903";

  beforeAll(() => {
    initDatabase();
    masterOwner = UserService.getUserById(1)!;

    // Create a dedicated 24-hour test key
    const res = KeyService.createKey(1, "Strict 1-Device Binding Test Key", undefined, 3, masterOwner);
    expect(res.success).toBe(true);
    testKeyStr = res.key.key_str;
    testKeyId = res.key.id;
  });

  it("verifies newly generated key is completely unbound and fresh", () => {
    const key = KeyService.getKeyById(testKeyId);
    expect(key).not.toBeNull();
    expect(key?.hwid).toBeNull();
    expect(key?.bound_at).toBeNull();
    expect(key?.status).toBe("active");
    expect(key?.duration_days).toBe(1);
    expect(key?.reset_count).toBe(0);
    expect(key?.max_resets).toBe(3);
  });

  it("locks and binds strictly to the first device that authenticates (Device Alpha)", () => {
    const ts = Date.now();
    const hash = computeSha256(testKeyStr + HWID_DEVICE_ALPHA + String(ts) + CONFIG.SECURE_SALT);

    const result = KeyService.verify(testKeyStr, HWID_DEVICE_ALPHA, ts, hash, "192.168.1.101");

    expect(result.status).toBe("authenticated");
    expect(result.message).toContain("Bound Successfully");
    expect(result.hwid).toBe(HWID_DEVICE_ALPHA);
    expect(result.expiresAt).toBeDefined();

    // Verify database state
    const boundKey = KeyService.getKeyById(testKeyId);
    expect(boundKey?.hwid).toBe(HWID_DEVICE_ALPHA);
    expect(boundKey?.bound_at).toBeGreaterThan(0);
    expect(boundKey?.expires_at).toBeGreaterThan(Date.now());
  });

  it("allows Device Alpha to re-authenticate seamlessly anytime", () => {
    const ts = Date.now();
    const hash = computeSha256(testKeyStr + HWID_DEVICE_ALPHA + String(ts) + CONFIG.SECURE_SALT);

    const result = KeyService.verify(testKeyStr, HWID_DEVICE_ALPHA, ts, hash, "192.168.1.101");
    expect(result.status).toBe("authenticated");
    expect(result.hwid).toBe(HWID_DEVICE_ALPHA);
  });

  it("INSTANTLY REJECTS Device Beta from using the same key (1 Key = 1 Device)", () => {
    const ts = Date.now();
    const hash = computeSha256(testKeyStr + HWID_DEVICE_BETA + String(ts) + CONFIG.SECURE_SALT);

    const result = KeyService.verify(testKeyStr, HWID_DEVICE_BETA, ts, hash, "10.0.0.5");

    expect(result.status).toBe("mismatch");
    expect(result.message).toBe("Key is bound to another device!");
  });

  it("INSTANTLY REJECTS Device Gamma from using the same key", () => {
    const ts = Date.now();
    const hash = computeSha256(testKeyStr + HWID_DEVICE_GAMMA + String(ts) + CONFIG.SECURE_SALT);

    const result = KeyService.verify(testKeyStr, HWID_DEVICE_GAMMA, ts, hash, "172.16.0.8");

    expect(result.status).toBe("mismatch");
    expect(result.message).toBe("Key is bound to another device!");
  });

  it("blocks tampered requests attempting to spoof signature with mismatched hardware payload", () => {
    const ts = Date.now();
    // Tampered: Hash calculated with Alpha's HWID, but sent with Beta's HWID
    const fakeHash = computeSha256(testKeyStr + HWID_DEVICE_ALPHA + String(ts) + CONFIG.SECURE_SALT);

    const result = KeyService.verify(testKeyStr, HWID_DEVICE_BETA, ts, fakeHash, "10.0.0.5");

    expect(result.status).toBe("invalid");
    expect(result.message).toContain("integrity hash mismatch");
  });

  it("allows Admin/Owner to reset HWID and transfer binding to Device Beta", () => {
    // 1. Reset hardware binding
    const resetRes = KeyService.resetHwid(testKeyId, masterOwner);
    expect(resetRes.success).toBe(true);

    const unbondedKey = KeyService.getKeyById(testKeyId);
    expect(unbondedKey?.hwid).toBeNull();
    expect(unbondedKey?.reset_count).toBe(1);

    // 2. Now Device Beta connects and permanently locks the key to Device Beta
    const ts = Date.now();
    const hashBeta = computeSha256(testKeyStr + HWID_DEVICE_BETA + String(ts) + CONFIG.SECURE_SALT);
    const authBeta = KeyService.verify(testKeyStr, HWID_DEVICE_BETA, ts, hashBeta, "10.0.0.5");

    expect(authBeta.status).toBe("authenticated");
    expect(authBeta.hwid).toBe(HWID_DEVICE_BETA);

    // 3. Old Device Alpha is now locked out!
    const hashAlpha = computeSha256(testKeyStr + HWID_DEVICE_ALPHA + String(ts) + CONFIG.SECURE_SALT);
    const authAlpha = KeyService.verify(testKeyStr, HWID_DEVICE_ALPHA, ts, hashAlpha, "192.168.1.101");

    expect(authAlpha.status).toBe("mismatch");
    expect(authAlpha.message).toBe("Key is bound to another device!");
  });

  it("enforces allowable reset limits for subordinate accounts (max 3 resets)", () => {
    const adminUser = UserService.getUserById(2)!;

    // Reset 2
    expect(KeyService.resetHwid(testKeyId, adminUser).success).toBe(true);
    // Reset 3
    expect(KeyService.resetHwid(testKeyId, adminUser).success).toBe(true);

    // Reset 4 (exceeds max 3 resets)
    const failedReset = KeyService.resetHwid(testKeyId, adminUser);
    expect(failedReset.success).toBe(false);
    expect(failedReset.message).toContain("Maximum HWID resets limit reached");
  });
});
