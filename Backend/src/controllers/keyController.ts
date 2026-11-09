import { KeyService } from "../services/keyService.js";
import { jsonResponse, errorResponse } from "../utils/response.js";
import { requireAuth } from "../middleware/auth.js";
import { CONFIG } from "../config/index.js";

export const KeyController = {
  getKeys(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 5000;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const keys = KeyService.getAllKeys({ search, status, limit, offset }, authRes.user);
    return jsonResponse({ success: true, keys });
  },

  async createKey(req: Request): Promise<Response> {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();

      const receipt = body.receipt
        ? {
            customerName: body.receipt.customerName || body.customerName,
            amountPaid: body.receipt.amountPaid ?? body.amountPaid,
            currency: body.receipt.currency || body.currency,
            paymentMethod: body.receipt.paymentMethod || body.paymentMethod,
            transactionRef: body.receipt.transactionRef || body.transactionRef,
            proofImage: body.receipt.proofImage || body.proofImage,
          }
        : undefined;

      // Check if batch generation requested
      if (body.batch && body.count) {
        const count = Number(body.count) || 1;
        const duration = body.durationDays !== undefined ? Number(body.durationDays) : 1;
        const prefix = body.prefix || "VOID";
        const note = body.note || "";

        const batchRes = KeyService.createBatchKeys(count, duration, note, prefix, authRes.user, receipt);
        if (!batchRes.success) {
          return errorResponse(batchRes.error || "Batch generation failed", 400, {
            totalCost: batchRes.totalCost,
          });
        }

        return jsonResponse({
          success: true,
          count: batchRes.keys?.length,
          totalCost: batchRes.totalCost,
          keys: batchRes.keys,
          receipt: batchRes.receipt,
        });
      }

      // Single key generation
      const duration = body.durationDays !== undefined ? Number(body.durationDays) : 1;
      const customKey = body.customKey || undefined;
      const note = body.note || "";
      const maxResets = body.maxResets !== undefined ? Number(body.maxResets) : 3;

      const singleRes = KeyService.createKey(duration, note, customKey, maxResets, authRes.user, receipt);
      if (!singleRes.success) {
        return errorResponse(singleRes.error || "Key creation failed", 400, {
          creditCost: singleRes.creditCost,
        });
      }

      return jsonResponse({
        success: true,
        key: singleRes.key,
        receipt: singleRes.receipt,
        creditCost: singleRes.creditCost,
      });
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  getKeyById(req: Request, id: number): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const key = KeyService.getKeyById(id);
    if (!key) return errorResponse("Key not found", 404);

    if (authRes.user.role === "reseller" && key.created_by_id !== authRes.user.id) {
      return errorResponse("Access denied", 403);
    }

    return jsonResponse({ success: true, key });
  },

  async updateKey(req: Request, id: number): Promise<Response> {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();

      if (body.status) {
        const ok = KeyService.updateStatus(id, body.status, authRes.user);
        if (!ok) return errorResponse("Failed to update status or unauthorized", 400);
      }

      if (body.additionalDays) {
        // Only Owner and Admin can freely extend days without spending credits
        if (authRes.user.role === "reseller") {
          return errorResponse("Resellers cannot extend keys directly. Generate a new key instead.", 403);
        }
        KeyService.extendDuration(id, Number(body.additionalDays));
      }

      const updated = KeyService.getKeyById(id);
      return jsonResponse({ success: true, key: updated });
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  deleteKey(req: Request, id: number): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const ok = KeyService.deleteKey(id, authRes.user);
    if (!ok) return errorResponse("Failed to delete key or unauthorized", 400);

    return jsonResponse({ success: true, message: "Key deleted successfully" });
  },

  resetHwid(req: Request, id: number): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const result = KeyService.resetHwid(id, authRes.user);
    return jsonResponse(result, result.success ? 200 : 400);
  },

  async bulkAction(req: Request): Promise<Response> {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    try {
      const body = await req.json();
      const { action, keyIds, extraDays } = body;

      if (!action) {
        return errorResponse("action is required.", 400);
      }

      const res = KeyService.bulkAction(action, Array.isArray(keyIds) ? keyIds : [], Number(extraDays) || 30, authRes.user);
      return jsonResponse(res);
    } catch (err: any) {
      return errorResponse(err.message, 500);
    }
  },

  deleteAllKeys(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const url = new URL(req.url);
    const filter = (url.searchParams.get("filter") as any) || "all";
    const res = KeyService.deleteAllKeys(filter, authRes.user);
    return jsonResponse(res);
  },

  exportKeys(req: Request): Response {
    const authRes = requireAuth(req);
    if (authRes instanceof Response) return authRes;

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "txt";
    const keys = KeyService.getAllKeys({ limit: 10000 }, authRes.user);

    if (format === "csv") {
      const headers = "id,key,status,duration_days,credit_cost,hwid,created_at,expires_at,created_by,note\n";
      const rows = keys
        .map((k) =>
          [
            k.id,
            k.key_str,
            k.status,
            k.duration_days,
            k.credit_cost,
            k.hwid || "",
            new Date(k.created_at).toISOString(),
            k.expires_at ? new Date(k.expires_at).toISOString() : "Lifetime",
            k.created_by_name,
            `"${(k.note || "").replace(/"/g, '""')}"`,
          ].join(",")
        )
        .join("\n");

      return new Response(headers + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="void_keys.csv"',
          ...CONFIG.CORS_HEADERS,
        },
      });
    }

    const txt = keys.map((k) => k.key_str).join("\n");
    return new Response(txt, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": 'attachment; filename="void_keys.txt"',
        ...CONFIG.CORS_HEADERS,
      },
    });
  },
};
