import { AuthController } from "../controllers/authController.js";
import { UserController } from "../controllers/userController.js";
import { CreditController } from "../controllers/creditController.js";
import { KeyController } from "../controllers/keyController.js";
import { StatsController } from "../controllers/statsController.js";
import { VerifyController } from "../controllers/verifyController.js";
import { BanController } from "../controllers/banController.js";
import { AnnouncementController } from "../controllers/announcementController.js";
import { VoucherController } from "../controllers/voucherController.js";
import { SettingsController } from "../controllers/settingsController.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { CONFIG } from "../config/index.js";

export async function handleRequest(req: Request, srv: any): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === "OPTIONS") {
    return new Response(null, { headers: CONFIG.CORS_HEADERS });
  }

  const clientIp = srv?.requestIP?.(req)?.address || "127.0.0.1";

  // 1. C++ Mod Menu Synced Verification Endpoint
  if (path === "/api/verify" && method === "POST") {
    return VerifyController.verify(req, clientIp);
  }

  // 2. Authentication Routes
  if (path === "/api/auth/login" && method === "POST") {
    return AuthController.login(req);
  }
  if (path === "/api/auth/logout" && method === "POST") {
    return AuthController.logout(req);
  }
  if (path === "/api/auth/me" && method === "GET") {
    return AuthController.me(req);
  }

  // 3. User & Reseller Management (Owner > Admin > Reseller)
  if (path === "/api/users" && method === "GET") {
    return UserController.getUsers(req);
  }
  if (path === "/api/users" && method === "POST") {
    return UserController.createUser(req);
  }
  const userPasswordMatch = path.match(/^\/api\/users\/(\d+)\/password$/);
  if (userPasswordMatch && method === "POST") {
    return UserController.resetPassword(req, Number(userPasswordMatch[1]));
  }
  const userMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (userMatch) {
    const id = Number(userMatch[1]);
    if (method === "GET") return UserController.getUserById(req, id);
    if (method === "PATCH") return UserController.updateUserStatus(req, id);
    if (method === "DELETE") return UserController.deleteUser(req, id);
  }

  // 4. Credit System Routes
  if (path === "/api/credits/rates" && method === "GET") {
    return CreditController.getRates();
  }
  if (path === "/api/credits/calculate" && method === "GET") {
    return CreditController.calculateCost(req);
  }
  if (path === "/api/credits/grant" && method === "POST") {
    return CreditController.grantCredits(req);
  }
  if (path === "/api/credits/ledger" && method === "GET") {
    return CreditController.getLedger(req);
  }

  // 5. Gift Vouchers & Redeem Codes
  if (path === "/api/vouchers" && method === "GET") {
    return VoucherController.getVouchers(req);
  }
  if (path === "/api/vouchers" && method === "POST") {
    return VoucherController.createVoucher(req);
  }
  if (path === "/api/vouchers/redeem" && method === "POST") {
    return VoucherController.redeemVoucher(req);
  }
  const voucherMatch = path.match(/^\/api\/vouchers\/(\d+)$/);
  if (voucherMatch && method === "DELETE") {
    return VoucherController.deleteVoucher(req, Number(voucherMatch[1]));
  }

  // 6. Security Blacklist / Device Bans
  if (path === "/api/bans" && method === "GET") {
    return BanController.getBans(req);
  }
  if (path === "/api/bans" && method === "POST") {
    return BanController.addBan(req);
  }
  const banMatch = path.match(/^\/api\/bans\/(\d+)$/);
  if (banMatch && method === "DELETE") {
    return BanController.removeBan(req, Number(banMatch[1]));
  }

  // 7. Live Announcements & Broadcasts
  if (path === "/api/announcements" && method === "GET") {
    return AnnouncementController.getAnnouncements(req);
  }
  if (path === "/api/announcements/active" && method === "GET") {
    return AnnouncementController.getActiveAnnouncement();
  }
  if (path === "/api/announcements" && method === "POST") {
    return AnnouncementController.createAnnouncement(req);
  }
  const toggleMatch = path.match(/^\/api\/announcements\/(\d+)\/toggle$/);
  if (toggleMatch && method === "PATCH") {
    return AnnouncementController.toggleAnnouncement(req, Number(toggleMatch[1]));
  }
  const annMatch = path.match(/^\/api\/announcements\/(\d+)$/);
  if (annMatch && method === "DELETE") {
    return AnnouncementController.deleteAnnouncement(req, Number(annMatch[1]));
  }

  // 8. System & Webhook Settings
  if (path === "/api/settings" && method === "GET") {
    return SettingsController.getSettings(req);
  }
  if (path === "/api/settings" && method === "PATCH") {
    return SettingsController.updateSettings(req);
  }
  if (path === "/api/settings/test-webhook" && method === "POST") {
    return SettingsController.testWebhook(req);
  }

  // 9. Keys Management
  if (path === "/api/keys/bulk" && method === "POST") {
    return KeyController.bulkAction(req);
  }
  if (path === "/api/keys" && method === "GET") {
    return KeyController.getKeys(req);
  }
  if (path === "/api/keys" && method === "POST") {
    return KeyController.createKey(req);
  }
  if (path === "/api/keys/export" && method === "GET") {
    return KeyController.exportKeys(req);
  }
  const keyMatch = path.match(/^\/api\/keys\/(\d+)$/);
  if (keyMatch) {
    const id = Number(keyMatch[1]);
    if (method === "GET") return KeyController.getKeyById(req, id);
    if (method === "PATCH") return KeyController.updateKey(req, id);
    if (method === "DELETE") return KeyController.deleteKey(req, id);
  }
  const resetMatch = path.match(/^\/api\/keys\/(\d+)\/reset-hwid$/);
  if (resetMatch && method === "POST") {
    return KeyController.resetHwid(req, Number(resetMatch[1]));
  }

  // 10. Statistics & Audit Logs
  if (path === "/api/stats" && method === "GET") {
    return StatsController.getStats(req);
  }
  if (path === "/api/logs" && method === "GET") {
    return StatsController.getLogs(req);
  }
  if (path === "/api/logs" && method === "DELETE") {
    return StatsController.clearLogs(req);
  }

  // 11. System Health Check
  if (path === "/health" || path === "/api/health") {
    return jsonResponse({
      status: "healthy",
      version: "2.6.0-void-production",
      runtime: "Bun " + Bun.version,
      timestamp: Date.now(),
    });
  }

  return errorResponse(`Route not found: ${method} ${path}`, 404);
}
