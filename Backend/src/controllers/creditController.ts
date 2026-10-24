import { CreditService } from "../services/creditService.js";
import { CREDIT_RATES, getCreditCostForDuration } from "../config/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const CreditController = {
  getRates(): Response {
    return jsonResponse({
      success: true,
      rates: CREDIT_RATES,
      standardRule: "24 Hours (1 Day) = 10 Credits",
    });
  },

  async grantCredits(req: Request): Promise<Response> {
    // Only Owner and Admin can grant credits
    const authRes = requireRole(req, ["owner", "admin"]);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { targetUserId, amount, note } = body;

      if (!targetUserId || !amount || Number(amount) <= 0) {
        return errorResponse("targetUserId and a positive amount are required.", 400);
      }

      const res = CreditService.grantCredits(
        Number(targetUserId),
        Number(amount),
        authRes.user,
        note
      );

      if (!res.success) {
        return errorResponse(res.error || "Failed to grant credits", 400);
      }

      return jsonResponse({
        success: true,
        message: `Successfully transferred ${amount} credits`,
        newBalance: res.newBalance,
      });
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  getLedger(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit")) || 100;
    const offset = Number(url.searchParams.get("offset")) || 0;

    // Resellers only see their own transactions
    const targetUserId = authRes.user.role === "reseller" ? authRes.user.id : undefined;

    const transactions = CreditService.getTransactions(targetUserId, limit, offset);
    return jsonResponse({ success: true, transactions });
  },

  calculateCost(req: Request): Response {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days")) || 1;
    const count = Number(url.searchParams.get("count")) || 1;

    const unitCost = getCreditCostForDuration(days);
    const totalCost = unitCost * count;

    return jsonResponse({
      success: true,
      durationDays: days,
      unitCost,
      count,
      totalCost,
    });
  },
};
