import { db } from "../db/database.js";
import type { LogRecord } from "../types/index.js";

export const AuditService = {
  getLogs(limit = 100, offset = 0, status?: string): LogRecord[] {
    let sql = "SELECT * FROM logs WHERE 1=1";
    const params: any[] = [];

    if (status && status !== "all") {
      sql += " AND status = ?";
      params.push(status);
    }

    sql += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    return db.query(sql).all(...params) as LogRecord[];
  },

  clearLogs(): void {
    db.run("DELETE FROM logs");
  },
};
