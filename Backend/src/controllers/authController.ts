import { AuthService } from "../services/authService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth } from "../middleware/auth.js";

export const AuthController = {
  async login(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { username, password } = body;

      if (!username || !password) {
        return errorResponse("Username and password are required.", 400);
      }

      const result = await AuthService.login(username, password);
      if (!result) {
        return errorResponse("Invalid username or password.", 401);
      }

      return jsonResponse({
        success: true,
        token: result.token,
        user: result.user,
      });
    } catch (err: any) {
      return errorResponse(err.message || "Login failed", 400);
    }
  },

  logout(req: Request): Response {
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      AuthService.logout(token);
    }
    return jsonResponse({ success: true, message: "Logged out successfully" });
  },

  me(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    return jsonResponse({
      success: true,
      user: authRes.user,
    });
  },
};
