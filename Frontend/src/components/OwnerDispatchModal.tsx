import React, { useState } from "react";
import {
  OwnerNotificationRecord,
  api,
  copyToClipboard,
  printReceiptWindow,
} from "../lib/api";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import {
  Bell,
  Copy,
  Check,
  Receipt,
  CheckCheck,
  Trash2,
  Key,
  User,
  Image as ImageIcon,
  Printer,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface OwnerDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: OwnerNotificationRecord[];
  unreadCount: number;
  onRefresh: () => void;
  onInspectUser?: (userId: number) => void;
  canClear?: boolean;
}

export const OwnerDispatchModal: React.FC<OwnerDispatchModalProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onRefresh,
  onInspectUser,
  canClear = false,
}) => {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | "reseller" | "admin" | "owner">("all");

  const handleCopy = async (text: string, label = "Key") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 1600);
      toast(`${label} copied`, "success", text.slice(0, 64));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      onRefresh();
      toast("All key creation alerts marked as read", "info");
    } catch (err: any) {
      toast("Failed to mark read", "error", err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all key creation dispatch logs?")) return;
    try {
      await api.clearNotifications();
      onRefresh();
      toast("Dispatch feed cleared", "warning");
    } catch (err: any) {
      toast("Failed to clear feed", "error", err.message);
    }
  };

  const formatDispatchReport = (n: OwnerNotificationRecord) => {
    const dur = n.duration_days === 0 ? "Lifetime" : `${n.duration_days} Days`;
    return [
      "=== VOID KEY CREATION DISPATCH ===",
      `Created By      : @${n.creator_username} (${n.creator_role.toUpperCase()})`,
      `Timestamp       : ${new Date(n.created_at).toLocaleString()}`,
      `Quantity        : ${n.quantity} Key(s)`,
      `Duration        : ${dur}`,
      `Credits Charged : ${n.credit_cost} CR (Balance After: ${n.balance_after} CR)`,
      n.customer_name ? `Customer        : ${n.customer_name}` : null,
      n.payment_amount > 0
        ? `Payment Receipt : ${n.payment_amount.toFixed(2)} ${n.payment_currency} via ${n.payment_method || "Direct"} (Ref: ${n.payment_ref || "N/A"})`
        : null,
      n.receipt_no ? `Receipt No      : ${n.receipt_no}` : null,
      n.note ? `Note            : ${n.note}` : null,
      `Key(s)          : ${n.keys_list.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const filtered = notifications.filter((n) =>
    roleFilter === "all" ? true : n.creator_role === roleFilter
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Owner Key Creation & Receipt Dispatch Feed"
        subtitle="Real-time intelligence whenever any Reseller, Admin, or Owner mints license keys"
        eyebrow="LIVE TELEMETRY & PAYMENT PROOF"
        icon={<Bell className="w-4 h-4" />}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          {/* Top Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
            <div className="ref-tab-list">
              {(["all", "reseller", "admin", "owner"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-selected={roleFilter === r}
                  onClick={() => setRoleFilter(r)}
                  className="ref-tab-btn uppercase font-mono !text-[10.5px]"
                >
                  {r === "all" ? `All (${notifications.length})` : r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="ref-btn !min-h-[30px] text-[11px]">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Mark All Read ({unreadCount})</span>
                </button>
              )}
              {canClear && notifications.length > 0 && (
                <button onClick={handleClearAll} className="ref-btn danger !min-h-[30px] text-[11px]">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Feed</span>
                </button>
              )}
            </div>
          </div>

          {/* Dispatch List */}
          <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="ref-card p-10 text-center text-[var(--muted)] font-mono">
                No key creation dispatches recorded yet. Whenever anyone mints a key, full telemetry and payment proof appear here automatically.
              </div>
            ) : (
              filtered.map((n) => {
                const durLabel = n.duration_days === 0 ? "Lifetime (∞)" : `${n.duration_days} Days`;
                const hasReceipt =
                  n.payment_amount > 0 ||
                  Boolean(n.proof_image) ||
                  Boolean(n.payment_method) ||
                  Boolean(n.payment_ref);

                return (
                  <div
                    key={n.id}
                    className={`ref-card p-4 space-y-3 transition-all ${
                      !n.is_read ? "border-[var(--accent)] bg-[var(--selection)]" : ""
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {!n.is_read && (
                          <span className="ref-badge info !h-[20px] !text-[10px]">
                            <span className="dot" /> NEW
                          </span>
                        )}
                        <span
                          className={`ref-badge !h-[20px] uppercase !text-[10px] ${
                            n.creator_role === "owner"
                              ? "warning"
                              : n.creator_role === "admin"
                              ? "info"
                              : "success"
                          }`}
                        >
                          {n.creator_role}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (n.creator_id && onInspectUser) {
                              onClose();
                              onInspectUser(n.creator_id);
                            }
                          }}
                          className="font-mono font-semibold text-sm text-[var(--ink)] hover:text-[var(--accent)] flex items-center gap-1 cursor-pointer"
                          title="Inspect creator account"
                        >
                          <User className="w-3.5 h-3.5 text-[var(--muted)]" />@{n.creator_username}
                        </button>
                        <span className="text-[var(--muted)]">
                          generated{" "}
                          <strong className="text-[var(--ink)] font-mono">
                            {n.quantity}x {durLabel}
                          </strong>{" "}
                          {n.quantity === 1 ? "license key" : "batch keys"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--muted)]">
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(formatDispatchReport(n), "Full Dispatch Report")}
                          className="ref-btn !min-h-[26px] !px-2.5 text-[10.5px]"
                          title="Copy full key creation dispatch report"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Info</span>
                        </button>
                      </div>
                    </div>

                    {/* Key Telemetry & Billing Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-md bg-[var(--surface)] border border-[var(--border-soft)] font-mono text-[11px]">
                      <div>
                        <span className="text-[10px] uppercase text-[var(--muted)] block">
                          Duration Tier
                        </span>
                        <strong className="text-[var(--ink)]">{durLabel}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[var(--muted)] block">
                          Credits Charged
                        </span>
                        <strong className="text-amber-500">
                          {n.credit_cost === 0 ? "0 CR (Owner)" : `-${n.credit_cost} CR`}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[var(--muted)] block">
                          Creator Balance After
                        </span>
                        <strong className="text-[var(--ink)]">
                          {n.creator_role === "owner" ? "∞ Unlimited" : `${n.balance_after} CR`}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[var(--muted)] block">
                          Customer / Note
                        </span>
                        <strong className="text-[var(--ink)] truncate block">
                          {n.customer_name || n.note || "—"}
                        </strong>
                      </div>
                    </div>

                    {/* Payment Receipt & Proof Section (if attached) */}
                    {hasReceipt && (
                      <div className="p-3 rounded-md border border-[var(--success-border)] bg-[var(--success-fill)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-semibold text-[var(--success)]">
                              <Receipt className="w-3.5 h-3.5" />
                              Payment Receipt Attached
                            </span>
                            {n.receipt_no && (
                              <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-soft)] text-[10px] text-[var(--ink)]">
                                {n.receipt_no}
                              </span>
                            )}
                          </div>
                          <div className="text-[var(--ink)] flex flex-wrap gap-x-4 gap-y-1">
                            {n.payment_amount > 0 && (
                              <span>
                                Amount:{" "}
                                <strong>
                                  {n.payment_amount.toFixed(2)} {n.payment_currency}
                                </strong>
                              </span>
                            )}
                            {n.payment_method && (
                              <span>
                                Method: <strong>{n.payment_method}</strong>
                              </span>
                            )}
                            {n.payment_ref && (
                              <span>
                                Ref/UTR: <strong>{n.payment_ref}</strong>
                              </span>
                            )}
                            {n.customer_name && (
                              <span>
                                Buyer: <strong>{n.customer_name}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {n.proof_image && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(n.proof_image)}
                              className="ref-btn !min-h-[28px] !px-2.5 text-[11px]"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                              <span>View Proof Image</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              printReceiptWindow({
                                id: n.id,
                                receipt_no: n.receipt_no || `VOID-KEY-${n.id}`,
                                user_id: n.creator_id,
                                username: n.creator_username,
                                customer_name: n.customer_name || n.note || "Direct Buyer",
                                amount_paid: n.payment_amount,
                                currency: n.payment_currency || "USD",
                                credits_granted: n.credit_cost,
                                keys_summary: `${n.quantity}x ${durLabel} Key (${n.keys_list.slice(0, 2).join(", ")})`,
                                payment_method: n.payment_method || "Direct",
                                transaction_ref: n.payment_ref || "N/A",
                                proof_image: n.proof_image,
                                key_str: n.keys_list.join(", "),
                                status: "paid",
                                note: n.note,
                                issued_by_id: n.creator_id,
                                issued_by_name: n.creator_username,
                                created_at: n.created_at,
                              })
                            }
                            className="ref-btn !min-h-[28px] !px-2.5 text-[11px]"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Receipt</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Generated Keys List */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-[var(--muted)]">
                          Minted Key String(s) ({n.keys_list.length})
                        </span>
                        {n.keys_list.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(n.keys_list.join("\n"), `All ${n.keys_list.length} Keys`)
                            }
                            className="text-[10.5px] font-mono text-[var(--accent)] hover:underline cursor-pointer"
                          >
                            Copy All {n.keys_list.length} Keys
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {n.keys_list.slice(0, 12).map((kStr) => (
                          <button
                            key={kStr}
                            type="button"
                            onClick={() => handleCopy(kStr, "License Key")}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-soft)] font-mono text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-colors"
                            title="Click to copy key"
                          >
                            <Key className="w-3 h-3 text-[var(--accent)]" />
                            <span>{kStr}</span>
                            {copiedKey === kStr ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-[var(--muted)]" />
                            )}
                          </button>
                        ))}
                        {n.keys_list.length > 12 && (
                          <span className="px-2 py-1 text-[11px] font-mono text-[var(--muted)]">
                            +{n.keys_list.length - 12} more keys
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Payment Proof Screenshot Preview */}
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Payment Receipt Proof Screenshot"
        subtitle="Attached proof of payment submitted during license key generation"
        icon={<ImageIcon className="w-4 h-4" />}
        maxWidth="max-w-2xl"
      >
        {previewImage && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 flex items-center justify-center overflow-hidden">
              <img
                src={previewImage}
                alt="Payment Receipt Proof"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={previewImage}
                download={`payment-proof-${Date.now()}.png`}
                className="ref-btn primary"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Download Image</span>
              </a>
              <button onClick={() => setPreviewImage(null)} className="ref-btn">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
