import { describe, expect, it, afterAll, beforeAll } from "bun:test";
import { computeSha256 } from "../src/utils/crypto.js";
import { createServer } from "../src/index.js";

describe("HTTP Endpoints Integration Tests", () => {
  let testServer: any;
  let BASE_URL = "";
  let adminToken = "";

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

  it("authenticates admin and issues session token with deep stats", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "VoidAdmin#2026!Sec" }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    adminToken = data.token;

    // Verify authenticated endpoint with token and deep analytics fields
    const statsRes = await fetch(`${BASE_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stats = await statsRes.json();
    expect(stats.totalKeys).toBeGreaterThan(0);
    expect(Array.isArray(stats.generationByDuration)).toBe(true);
    expect(Array.isArray(stats.generationByCreator)).toBe(true);
    expect(Array.isArray(stats.generationTimeline)).toBe(true);
    expect(Array.isArray(stats.recentLogs)).toBe(true);
  });

  it("supports query-token CSV export, payment receipts CRUD, and account analytics", async () => {
    // 1. Export via ?token= query param
    const exportRes = await fetch(`${BASE_URL}/api/keys/export?format=csv&token=${adminToken}`);
    expect(exportRes.status).toBe(200);
    const csvText = await exportRes.text();
    expect(csvText).toContain("id,key,status");

    // 2. Get users list with key generation counts
    const usersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersPayload = await usersRes.json();
    const users = usersPayload.users;
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    expect(typeof users[0].keys_generated).toBe("number");

    // 3. Get single user deep analytics (/api/users/:id)
    const userDetailRes = await fetch(`${BASE_URL}/api/users/${users[0].id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const userDetail = await userDetailRes.json();
    expect(userDetail.user).toBeDefined();
    expect(Array.isArray(userDetail.keys)).toBe(true);
    expect(Array.isArray(userDetail.durationBreakdown)).toBe(true);
    expect(Array.isArray(userDetail.receipts)).toBe(true);

    // 4. Create a payment receipt & auto-grant credits
    const receiptRes = await fetch(`${BASE_URL}/api/receipts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: users[0].id,
        customerName: "Test Buyer",
        amountPaid: 49.99,
        currency: "USD",
        creditsGranted: 25,
        keysSummary: "25x 1-Day Keys",
        paymentMethod: "USDT",
        transactionRef: "TX-998877",
        status: "paid",
        note: "Automated test receipt",
        autoGrantCredits: false,
      }),
    });
    const receiptData = await receiptRes.json();
    expect(receiptData.success).toBe(true);
    expect(receiptData.receipt.receipt_no).toContain("VOID-RCP-");

    // 5. List receipts
    const listReceiptsRes = await fetch(`${BASE_URL}/api/receipts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const receiptsPayload = await listReceiptsRes.json();
    expect(receiptsPayload.receipts.length).toBeGreaterThan(0);

    // 6. Delete the created receipt
    const delReceiptRes = await fetch(`${BASE_URL}/api/receipts/${receiptData.receipt.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delReceiptData = await delReceiptRes.json();
    expect(delReceiptData.success).toBe(true);
  });

  it("supports bulk key purge by filter (/api/keys/all)", async () => {
    const purgeRes = await fetch(`${BASE_URL}/api/keys/all?filter=expired`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const purgeData = await purgeRes.json();
    expect(purgeData.success).toBe(true);
    expect(typeof purgeData.affected).toBe("number");
  });

  it("dispatches key creation + payment receipt + proof image to Owner Notification Feed", async () => {
    const ownerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "owner", password: "VoidOwner#2026!Master" }),
    });
    const ownerAuth = await ownerLoginRes.json();
    const ownerToken = ownerAuth.token || adminToken;

    const createKeyRes = await fetch(`${BASE_URL}/api/keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        durationDays: 1,
        note: "VIP Buyer Key",
        maxResets: 3,
        receipt: {
          customerName: "@vip_buyer",
          amountPaid: 15.0,
          currency: "USD",
          paymentMethod: "UPI",
          transactionRef: "UTR-99881122",
          proofImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        },
      }),
    });
    const keyData = await createKeyRes.json();
    if (!keyData.success) console.error("createKey error:", keyData);
    expect(keyData.success).toBe(true);
    expect(keyData.key).toBeDefined();
    expect(keyData.receipt).toBeDefined();
    expect(keyData.receipt.receipt_no).toContain("VOID-RCP-");

    // Verify Owner Notification Feed has this key creation + payment proof
    const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const notifData = await notifRes.json();
    expect(notifData.success).toBe(true);
    expect(notifData.notifications.length).toBeGreaterThan(0);
    const latest = notifData.notifications[0];
    expect(latest.keys_list).toContain(keyData.key.key_str);
    expect(latest.customer_name).toBe("@vip_buyer");
    expect(latest.payment_amount).toBe(15);
    expect(latest.proof_image).toContain("data:image/png;base64");
  });
});
