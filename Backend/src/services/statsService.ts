import { db } from "../db/database.js";
import type { UserPublicProfile, LogRecord } from "../types/index.js";

export const StatsService = {
  getOverview(currentUser?: UserPublicProfile) {
    const now = Date.now();
    const dayAgo = now - 86400000;

    let keyWhere = "";
    const keyParams: any[] = [];

    if (currentUser?.role === "reseller") {
      keyWhere = " WHERE (created_by_id = ? OR LOWER(created_by_name) = LOWER(?))";
      keyParams.push(currentUser.id, currentUser.username);
    }

    // Key counts
    const totalKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere}`).get(...keyParams) as any).c || 0;
    const activeKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} status = 'active'`).get(...keyParams) as any).c || 0;
    const boundKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} hwid IS NOT NULL AND hwid != ''`).get(...keyParams) as any).c || 0;
    const unboundKeys = Math.max(0, totalKeys - boundKeys);
    const expiredKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} status = 'expired'`).get(...keyParams) as any).c || 0;
    const pausedKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} status = 'paused'`).get(...keyParams) as any).c || 0;
    const revokedKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} status = 'revoked'`).get(...keyParams) as any).c || 0;
    const totalCreditsSpentOnKeys = (db.query(`SELECT COALESCE(SUM(credit_cost), 0) as s FROM keys${keyWhere}`).get(...keyParams) as any).s || 0;

    // Deep Key Generation Breakdown by Duration Tier
    const generationByDuration = db
      .query(
        `SELECT duration_days,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN hwid IS NOT NULL AND hwid != '' THEN 1 ELSE 0 END) as bound_count,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_count,
                COALESCE(SUM(credit_cost), 0) as credit_cost
         FROM keys${keyWhere}
         GROUP BY duration_days
         ORDER BY duration_days ASC`
      )
      .all(...keyParams) as any[];

    // Deep Key Generation Breakdown by Creator Account
    let generationByCreator: any[] = [];
    if (currentUser?.role === "owner" || currentUser?.role === "admin") {
      generationByCreator = db
        .query(
          `SELECT u.id,
                  u.username,
                  u.role,
                  u.credits,
                  u.status,
                  COUNT(k.id) as total_keys,
                  SUM(CASE WHEN k.status = 'active' THEN 1 ELSE 0 END) as active_keys,
                  SUM(CASE WHEN k.hwid IS NOT NULL AND k.hwid != '' THEN 1 ELSE 0 END) as bound_keys,
                  SUM(CASE WHEN k.status = 'expired' THEN 1 ELSE 0 END) as expired_keys,
                  SUM(CASE WHEN k.status = 'paused' THEN 1 ELSE 0 END) as paused_keys,
                  COALESCE(SUM(k.credit_cost), 0) as credits_spent
           FROM users u
           LEFT JOIN keys k ON (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username))
           GROUP BY u.id
           ORDER BY total_keys DESC, u.id ASC`
        )
        .all() as any[];
    } else if (currentUser) {
      generationByCreator = db
        .query(
          `SELECT u.id,
                  u.username,
                  u.role,
                  u.credits,
                  u.status,
                  COUNT(k.id) as total_keys,
                  SUM(CASE WHEN k.status = 'active' THEN 1 ELSE 0 END) as active_keys,
                  SUM(CASE WHEN k.hwid IS NOT NULL AND k.hwid != '' THEN 1 ELSE 0 END) as bound_keys,
                  SUM(CASE WHEN k.status = 'expired' THEN 1 ELSE 0 END) as expired_keys,
                  SUM(CASE WHEN k.status = 'paused' THEN 1 ELSE 0 END) as paused_keys,
                  COALESCE(SUM(k.credit_cost), 0) as credits_spent
           FROM users u
           LEFT JOIN keys k ON (k.created_by_id = u.id OR LOWER(k.created_by_name) = LOWER(u.username))
           WHERE u.id = ?
           GROUP BY u.id`
        )
        .all(currentUser.id) as any[];
    }

    // 7-day generation & verification timeline
    const generationTimeline: { label: string; keysCreated: number; verifications: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const startOfDay = new Date(now - i * 86400000);
      startOfDay.setHours(0, 0, 0, 0);
      const startMs = startOfDay.getTime();
      const endMs = startMs + 86400000;
      const label = startOfDay.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const kCount = (
        db
          .query(
            `SELECT COUNT(*) as c FROM keys ${keyWhere ? keyWhere + " AND" : "WHERE"} created_at >= ? AND created_at < ?`
          )
          .get(...keyParams, startMs, endMs) as any
      ).c || 0;

      const vCount = (
        db.query("SELECT COUNT(*) as c FROM logs WHERE timestamp >= ? AND timestamp < ?").get(startMs, endMs) as any
      ).c || 0;

      generationTimeline.push({ label, keysCreated: kCount, verifications: vCount });
    }

    // Users and credit pool stats (Visible to Owner & Admin)
    let totalUsers = 0;
    let totalResellers = 0;
    let totalAdmins = 0;
    let totalCreditsInCirculation = 0;
    let totalReceipts = 0;
    let totalRevenue = 0;

    if (currentUser?.role === "owner" || currentUser?.role === "admin") {
      totalUsers = (db.query("SELECT COUNT(*) as c FROM users").get() as any).c || 0;
      totalResellers = (db.query("SELECT COUNT(*) as c FROM users WHERE role = 'reseller'").get() as any).c || 0;
      totalAdmins = (db.query("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as any).c || 0;
      totalCreditsInCirculation = (db.query("SELECT COALESCE(SUM(credits), 0) as s FROM users WHERE role != 'owner'").get() as any).s || 0;
      totalReceipts = (db.query("SELECT COUNT(*) as c FROM payment_receipts").get() as any).c || 0;
      totalRevenue = (db.query("SELECT COALESCE(SUM(amount_paid), 0) as s FROM payment_receipts WHERE status = 'paid'").get() as any).s || 0;
    } else if (currentUser) {
      totalReceipts = (db.query("SELECT COUNT(*) as c FROM payment_receipts WHERE user_id = ?").get(currentUser.id) as any).c || 0;
      totalRevenue = (db.query("SELECT COALESCE(SUM(amount_paid), 0) as s FROM payment_receipts WHERE user_id = ? AND status = 'paid'").get(currentUser.id) as any).s || 0;
    }

    // Client verification activity (logs)
    const totalVerifications = (db.query("SELECT COUNT(*) as c FROM logs").get() as any).c || 0;
    const past24hVerifications = (db.query("SELECT COUNT(*) as c FROM logs WHERE timestamp >= ?").get(dayAgo) as any).c || 0;
    const success24h = (db.query("SELECT COUNT(*) as c FROM logs WHERE timestamp >= ? AND status = 'authenticated'").get(dayAgo) as any).c || 0;
    const successfulVerifications = (db.query("SELECT COUNT(*) as c FROM logs WHERE status = 'authenticated'").get() as any).c || 0;

    const successRate = totalVerifications > 0
      ? Math.round((successfulVerifications / totalVerifications) * 100)
      : 100;

    const recentLogs = db.query("SELECT * FROM logs ORDER BY id DESC LIMIT 12").all() as LogRecord[];

    // Reseller specific balance
    const userCredits = currentUser ? (db.query("SELECT credits FROM users WHERE id = ?").get(currentUser.id) as any)?.credits ?? 0 : 0;

    return {
      totalKeys,
      activeKeys,
      boundKeys,
      unboundKeys,
      expiredKeys,
      pausedKeys,
      revokedKeys,
      totalCreditsSpentOnKeys,
      generationByDuration,
      generationByCreator,
      generationTimeline,
      totalUsers,
      totalResellers,
      totalAdmins,
      totalCreditsInCirculation,
      totalReceipts,
      totalRevenue,
      userCredits,
      totalVerifications,
      past24hVerifications,
      verifications24h: past24hVerifications,
      success24h,
      successRate,
      recentLogs,
      role: currentUser?.role || "reseller",
      username: currentUser?.username || "guest",
    };
  },
};
