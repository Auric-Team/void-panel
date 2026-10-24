import { VoucherService } from "../services/voucherService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const VoucherController = {
  getVouchers(req: Request): Response {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    const vouchers = VoucherService.getAll();
    return jsonResponse({ success: true, vouchers });
  },

  async createVoucher(req: Request): Promise<Response> {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { code, credits, maxUses, expiresAt } = body;

      if (!code || !credits) {
        return errorResponse("Voucher code and credits amount are required.", 400);
      }

      const res = VoucherService.create(code, Number(credits), Number(maxUses) || 1, expiresAt, authRes.user.username);
      if (!res.success) {
        return errorResponse(res.error || "Failed to create voucher", 400);
      }

      return jsonResponse({ success: true, voucher: res.voucher }, 201);
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  async redeemVoucher(req: Request): Promise<Response> {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { code } = body;

      if (!code) {
        return errorResponse("Voucher code is required.", 400);
      }

      const res = VoucherService.redeem(code, authRes.user);
      if (!res.success) {
        return errorResponse(res.error || "Failed to redeem voucher", 400);
      }

      return jsonResponse({
        success: true,
        message: `Successfully redeemed ${res.creditsAdded} credits!`,
        creditsAdded: res.creditsAdded,
        newBalance: res.newBalance,
      });
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  deleteVoucher(req: Request, id: number): Response {
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    const ok = VoucherService.delete(id);
    return jsonResponse({ success: ok });
  },
};
