// Credit cost table per duration (in days)
// 1 key for 24 hours (1 day) = 10 credits (strictly enforced)
export const CREDIT_RATES: Record<number, number> = {
  1: 10,       // 24 Hours / 1 Day = 10 Credits
  3: 25,       // 3 Days = 25 Credits
  7: 50,       // 7 Days (1 Week) = 50 Credits
  14: 90,      // 14 Days (2 Weeks) = 90 Credits
  30: 180,     // 30 Days (1 Month) = 180 Credits
  60: 320,     // 60 Days (2 Months) = 320 Credits
  90: 450,     // 90 Days (3 Months) = 450 Credits
  180: 800,    // 180 Days (6 Months) = 800 Credits
  365: 1500,   // 365 Days (1 Year) = 1500 Credits
  0: 3000,     // Lifetime (0 Days) = 3000 Credits
};

export function getCreditCostForDuration(days: number): number {
  if (days in CREDIT_RATES) {
    return CREDIT_RATES[days];
  }
  if (days <= 0) return CREDIT_RATES[0];
  // Linear calculation fallback based on 10 credits/day with scaling discount
  return Math.max(10, Math.round(days * 8));
}

export const CONFIG = {
  PORT: Number(process.env.PORT) || 20067,
  OWNER_USERNAME: (process.env.OWNER_USERNAME || "owner").trim(),
  OWNER_PASSWORD: (process.env.OWNER_PASSWORD || "VoidMaster#2026!Sec").trim(),
  ADMIN_USERNAME: (process.env.ADMIN_USERNAME || "admin").trim(),
  ADMIN_PASSWORD: (process.env.ADMIN_PASSWORD || "VoidAdmin#2026!Sec").trim(),
  RESELLER_USERNAME: (process.env.RESELLER_USERNAME || "reseller").trim(),
  RESELLER_PASSWORD: (process.env.RESELLER_PASSWORD || "VoidReseller#2026!Sec").trim(),
  SECURE_SALT: process.env.SECURE_SALT || "VOID_SECURE_SALT_2026",
  JWT_SECRET: process.env.JWT_SECRET || "void_secret_production_key_2026_xyz",
  SESSION_EXPIRY_MS: 1000 * 60 * 60 * 24 * 7, // 7 days
  CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  },
};
