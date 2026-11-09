export type UserRole = "owner" | "admin" | "reseller";

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  credits: number;
  status: "active" | "suspended";
  created_by: number | null;
  creator_name?: string;
  created_at: number;
  last_login?: number | null;
}

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

export interface CreditTransactionRecord {
  id: number;
  user_id: number;
  amount: number;             // Positive = added, Negative = spent
  balance_after: number;
  type: "grant" | "deduct" | "key_create" | "key_refund" | "admin_adjustment";
  description: string;
  performed_by_id: number | null;
  performed_by_name: string;
  target_user_name?: string;
  created_at: number;
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

export interface VerifyResult {
  status: "authenticated" | "invalid" | "expired" | "mismatch" | "banned" | "update_required" | "maintenance";
  message: string;
  expiresAt?: string | null;
  durationDays?: number;
  hwid?: string | null;
  boundHwid?: string | null;
  key?: string;
  announcement?: {
    title: string;
    content: string;
    severity: string;
  };
  updateUrl?: string;
}

export interface SessionData {
  token: string;
  userId: number;
  username: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
}
