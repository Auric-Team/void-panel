import { CONFIG } from "../config/index.js";

export function jsonResponse(data: any, status = 200, customHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CONFIG.CORS_HEADERS,
      ...customHeaders,
    },
  });
}

export function errorResponse(message: string, status = 400, details?: any): Response {
  return jsonResponse({
    success: false,
    error: message,
    ...(details ? { details } : {})
  }, status);
}

export function paginatedResponse<T>(items: T[], total: number, limit: number, offset: number): Response {
  return jsonResponse({
    success: true,
    data: items,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + items.length < total
    }
  });
}
