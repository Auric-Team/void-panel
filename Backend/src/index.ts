import { initDatabase } from "./db/database.js";
import { ReceiptService } from "./services/receiptService.js";
import { handleRequest } from "./routes/index.js";
import { CONFIG } from "./config/index.js";

// Initialize SQLite database and tables
initDatabase();

const isTesting = process.env.NODE_ENV === "test" || process.argv.some((a) => a.includes("test"));
if (!isTesting) {
  ReceiptService.syncAllReceiptsToDisk();
}

export function createServer(port = CONFIG.PORT) {
  return Bun.serve({
    port,
    async fetch(req, srv) {
      try {
        return await handleRequest(req, srv);
      } catch (err: any) {
        console.error("[FATAL SERVER ERROR]", err);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Internal server error occurred",
            details: err.message,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...CONFIG.CORS_HEADERS,
            },
          }
        );
      }
    },
  });
}

// Only auto-start on fixed port when run directly (not during test suites)
export const server = createServer(isTesting ? 0 : (Number(process.env.PORT) || CONFIG.PORT));

if (!isTesting) {
  console.log(`[VOID PANEL BACKEND] Running production microservice on http://localhost:${server.port}`);
}
