import { db } from "../db/database.js";
import type { AnnouncementRecord } from "../types/index.js";

export const AnnouncementService = {
  getAll(): AnnouncementRecord[] {
    return db.query("SELECT * FROM announcements ORDER BY id DESC").all() as AnnouncementRecord[];
  },

  getActive(): AnnouncementRecord | null {
    return (db.query("SELECT * FROM announcements WHERE is_active = 1 ORDER BY id DESC LIMIT 1").get() as AnnouncementRecord) || null;
  },

  create(title: string, content: string, severity: "info" | "warning" | "critical" = "info"): AnnouncementRecord {
    const res = db.run(
      "INSERT INTO announcements (title, content, severity, is_active, created_at) VALUES (?, ?, ?, 1, ?)",
      [title, content, severity, Date.now()]
    );
    return db.query("SELECT * FROM announcements WHERE id = ?").get(res.lastInsertRowid) as AnnouncementRecord;
  },

  toggle(id: number): boolean {
    const a = db.query("SELECT is_active FROM announcements WHERE id = ?").get(id) as { is_active: number } | undefined;
    if (!a) return false;
    const next = a.is_active ? 0 : 1;
    db.run("UPDATE announcements SET is_active = ? WHERE id = ?", [next, id]);
    return true;
  },

  delete(id: number): boolean {
    db.run("DELETE FROM announcements WHERE id = ?", [id]);
    return true;
  },
};
