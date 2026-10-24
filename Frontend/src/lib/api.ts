const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:20067`;
  }
  return "http://192.168.31.116:20067";
};

const API_BASE = getApiBase();

export type UserRole = "owner" | "admin" | "reseller";

export interface UserPublicProfile {
  id: number;
  username: string;
  role: UserRole;
  credits: number;
  status: "active" | "suspended";
  created_by: number | null;
  creator_name?: string;
  created_at: number;
  last_login?: number | null;
}

export interface KeyRecord {
  id: number;
  key_str: string;
  status: "active" | "paused" | "expired" | "revoked";
  duration_days: number;
  credit_cost: number;
  hwid: string | null;
  bound_at: number | null;
  expires_at: number | null;
  created_at: number;
  note: string;
  max_resets: number;
  reset_count: number;
  created_by_id: number | null;
  created_by_name: string;
}

export interface CreditTransactionRecord {
  id: number;
  user_id: number;
  amount: number;
  balance_after: number;
  type: "grant" | "deduct" | "key_create" | "key_refund" | "admin_adjustment";
  description: string;
  performed_by_id: number | null;
  performed_by_name: string;
  target_user_name?: string;
  created_at: number;
}

export interface BanRecord {
  id: number;
  type: "hwid" | "ip";
  value: string;
  reason: string;
  banned_by: string;
  created_at: number;
}

export interface AnnouncementRecord {
  id: number;
  title: string;
  content: string;
  severity: "info" | "warning" | "critical";
  is_active: number;
  created_at: number;
}

export interface VoucherRecord {
  id: number;
  code: string;
  credits: number;
  max_uses: number;
  used_count: number;
  expires_at: number | null;
  created_by: string;
  created_at: number;
}

export interface AppSettings {
  current_version: string;
  min_version: string;
  download_url: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  discord_webhook_url: string;
}

export interface OverviewStats {
  totalKeys: number;
  activeKeys: number;
  boundKeys: number;
  expiredKeys: number;
  pausedKeys: number;
  totalUsers: number;
  totalResellers: number;
  totalCreditsInCirculation: number;
  userCredits: number;
  totalVerifications: number;
  past24hVerifications: number;
  verifications24h?: number;
  success24h?: number;
  successRate: number;
  role: UserRole;
  username: string;
  recentLogs?: LogRecord[];
}

export interface LogRecord {
  id: number;
  key_str: string;
  hwid: string | null;
  ip: string;
  status: "authenticated" | "invalid" | "expired" | "mismatch" | "error";
  message: string;
  timestamp: number;
}

export const api = {
  getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("void_auth_token") || localStorage.getItem("void_admin_token");
  },

  setAuthToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("void_auth_token", token);
    }
  },

  clearAuthToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("void_auth_token");
      localStorage.removeItem("void_admin_token");
      localStorage.removeItem("void_user_profile");
    }
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${getApiBase()}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed with status ${res.status}`);
    }

    return res.json();
  },

  // 1. Authentication
  async login(username: string, password: string) {
    const data = await this.request<{ success: boolean; token: string; user: UserPublicProfile }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      this.setAuthToken(data.token);
      if (typeof window !== "undefined") {
        localStorage.setItem("void_user_profile", JSON.stringify(data.user));
      }
    }
    return data;
  },

  async logout() {
    try {
      await this.request("/api/auth/logout", { method: "POST" });
    } finally {
      this.clearAuthToken();
    }
  },

  async getMe(): Promise<{ success: boolean; user: UserPublicProfile }> {
    return this.request<{ success: boolean; user: UserPublicProfile }>("/api/auth/me");
  },

  // 2. Users & Resellers Management (Owner > Admin > Reseller)
  async getUsers(): Promise<UserPublicProfile[]> {
    const res = await this.request<{ success: boolean; users: UserPublicProfile[] }>("/api/users");
    return res.users || [];
  },

  async createUser(username: string, passwordPlain: string, role: UserRole, initialCredits = 0) {
    return this.request<{ success: boolean; user: UserPublicProfile }>("/api/users", {
      method: "POST",
      body: JSON.stringify({ username, password: passwordPlain, role, initialCredits }),
    });
  },

  async updateUserStatus(id: number, status: "active" | "suspended") {
    return this.request<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async deleteUser(id: number) {
    return this.request<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  async resetUserPassword(id: number, passwordPlain: string) {
    return this.request<{ success: boolean; message: string }>(`/api/users/${id}/password`, {
      method: "POST",
      body: JSON.stringify({ password: passwordPlain }),
    });
  },

  // 3. Credits & Transactions
  async getCreditRates() {
    return this.request<{ success: boolean; rates: Record<number, number>; standardRule: string }>("/api/credits/rates");
  },

  async grantCredits(targetUserId: number, amount: number, note?: string) {
    return this.request<{ success: boolean; message: string; newBalance: number }>("/api/credits/grant", {
      method: "POST",
      body: JSON.stringify({ targetUserId, amount, note }),
    });
  },

  async getCreditLedger(limit = 100, offset = 0) {
    const res = await this.request<{ success: boolean; transactions: CreditTransactionRecord[] }>(
      `/api/credits/ledger?limit=${limit}&offset=${offset}`
    );
    return res.transactions || [];
  },

  async calculateCreditCost(days: number, count = 1) {
    return this.request<{
      success: boolean;
      durationDays: number;
      unitCost: number;
      count: number;
      totalCost: number;
    }>(`/api/credits/calculate?days=${days}&count=${count}`);
  },

  // 4. Keys Management
  async getKeys(search?: string, status?: string) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status && status !== "all") params.append("status", status);
    const res = await this.request<{ success: boolean; keys: KeyRecord[] }>(`/api/keys?${params.toString()}`);
    return res.keys || [];
  },

  async createKey(durationDays = 1, note = "", customKey?: string, maxResets = 3) {
    return this.request<{ success: boolean; key: KeyRecord; creditCost: number }>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ durationDays, note, customKey, maxResets }),
    });
  },

  async createBatchKeys(count: number, durationDays = 1, prefix = "VOID", note = "") {
    return this.request<{ success: boolean; count: number; totalCost: number; keys: KeyRecord[] }>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ batch: true, count, durationDays, prefix, note }),
    });
  },

  async updateKeyStatus(id: number, status: "active" | "paused" | "expired" | "revoked") {
    return this.request<{ success: boolean; key: KeyRecord }>(`/api/keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async extendKeyDuration(id: number, additionalDays: number) {
    return this.request<{ success: boolean; key: KeyRecord }>(`/api/keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ additionalDays }),
    });
  },

  async extendKey(id: number, additionalDays: number) {
    return this.extendKeyDuration(id, additionalDays);
  },

  async resetHwid(id: number) {
    return this.request<{ success: boolean; message: string; resetsLeft: number }>(`/api/keys/${id}/reset-hwid`, {
      method: "POST",
    });
  },

  async deleteKey(id: number) {
    return this.request<{ success: boolean }>(`/api/keys/${id}`, {
      method: "DELETE",
    });
  },

  getExportUrl(format: "txt" | "csv" = "txt") {
    const token = this.getAuthToken();
    return `${getApiBase()}/api/keys/export?format=${format}&token=${token || ""}`;
  },

  // 5. Stats & Telemetry
  async getStats(): Promise<OverviewStats> {
    const res = await this.request<{ success: boolean } & OverviewStats>("/api/stats");
    return res;
  },

  async getLogs(status?: string, limit = 100) {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    params.append("limit", String(limit));
    const res = await this.request<{ success: boolean; logs: LogRecord[] }>(`/api/logs?${params.toString()}`);
    return res.logs || [];
  },

  async clearLogs() {
    return this.request<{ success: boolean; message: string }>("/api/logs", {
      method: "DELETE",
    });
  },

  // 7. Security Blacklist / Device Bans
  async getBans(): Promise<BanRecord[]> {
    const res = await this.request<{ success: boolean; bans: BanRecord[] }>("/api/bans");
    return res.bans || [];
  },

  async addBan(type: "hwid" | "ip", value: string, reason: string) {
    return this.request<{ success: boolean; ban: BanRecord }>("/api/bans", {
      method: "POST",
      body: JSON.stringify({ type, value, reason }),
    });
  },

  async removeBan(id: number) {
    return this.request<{ success: boolean }>(`/api/bans/${id}`, {
      method: "DELETE",
    });
  },

  // 8. In-Game Broadcasts & Live Announcements
  async getAnnouncements(): Promise<AnnouncementRecord[]> {
    const res = await this.request<{ success: boolean; announcements: AnnouncementRecord[] }>("/api/announcements");
    return res.announcements || [];
  },

  async createAnnouncement(title: string, content: string, severity: "info" | "warning" | "critical" = "info") {
    return this.request<{ success: boolean; announcement: AnnouncementRecord }>("/api/announcements", {
      method: "POST",
      body: JSON.stringify({ title, content, severity }),
    });
  },

  async toggleAnnouncement(id: number) {
    return this.request<{ success: boolean }>(`/api/announcements/${id}/toggle`, {
      method: "PATCH",
    });
  },

  async deleteAnnouncement(id: number) {
    return this.request<{ success: boolean }>(`/api/announcements/${id}`, {
      method: "DELETE",
    });
  },

  // 9. Credit Gift Vouchers & Redeem Codes
  async getVouchers(): Promise<VoucherRecord[]> {
    const res = await this.request<{ success: boolean; vouchers: VoucherRecord[] }>("/api/vouchers");
    return res.vouchers || [];
  },

  async createVoucher(code: string, credits: number, maxUses = 1, expiresAt?: number) {
    return this.request<{ success: boolean; voucher: VoucherRecord }>("/api/vouchers", {
      method: "POST",
      body: JSON.stringify({ code, credits, maxUses, expiresAt }),
    });
  },

  async redeemVoucher(code: string) {
    return this.request<{ success: boolean; message: string; creditsAdded: number; newBalance: number }>("/api/vouchers/redeem", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  async deleteVoucher(id: number) {
    return this.request<{ success: boolean }>(`/api/vouchers/${id}`, {
      method: "DELETE",
    });
  },

  // 10. Platform Settings & Webhooks
  async getSettings(): Promise<AppSettings> {
    const res = await this.request<{ success: boolean; settings: AppSettings }>("/api/settings");
    return res.settings;
  },

  async updateSettings(settings: Partial<AppSettings>) {
    return this.request<{ success: boolean; settings: AppSettings }>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  },

  async testDiscordWebhook() {
    return this.request<{ success: boolean; message: string }>("/api/settings/test-webhook", {
      method: "POST",
    });
  },

  // 11. Bulk Key Operations
  async bulkKeyAction(action: "pause" | "activate" | "extend" | "reset_hwid" | "delete", keyIds: number[], extraDays = 30) {
    return this.request<{ success: boolean; affected: number; message: string }>("/api/keys/bulk", {
      method: "POST",
      body: JSON.stringify({ action, keyIds, extraDays }),
    });
  },

  // 12. Direct C++ Socket Verification Simulator Handshake
  async verifyClient(key: string, hwid: string, timestamp?: number, hash?: string) {
    const res = await fetch(`${getApiBase()}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, hwid, timestamp, hash }),
    });
    return res.json();
  },

  async simulateVerify(key: string, hwid: string, timestamp?: number, hash?: string) {
    return this.verifyClient(key, hwid, timestamp, hash);
  },
};
