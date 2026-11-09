const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:20067`;
  }
  return "http://192.168.31.116:20067";
};

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
  keys_generated?: number;
  active_keys?: number;
  bound_keys?: number;
  expired_keys?: number;
  paused_keys?: number;
  credits_spent?: number;
  receipts_count?: number;
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
  customer_name?: string;
  payment_amount?: number;
  payment_currency?: string;
  payment_method?: string;
  payment_ref?: string;
  proof_image?: string;
  receipt_id?: number | null;
}

export interface KeyReceiptInput {
  customerName?: string;
  amountPaid?: number;
  currency?: string;
  paymentMethod?: string;
  transactionRef?: string;
  proofImage?: string;
}

export interface OwnerNotificationRecord {
  id: number;
  event_type: "key_created" | "batch_created";
  creator_id: number | null;
  creator_username: string;
  creator_role: UserRole;
  quantity: number;
  duration_days: number;
  credit_cost: number;
  balance_after: number;
  max_resets: number;
  keys_list: string[];
  note: string;
  customer_name: string;
  payment_amount: number;
  payment_currency: string;
  payment_method: string;
  payment_ref: string;
  proof_image: string;
  receipt_no: string;
  is_read: boolean;
  created_at: number;
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

export interface PaymentReceiptRecord {
  id: number;
  receipt_no: string;
  user_id: number | null;
  username: string;
  customer_name: string;
  amount_paid: number;
  currency: string;
  credits_granted: number;
  keys_summary: string;
  payment_method: string;
  transaction_ref: string;
  proof_image?: string;
  key_str?: string;
  status: "paid" | "pending" | "refunded";
  note: string;
  issued_by_id: number | null;
  issued_by_name: string;
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

export interface DurationBreakdownItem {
  duration_days: number;
  count: number;
  active_count: number;
  bound_count: number;
  expired_count?: number;
  credit_cost?: number;
  total_cost?: number;
}

export interface CreatorBreakdownItem {
  id: number;
  username: string;
  role: UserRole;
  credits: number;
  status: "active" | "suspended";
  total_keys: number;
  active_keys: number;
  bound_keys: number;
  expired_keys: number;
  paused_keys: number;
  credits_spent: number;
}

export interface OverviewStats {
  totalKeys: number;
  activeKeys: number;
  boundKeys: number;
  unboundKeys?: number;
  expiredKeys: number;
  pausedKeys: number;
  revokedKeys?: number;
  totalCreditsSpentOnKeys?: number;
  generationByDuration?: DurationBreakdownItem[];
  generationByCreator?: CreatorBreakdownItem[];
  generationTimeline?: { label: string; keysCreated: number; verifications: number }[];
  totalUsers: number;
  totalResellers: number;
  totalAdmins?: number;
  totalCreditsInCirculation: number;
  totalReceipts?: number;
  totalRevenue?: number;
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

export interface UserAnalyticsResponse {
  success: boolean;
  user: UserPublicProfile;
  keys: KeyRecord[];
  durationBreakdown: DurationBreakdownItem[];
  transactions: CreditTransactionRecord[];
  receipts: PaymentReceiptRecord[];
}

/**
 * Universal Clipboard Helper — works on both HTTPS/localhost AND HTTP LAN IPs (192.168.x.x)
 * where navigator.clipboard is undefined or restricted by browser secure-context rules.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to textarea execCommand below
  }

  try {
    if (typeof document === "undefined") return false;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function formatReceiptText(r: PaymentReceiptRecord): string {
  return [
    "================================================",
    "        VOID LICENSE HUB — PAYMENT RECEIPT      ",
    "================================================",
    `Receipt No      : ${r.receipt_no}`,
    `Date Issued     : ${new Date(r.created_at).toLocaleString()}`,
    `Status          : ${r.status.toUpperCase()}`,
    "------------------------------------------------",
    `Account         : @${r.username}`,
    `Customer Name   : ${r.customer_name || r.username}`,
    `Issued By       : @${r.issued_by_name}`,
    "------------------------------------------------",
    `Item / Summary  : ${r.keys_summary}`,
    `Credits Granted : +${r.credits_granted} CR`,
    `Amount Paid     : ${r.amount_paid.toFixed(2)} ${r.currency}`,
    `Payment Method  : ${r.payment_method}`,
    `Transaction Ref : ${r.transaction_ref || "N/A"}`,
    r.note ? `Memo / Note     : ${r.note}` : null,
    "================================================",
    "   1 KEY = 1 DEVICE HARDWARE LOCK GUARANTEED    ",
    "================================================",
  ]
    .filter(Boolean)
    .join("\n");
}

export function printReceiptWindow(r: PaymentReceiptRecord) {
  if (typeof window === "undefined") return;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payment Receipt ${r.receipt_no}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #f4f1eb; color: #121313; padding: 40px 20px; margin: 0; }
  .sheet { max-width: 620px; margin: 0 auto; background: #f8f6f3; border: 1px solid rgba(90,83,75,.28); border-radius: 11px; padding: 36px; box-shadow: 0 9px 24px rgba(45,37,27,.08); }
  .eyebrow { letter-spacing: 4px; font-size: 9px; color: #74716c; text-transform: uppercase; }
  h1 { font-family: "Times New Roman", Times, serif; font-weight: 400; font-size: 36px; margin: 6px 0 4px; letter-spacing: -0.8px; }
  .sub { font-family: "Cascadia Code", Consolas, monospace; font-size: 12px; color: #243733; font-weight: bold; }
  .rule { height: 1px; background: rgba(100,92,82,.18); margin: 20px 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #74716c; margin-bottom: 4px; }
  .val { font-family: "Cascadia Code", Consolas, monospace; font-size: 13px; font-weight: 600; }
  .total-box { margin-top: 22px; padding: 18px; border-radius: 9px; background: #243733; color: #fff; display: flex; justify-content: space-between; align-items: center; }
  .total-box .amt { font-family: "Times New Roman", serif; font-size: 30px; }
  .footer { margin-top: 24px; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #74716c; text-align: center; }
  @media print { body { background: #fff; padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="sheet">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div class="eyebrow">OFFICIAL SETTLEMENT VOUCHER</div>
        <h1>Payment Receipt</h1>
        <div class="sub">${r.receipt_no}</div>
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:bold;text-transform:uppercase;background:rgba(169,220,168,.35);color:#08763e;border:1px solid rgba(46,142,65,.3);">${r.status}</span>
        <div style="font-size:11px;color:#74716c;margin-top:8px;">${new Date(r.created_at).toLocaleString()}</div>
      </div>
    </div>
    <div class="rule"></div>
    <div class="grid">
      <div>
        <div class="label">Recipient Account</div>
        <div class="val">@${r.username}</div>
      </div>
      <div>
        <div class="label">Customer / Entity</div>
        <div class="val">${r.customer_name || r.username}</div>
      </div>
      <div>
        <div class="label">Payment Method</div>
        <div class="val">${r.payment_method}</div>
      </div>
      <div>
        <div class="label">Transaction Reference</div>
        <div class="val">${r.transaction_ref || "N/A"}</div>
      </div>
      <div>
        <div class="label">Credits Allotted</div>
        <div class="val">+${r.credits_granted.toLocaleString()} CR</div>
      </div>
      <div>
        <div class="label">Authorized By</div>
        <div class="val">@${r.issued_by_name}</div>
      </div>
    </div>
    <div class="rule"></div>
    <div>
      <div class="label">Order / License Summary</div>
      <div style="font-size:13px;margin-top:4px;">${r.keys_summary}</div>
      ${r.key_str ? `<div style="font-family:monospace;font-size:12px;margin-top:6px;padding:6px 10px;background:rgba(0,0,0,.05);border-radius:6px;">Key: <strong>${r.key_str}</strong></div>` : ""}
      ${r.note ? `<div style="font-size:12px;color:#74716c;margin-top:8px;">Note: ${r.note}</div>` : ""}
    </div>
    ${
      r.proof_image
        ? `<div class="rule"></div><div><div class="label">Attached Payment Proof / Screenshot</div><img src="${r.proof_image}" alt="Payment Proof" style="max-width:100%;max-height:360px;border-radius:8px;border:1px solid rgba(90,83,75,.28);margin-top:8px;display:block;" /></div>`
        : ""
    }
    <div class="total-box">
      <div>
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;opacity:.8;">TOTAL AMOUNT SETTLED</div>
        <div style="font-size:12px;opacity:.9;margin-top:2px;">Verified Cryptographic License Settlement</div>
      </div>
      <div class="amt">${r.amount_paid.toFixed(2)} ${r.currency}</div>
    </div>
    <div class="footer">VOID LICENSE HUB · 1 KEY = 1 HARDWARE ID</div>
    <div class="no-print" style="margin-top:20px;text-align:center;">
      <button onclick="window.print()" style="padding:10px 22px;border-radius:8px;border:1px solid #243733;background:#243733;color:#fff;cursor:pointer;font-size:12px;">Print / Save as PDF</button>
    </div>
  </div>
</body>
</html>`;
  const w = window.open("", "_blank", "width=720,height=800");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
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

  async getUserDetails(id: number): Promise<UserAnalyticsResponse> {
    return this.request<UserAnalyticsResponse>(`/api/users/${id}`);
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

  async bulkUsersAction(
    action: "delete" | "suspend" | "activate" | "delete_all_resellers" | "delete_all_subordinates",
    userIds: number[] = []
  ) {
    return this.request<{ success: boolean; affected: number; message: string }>("/api/users/bulk", {
      method: "POST",
      body: JSON.stringify({ action, userIds }),
    });
  },

  async resetUserPassword(id: number, passwordPlain: string) {
    return this.request<{ success: boolean; message: string }>(`/api/users/${id}/password`, {
      method: "POST",
      body: JSON.stringify({ password: passwordPlain }),
    });
  },

  // 3. Credits & Transactions & Payment Receipts
  async getCreditRates() {
    return this.request<{ success: boolean; rates: Record<number, number>; standardRule: string }>("/api/credits/rates");
  },

  async grantCredits(targetUserId: number, amount: number, note?: string) {
    return this.request<{ success: boolean; message: string; newBalance: number }>("/api/credits/grant", {
      method: "POST",
      body: JSON.stringify({ targetUserId, amount, note }),
    });
  },

  async getCreditLedger(limit = 150, offset = 0) {
    const res = await this.request<{ success: boolean; transactions: CreditTransactionRecord[] }>(
      `/api/credits/ledger?limit=${limit}&offset=${offset}`
    );
    return res.transactions || [];
  },

  async getReceipts(): Promise<PaymentReceiptRecord[]> {
    const res = await this.request<{ success: boolean; receipts: PaymentReceiptRecord[] }>("/api/receipts");
    return res.receipts || [];
  },

  async createReceipt(payload: {
    userId?: number | null;
    username?: string;
    customerName?: string;
    amountPaid: number;
    currency?: string;
    creditsGranted?: number;
    keysSummary?: string;
    paymentMethod?: string;
    transactionRef?: string;
    proofImage?: string;
    keyStr?: string;
    status?: "paid" | "pending" | "refunded";
    note?: string;
    autoGrantCredits?: boolean;
  }) {
    return this.request<{ success: boolean; receipt: PaymentReceiptRecord }>("/api/receipts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteReceipt(id: number) {
    return this.request<{ success: boolean; message: string }>(`/api/receipts/${id}`, {
      method: "DELETE",
    });
  },

  async deleteAllReceipts() {
    return this.request<{ success: boolean; deleted: number; message: string }>("/api/receipts/all", {
      method: "DELETE",
    });
  },

  // 3b. Owner Key Creation Notifications & Dispatch Feed
  async getNotifications(limit = 100): Promise<{ notifications: OwnerNotificationRecord[]; unreadCount: number }> {
    const res = await this.request<{
      success: boolean;
      notifications: OwnerNotificationRecord[];
      unreadCount: number;
    }>(`/api/notifications?limit=${limit}`);
    return {
      notifications: res.notifications || [],
      unreadCount: res.unreadCount || 0,
    };
  },

  async markNotificationsRead(ids?: number[]) {
    return this.request<{ success: boolean; marked: number }>("/api/notifications/read", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  async clearNotifications() {
    return this.request<{ success: boolean; cleared: number; message: string }>("/api/notifications", {
      method: "DELETE",
    });
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
    params.append("limit", "5000");
    const res = await this.request<{ success: boolean; keys: KeyRecord[] }>(`/api/keys?${params.toString()}`);
    return res.keys || [];
  },

  async createKey(
    durationDays = 1,
    note = "",
    customKey?: string,
    maxResets = 3,
    receipt?: KeyReceiptInput
  ) {
    return this.request<{
      success: boolean;
      key: KeyRecord;
      receipt?: PaymentReceiptRecord;
      creditCost: number;
    }>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ durationDays, note, customKey, maxResets, receipt }),
    });
  },

  async createBatchKeys(
    count: number,
    durationDays = 1,
    prefix = "VOID",
    note = "",
    receipt?: KeyReceiptInput
  ) {
    return this.request<{
      success: boolean;
      count: number;
      totalCost: number;
      keys: KeyRecord[];
      receipt?: PaymentReceiptRecord;
    }>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ batch: true, count, durationDays, prefix, note, receipt }),
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

  async deleteAllKeys(filter: "all" | "expired" | "unbound" | "paused" = "all") {
    return this.request<{ success: boolean; affected: number; message: string }>(
      `/api/keys/all?filter=${filter}`,
      { method: "DELETE" }
    );
  },

  getExportUrl(format: "txt" | "csv" = "txt") {
    const token = this.getAuthToken();
    return `${getApiBase()}/api/keys/export?format=${format}&token=${encodeURIComponent(token || "")}`;
  },

  // 5. Stats & Telemetry
  async getStats(): Promise<OverviewStats> {
    const res = await this.request<{ success: boolean } & OverviewStats>("/api/stats");
    return res;
  },

  async getLogs(status?: string, limit = 150) {
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
  async bulkKeyAction(
    action: "pause" | "activate" | "extend" | "reset_hwid" | "delete" | "delete_all" | "delete_expired" | "delete_unbound",
    keyIds: number[] = [],
    extraDays = 30
  ) {
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
