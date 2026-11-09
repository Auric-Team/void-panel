import { AuthService } from "../services/authService.js";
import { errorResponse } from "../utils/response.js";
import type { UserPublicProfile, UserRole } from "../types/index.js";

export interface AuthenticatedRequest {
  user: UserPublicProfile;
  token: string;
}

export function getAuthUser(req: Request): UserPublicProfile | null {
  const authHeader = req.headers.get("Authorization");
  let token = "";
  if (authHeader) {
    token = authHeader.replace(/^Bearer\s+/i, "").trim();
  }
  if (!token) {
    try {
      const url = new URL(req.url);
      token = (url.searchParams.get("token") || "").trim();
    } catch {}
  }
  if (!token) return null;

  return AuthService.getUserByToken(token);
}

export function requireAuth(req: Request): { user: UserPublicProfile } | Response {
  const user = getAuthUser(req);
  if (!user) {
    return errorResponse("Authentication required. Invalid or expired session token.", 401);
  }
  return { user };
}

export function requireRole(req: Request, allowedRoles: UserRole[]): { user: UserPublicProfile } | Response {
  const authRes = requireAuth(req);
  if (authRes instanceof Response) return authRes;

  const { user } = authRes;
  if (!allowedRoles.includes(user.role)) {
    return errorResponse(
      `Access denied. Role '${user.role}' lacks permission for this action. Required: ${allowedRoles.join(" or ")}`,
      403
    );
  }

  return { user };
}
