import React, { useState, useEffect } from "react";
import {
  api,
  UserAnalyticsResponse,
  copyToClipboard,
  printReceiptWindow,
  formatReceiptText,
} from "../lib/api";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import {
  User,
  Key,
  Coins,
  ShieldCheck,
  Copy,
  Check,
  Receipt,
  Clock,
  RefreshCcw,
  Trash2,
  Printer,
  Search,
} from "lucide-react";

interface AccountInspectorModalProps {
  userId: number | null;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const AccountInspectorModal: React.FC<AccountInspectorModalProps> = ({
  userId,
  onClose,
  onDataChanged,
}) => {
  const { toast } = useToast();
  const [data, setData] = useState<UserAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<"keys" | "breakdown" | "receipts" | "ledger">("keys");
  const [keyFilter, setKeyFilter] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadAnalytics = async (id: number) => {
    setLoading(true);
    try {
      const res = await api.getUserDetails(id);
      setData(res);
    } catch (err: any) {
      toast("Failed to load account analytics", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      setSubTab("keys");
      setKeyFilter("");
      loadAnalytics(userId);
    } else {
      setData(null);
    }
  }, [userId]);

  const handleCopy = async (text: string, label = "Key") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedToken(text);
      setTimeout(() => setCopiedToken(null), 1600);
      toast(`${label} copied to clipboard`, "success", text);
    } else {
      toast(`Failed to copy ${label}`, "error");
    }
  };

  const handleResetKeyHwid = async (keyId: number) => {
    try {
      const res = await api.resetHwid(keyId);
      if (res.success && userId) {
        toast("HWID reset for key", "success");
        loadAnalytics(userId);
        onDataChanged?.();
      }
    } catch (err: any) {
      toast("Reset HWID failed", "error", err.message);
    }
  };

  const handleDeleteKey = async (keyId: number, keyStr: string) => {
    if (!confirm(`Delete key ${keyStr}?`)) return;
    try {
      await api.deleteKey(keyId);
      toast(`Deleted key ${keyStr}`, "warning");
      if (userId) loadAnalytics(userId);
      onDataChanged?.();
    } catch (err: any) {
      toast("Delete key failed", "error", err.message);
    }
  };

  const u = data?.user;
  const totalGenerated = u?.keys_generated ?? data?.keys?.length ?? 0;
  const activeCount = u?.active_keys ?? 0;
  const boundCount = u?.bound_keys ?? 0;
  const expiredCount = u?.expired_keys ?? 0;
  const creditsSpent = u?.credits_spent ?? 0;

  const filteredKeys = (data?.keys || []).filter((k) => {
    const q = keyFilter.toLowerCase();
    return (
      k.key_str.toLowerCase().includes(q) ||
      (k.hwid && k.hwid.toLowerCase().includes(q)) ||
      (k.note && k.note.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      isOpen={Boolean(userId)}
      onClose={onClose}
      title={u ? `@${u.username} — Account & Key Generation Report` : "Account Telemetry"}
      subtitle={
        u
          ? `Role: ${u.role.toUpperCase()} · Status: ${u.status.toUpperCase()} · Created by @${u.creator_name || "System"}`
          : "Loading account analytics..."
      }
      icon={<User className="w-5 h-5 text-[var(--accent)]" />}
      maxWidth="max-w-4xl"
    >
      {loading || !data || !u ? (
        <div className="py-12 text-center text-xs font-mono text-[var(--muted)]">
          Loading deep key generation telemetry for account...
        </div>
      ) : (
        <div className="space-y-5 text-xs">
          {/* Top Summary Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)]">
              <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">
                Keys Generated
              </span>
              <strong className="font-display text-2xl font-normal text-[var(--ink)] mt-0.5 block">
                {totalGenerated}
              </strong>
              <span className="text-[10px] text-emerald-500 font-mono">
                {activeCount} active
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)]">
              <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">
                Hardware Bound
              </span>
              <strong className="font-display text-2xl font-normal text-[var(--ink)] mt-0.5 block">
                {boundCount}
              </strong>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                {totalGenerated > 0 ? Math.round((boundCount / totalGenerated) * 100) : 0}% lock rate
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)]">
              <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">
                Expired / Paused
              </span>
              <strong className="font-display text-2xl font-normal text-[var(--ink)] mt-0.5 block">
                {expiredCount + (u.paused_keys || 0)}
              </strong>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                {expiredCount} exp · {u.paused_keys || 0} paused
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)]">
              <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">
                Credits Spent
              </span>
              <strong className="font-display text-2xl font-normal text-amber-500 mt-0.5 block">
                {u.role === "owner" ? "0 (Free)" : `${creditsSpent.toLocaleString()} CR`}
              </strong>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                On key minting
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)]">
              <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">
                Current Balance
              </span>
              <strong className="font-display text-2xl font-normal text-emerald-500 mt-0.5 block">
                {u.role === "owner" ? "∞" : `${u.credits.toLocaleString()} CR`}
              </strong>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                {data.receipts.length} payment receipt(s)
              </span>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
            <div className="ref-tab-list">
              <button
                type="button"
                aria-selected={subTab === "keys"}
                onClick={() => setSubTab("keys")}
                className="ref-tab-btn"
              >
                Generated Keys ({data.keys.length})
              </button>
              <button
                type="button"
                aria-selected={subTab === "breakdown"}
                onClick={() => setSubTab("breakdown")}
                className="ref-tab-btn"
              >
                Duration Analysis ({data.durationBreakdown.length})
              </button>
              <button
                type="button"
                aria-selected={subTab === "receipts"}
                onClick={() => setSubTab("receipts")}
                className="ref-tab-btn"
              >
                Payment Receipts ({data.receipts.length})
              </button>
              <button
                type="button"
                aria-selected={subTab === "ledger"}
                onClick={() => setSubTab("ledger")}
                className="ref-tab-btn"
              >
                Credit Ledger ({data.transactions.length})
              </button>
            </div>

            {subTab === "keys" && data.keys.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    filteredKeys.map((k) => k.key_str).join("\n"),
                    `All ${filteredKeys.length} keys from @${u.username}`
                  )
                }
                className="ref-btn !min-h-[30px] !px-2.5 text-[11px] font-mono"
              >
                <Copy className="w-3 h-3" />
                Copy All ({filteredKeys.length}) Keys
              </button>
            )}
          </div>

          {/* Tab 1: Generated Keys by this Account */}
          {subTab === "keys" && (
            <div className="space-y-3">
              <div className="ref-input-wrap !min-h-[34px]">
                <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
                <input
                  type="text"
                  value={keyFilter}
                  onChange={(e) => setKeyFilter(e.target.value)}
                  placeholder={`Search keys generated by @${u.username}...`}
                  className="w-full bg-transparent border-0 outline-none font-mono text-xs text-[var(--ink)]"
                />
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border-soft)] divide-y divide-[var(--line)]">
                {filteredKeys.length === 0 ? (
                  <div className="py-8 text-center text-[var(--muted)] font-mono">
                    No keys generated by @{u.username} matching filter.
                  </div>
                ) : (
                  filteredKeys.map((k) => (
                    <div
                      key={k.id}
                      className="p-3 hover:bg-[var(--surface-hover)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-[var(--ink)]">{k.key_str}</code>
                          <button
                            type="button"
                            onClick={() => handleCopy(k.key_str, "Key")}
                            className="ref-btn !min-h-[22px] !px-2 !py-0 text-[10px] font-mono"
                          >
                            {copiedToken === k.key_str ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy
                              </>
                            )}
                          </button>
                          <span
                            className={`ref-badge !h-[20px] !px-2 text-[10px] font-mono uppercase ${
                              k.status === "active"
                                ? "success"
                                : k.status === "paused"
                                ? "warning"
                                : "danger"
                            }`}
                          >
                            {k.status}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[var(--muted)]">
                          Plan: {k.duration_days === 0 ? "Lifetime" : `${k.duration_days} Days`} ({k.credit_cost} CR) ·{" "}
                          {k.hwid ? `Bound HWID: ${k.hwid}` : "Unbound (Fresh)"} · Created{" "}
                          {new Date(k.created_at).toLocaleString()}
                          {k.note ? ` · Note: ${k.note}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {k.hwid && (
                          <button
                            type="button"
                            onClick={() => handleResetKeyHwid(k.id)}
                            className="ref-btn !min-h-[26px] !px-2 text-[10px]"
                            title="Reset HWID"
                          >
                            <RefreshCcw className="w-3 h-3 text-amber-500" /> Reset HWID
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k.id, k.key_str)}
                          className="ref-btn danger !min-h-[26px] !px-2 text-[10px]"
                          title="Delete Key"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Deep Duration Breakdown */}
          {subTab === "breakdown" && (
            <div className="space-y-3">
              {data.durationBreakdown.length === 0 ? (
                <div className="py-8 text-center text-[var(--muted)] font-mono">
                  No key generation history yet for @{u.username}.
                </div>
              ) : (
                data.durationBreakdown.map((tier) => {
                  const pct = totalGenerated > 0 ? Math.round((tier.count / totalGenerated) * 100) : 0;
                  const label =
                    tier.duration_days === 0
                      ? "Lifetime License (∞)"
                      : tier.duration_days === 1
                      ? "24 Hours (1 Day)"
                      : `${tier.duration_days} Days Plan`;
                  return (
                    <div
                      key={tier.duration_days}
                      className="p-3.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] space-y-2"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-[var(--ink)]">{label}</span>
                        <span className="text-[var(--muted)]">
                          <strong className="text-[var(--ink)]">{tier.count}</strong> keys ({pct}%) ·{" "}
                          <span className="text-emerald-500">{tier.active_count} active</span> ·{" "}
                          <span className="text-sky-400">{tier.bound_count} bound</span> ·{" "}
                          <span className="text-amber-500">{tier.total_cost || 0} CR</span>
                        </span>
                      </div>
                      <div className="ref-linear-progress">
                        <span style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: Payment Receipts */}
          {subTab === "receipts" && (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border-soft)] divide-y divide-[var(--line)]">
              {data.receipts.length === 0 ? (
                <div className="py-8 text-center text-[var(--muted)] font-mono">
                  No payment receipts recorded for @{u.username}.
                </div>
              ) : (
                data.receipts.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--surface-hover)]"
                  >
                    <div className="font-mono">
                      <div className="flex items-center gap-2">
                        <strong className="text-[var(--ink)]">{r.receipt_no}</strong>
                        <span className="ref-badge success !h-[20px] !px-2 text-[10px]">
                          {r.amount_paid.toFixed(2)} {r.currency}
                        </span>
                        <span className="text-amber-500 font-bold">+{r.credits_granted} CR</span>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">
                        {r.keys_summary} · {r.payment_method} ({r.transaction_ref}) ·{" "}
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(formatReceiptText(r), "Receipt")}
                        className="ref-btn !min-h-[26px] !px-2.5 text-[10px] font-mono"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => printReceiptWindow(r)}
                        className="ref-btn primary !min-h-[26px] !px-2.5 text-[10px] font-mono"
                      >
                        <Printer className="w-3 h-3" /> Print / PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Credit Ledger */}
          {subTab === "ledger" && (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border-soft)] divide-y divide-[var(--line)] font-mono">
              {data.transactions.length === 0 ? (
                <div className="py-8 text-center text-[var(--muted)]">
                  No credit transactions recorded for @{u.username}.
                </div>
              ) : (
                data.transactions.map((tx) => (
                  <div key={tx.id} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span
                        className={`font-bold mr-2 ${
                          tx.amount > 0 ? "text-emerald-500" : "text-rose-400"
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} CR
                      </span>
                      <span className="text-[var(--ink)]">{tx.description}</span>
                      <div className="text-[10px] text-[var(--muted)]">
                        Balance after: {tx.balance_after} CR · By @{tx.performed_by_name} ·{" "}
                        {new Date(tx.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span className="ref-badge !h-[22px] text-[10px] uppercase">{tx.type}</span>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--line)]">
            <button type="button" onClick={onClose} className="ref-btn !px-5">
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
