import { ReceiptService } from "../services/receiptService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth } from "../middleware/auth.js";

export const ReceiptController = {
  getReceipts(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const receipts = ReceiptService.getReceipts(authRes.user);
    return jsonResponse({ success: true, receipts });
  },

  async createReceipt(req: Request): Promise<Response> {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const res = ReceiptService.createReceipt(body, authRes.user);
      if (!res.success) {
        return errorResponse(res.error || "Failed to generate payment receipt", 400);
      }
      return jsonResponse({ success: true, receipt: res.receipt }, 201);
    } catch (err: any) {
      return errorResponse(err.message || "Failed to create receipt", 500);
    }
  },

  deleteReceipt(req: Request, id: number): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const ok = ReceiptService.deleteReceipt(id, authRes.user);
    if (!ok) return errorResponse("Receipt not found or unauthorized", 400);

    return jsonResponse({ success: true, message: "Payment receipt deleted" });
  },

  deleteAllReceipts(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const deleted = ReceiptService.deleteAllReceipts(authRes.user);
    return jsonResponse({ success: true, deleted, message: `Purged ${deleted} payment receipt(s)` });
  },
};
