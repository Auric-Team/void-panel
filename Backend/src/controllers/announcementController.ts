import { AnnouncementService } from "../services/announcementService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const AnnouncementController = {
  getAnnouncements(req: Request): Response {
    // Anyone logged in can read announcements
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const announcements = AnnouncementService.getAll();
    return jsonResponse({ success: true, announcements });
  },

  getActiveAnnouncement(): Response {
    const active = AnnouncementService.getActive();
    return jsonResponse({ success: true, announcement: active });
  },

  async createAnnouncement(req: Request): Promise<Response> {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { title, content, severity } = body;

      if (!title || !content) {
        return errorResponse("Title and content are required.", 400);
      }

      const created = AnnouncementService.create(title, content, severity || "info");
      return jsonResponse({ success: true, announcement: created }, 201);
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  toggleAnnouncement(req: Request, id: number): Response {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    const ok = AnnouncementService.toggle(id);
    return jsonResponse({ success: ok });
  },

  deleteAnnouncement(req: Request, id: number): Response {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    const ok = AnnouncementService.delete(id);
    return jsonResponse({ success: ok });
  },
};
