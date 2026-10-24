import { StatsService } from "../services/statsService.js";
import { AuditService } from "../services/auditService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const StatsController = {
  getStats(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const stats = StatsService.getOverview(authRes.user);
    return jsonResponse({ success: true, ...stats });
  },

  getLogs(req: Request): Response {
    // Only Owner and Admin can inspect audit logs
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit")) || 100;
    const offset = Number(url.searchParams.get("offset")) || 0;
    const status = url.searchParams.get("status") || undefined;

    const logs = AuditService.getLogs(limit, offset, status);
    return jsonResponse({ success: true, logs });
  },

  clearLogs(req: Request): Response {
    // Only Owner can purge logs
    const authRes = requireRole(req, ["owner"]);
    if (authRes instanceof Response) return authRes;

    AuditService.clearLogs();
    return jsonResponse({ success: true, message: "Audit logs purged successfully" });
  },
};
