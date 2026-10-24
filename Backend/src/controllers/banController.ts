import { BanService } from "../services/banService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireRole } from "../middleware/auth.js";

export const BanController = {
  getBans(req: Request): Response {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    const bans = BanService.getBans();
    return jsonResponse({ success: true, bans });
  },

  async addBan(req: Request): Promise<Response> {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { type, value, reason } = body;

      if (!type || !value) {
        return errorResponse("type ('hwid' or 'ip') and value are required.", 400);
      }

      if (type !== "hwid" && type !== "ip") {
        return errorResponse("Type must be 'hwid' or 'ip'", 400);
      }

      const res = BanService.addBan(type, value, reason, authRes.user.username);
      if (!res.success) {
        return errorResponse(res.error || "Failed to add ban", 400);
      }

      return jsonResponse({ success: true, ban: res.ban }, 201);
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  removeBan(req: Request, id: number): Response {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    const ok = BanService.removeBan(id);
    return jsonResponse({ success: ok });
  },
};
