import { NotificationService } from "../services/notificationService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth } from "../middleware/auth.js";

export const NotificationController = {
  getNotifications(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit")) || 100;
    const data = NotificationService.getNotifications(authRes.user, limit);

    return jsonResponse({
      success: true,
      notifications: data.notifications,
      unreadCount: data.unreadCount,
    });
  },

  async markRead(req: Request): Promise<Response> {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json().catch(() => ({}));
      const ids = Array.isArray(body.ids) ? body.ids.map(Number) : undefined;
      const marked = NotificationService.markRead(ids);
      return jsonResponse({ success: true, marked });
    } catch (err: any) {
      return errorResponse(err.message || "Failed to mark notifications as read", 500);
    }
  },

  clearAll(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    if (authRes.user.role === "reseller") {
      return errorResponse("Only Owner or Admin can clear the notification feed", 403);
    }

    const cleared = NotificationService.clearAll(authRes.user);
    return jsonResponse({ success: true, cleared, message: `Cleared ${cleared} notification(s)` });
  },
};
