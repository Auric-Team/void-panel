import { SettingsService } from "../services/settingsService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const SettingsController = {
  getSettings(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const settings = SettingsService.getSettings();
    return jsonResponse({ success: true, settings });
  },

  async updateSettings(req: Request): Promise<Response> {
    const authRes = requireRole(req, ["owner"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const updated = SettingsService.updateSettings(body);
      return jsonResponse({ success: true, settings: updated });
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  async testWebhook(req: Request): Promise<Response> {
    const authRes = requireRole(req, ["owner"]);
    if (authRes instanceof Response) return authRes;

    try {
      await SettingsService.sendDiscordWebhook(
        "🔔 Test Notification from Void License Panel",
        "Discord webhook connectivity verified successfully! Ready for live security alerts.",
        0x10b981
      );
      return jsonResponse({ success: true, message: "Test alert dispatched" });
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },
};
