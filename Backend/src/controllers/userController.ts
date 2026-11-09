import { UserService } from "../services/userService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const UserController = {
  getUsers(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const users = UserService.getUsers(authRes.user);
    return jsonResponse({ success: true, users });
  },

  async createUser(req: Request): Promise<Response> {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { username, password, role, initialCredits } = body;

      if (!username || !password || !role) {
        return errorResponse("Username, password, and role are required.", 400);
      }

      const res = UserService.createUser(
        username,
        password,
        role,
        Number(initialCredits) || 0,
        authRes.user
      );

      if (!res.success) {
        return errorResponse(res.error || "Failed to create user", 400);
      }

      return jsonResponse({ success: true, user: res.user }, 201);
    } catch (err: any) {
      return errorResponse(err.message || "Failed to process user creation", 500);
    }
  },

  getUserById(req: Request, id: number): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    if (authRes.user.role === "reseller" && authRes.user.id !== id) {
      return errorResponse("Access denied", 403);
    }

    const details = UserService.getUserAnalytics(id);
    if (!details) return errorResponse("User not found", 404);

    return jsonResponse({ success: true, ...details });
  },

  async updateUserStatus(req: Request, id: number): Promise<Response> {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { status } = body;
      if (status !== "active" && status !== "suspended") {
        return errorResponse("Status must be 'active' or 'suspended'", 400);
      }

      const updated = UserService.updateStatus(id, status, authRes.user);
      if (!updated) {
        return errorResponse("Failed to update status. Target user not found or unauthorized.", 400);
      }

      return jsonResponse({ success: true, message: `User status changed to ${status}` });
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  deleteUser(req: Request, id: number): Response {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    const res = UserService.deleteUser(id, authRes.user);
    if (!res.success) {
      return errorResponse(res.error || "Failed to delete user", 400);
    }

    return jsonResponse({ success: true, message: "User deleted successfully" });
  },

  async bulkAction(req: Request): Promise<Response> {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { action, userIds } = body;
      if (!action) return errorResponse("action is required", 400);

      const res = UserService.bulkUsersAction(action, Array.isArray(userIds) ? userIds : [], authRes.user);
      return jsonResponse(res, res.success ? 200 : 400);
    } catch (err: any) {
      return errorResponse(err.message || "Bulk user operation failed", 500);
    }
  },

  async resetPassword(req: Request, id: number): Promise<Response> {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { password } = body;

      if (!password || String(password).trim().length < 6) {
        return errorResponse("Password must be at least 6 characters long.", 400);
      }

      const res = UserService.resetPassword(id, String(password).trim(), authRes.user);
      if (!res.success) {
        return errorResponse(res.error || "Failed to reset password", 400);
      }

      return jsonResponse({ success: true, message: "Password updated successfully." });
    } catch (err: any) {
      return errorResponse(err.message || "Failed to process password reset", 500);
    }
  },
};
