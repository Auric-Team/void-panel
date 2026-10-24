import { describe, expect, it, afterAll, beforeAll } from "bun:test";
import { computeSha256 } from "../src/utils/crypto.js";
import { createServer } from "../src/index.js";

describe("HTTP Endpoints Integration Tests", () => {
  let testServer: any;
  let BASE_URL = "";

  beforeAll(() => {
    testServer = createServer(0); // Ephemeral dynamic port
    BASE_URL = `http://127.0.0.1:${testServer.port}`;
  });

  afterAll(() => {
    testServer?.stop(true);
  });

  it("handles /api/verify over HTTP accurately", async () => {
    // 1. First test invalid key
    const resInvalid = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "FAKE-KEY-999", hwid: "HWID-TEST-DEV" }),
    });
    const dataInvalid = await resInvalid.json();
    expect(dataInvalid.status).toBe("invalid");

    // 2. Test valid lifetime key
    const ts = Date.now();
    const key = "VOID-LIFETIME-PREMIUM-2026";
    const hwid = "HWID-REAL-DEVICE-01";
    const hash = computeSha256(key + hwid + String(ts) + "VOID_SECURE_SALT_2026");

    const resValid = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, hwid, timestamp: ts, hash }),
    });
    const dataValid = await resValid.json();
    expect(dataValid.status).toBe("authenticated");
    expect(dataValid.message).toContain("Authenticated");
  });

  it("authenticates admin and issues session token", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "VoidAdmin#2026!Sec" }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();

    // Verify authenticated endpoint with token
    const statsRes = await fetch(`${BASE_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const stats = await statsRes.json();
    expect(stats.totalKeys).toBeGreaterThan(0);
  });
});
