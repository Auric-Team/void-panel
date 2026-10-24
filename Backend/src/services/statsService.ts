import { db } from "../db/database.js";
import type { UserPublicProfile } from "../types/index.js";

export const StatsService = {
  getOverview(currentUser?: UserPublicProfile) {
    const now = Date.now();
    const dayAgo = now - 86400000;

    let keyWhere = "";
    const keyParams: any[] = [];

    if (currentUser?.role === "reseller") {
      keyWhere = " WHERE created_by_id = ?";
      keyParams.push(currentUser.id);
    }

    // Key counts
    const totalKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere}`).get(...keyParams) as any).c;
    const activeKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} status = 'active'`).get(...keyParams) as any).c;
    const boundKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} hwid IS NOT NULL AND hwid != ''`).get(...keyParams) as any).c;
    const expiredKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} status = 'expired'`).get(...keyParams) as any).c;
    const pausedKeys = (db.query(`SELECT COUNT(*) as c FROM keys${keyWhere ? keyWhere + " AND" : " WHERE"} status = 'paused'`).get(...keyParams) as any).c;

    // Users and credit pool stats (Visible to Owner & Admin)
    let totalUsers = 0;
    let totalResellers = 0;
    let totalCreditsInCirculation = 0;

    if (currentUser?.role === "owner" || currentUser?.role === "admin") {
      totalUsers = (db.query("SELECT COUNT(*) as c FROM users").get() as any).c;
      totalResellers = (db.query("SELECT COUNT(*) as c FROM users WHERE role = 'reseller'").get() as any).c;
      totalCreditsInCirculation = (db.query("SELECT SUM(credits) as s FROM users WHERE role != 'owner'").get() as any).s || 0;
    }

    // Client verification activity (logs)
    const totalVerifications = (db.query("SELECT COUNT(*) as c FROM logs").get() as any).c;
    const past24hVerifications = (db.query("SELECT COUNT(*) as c FROM logs WHERE timestamp >= ?").get(dayAgo) as any).c;
    const successfulVerifications = (db.query("SELECT COUNT(*) as c FROM logs WHERE status = 'authenticated'").get() as any).c;

    const successRate = totalVerifications > 0
      ? Math.round((successfulVerifications / totalVerifications) * 100)
      : 100;

    // Reseller specific balance
    const userCredits = currentUser ? (db.query("SELECT credits FROM users WHERE id = ?").get(currentUser.id) as any)?.credits ?? 0 : 0;

    return {
      totalKeys,
      activeKeys,
      boundKeys,
      expiredKeys,
      pausedKeys,
      totalUsers,
      totalResellers,
      totalCreditsInCirculation,
      userCredits,
      totalVerifications,
      past24hVerifications,
      successRate,
      role: currentUser?.role || "reseller",
      username: currentUser?.username || "guest",
    };
  },
};
