import React, { useState } from "react";
import { OverviewStats, OwnerNotificationRecord, copyToClipboard } from "../../lib/api";
import { ProgressRing } from "../ProgressRing";
import { useAuth } from "../../context/AuthContext";
import {
  Plus,
  Sparkles,
  RefreshCw,
  Coins,
  ArrowRight,
  Copy,
  Check,
  Receipt,
  Users,
  Bell,
  Key,
} from "lucide-react";
import { useToast } from "../Toast";

interface DashboardViewProps {
  stats: OverviewStats | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateKey: () => void;
  onOpenBatch: () => void;
  onNavigateTab: (tab: string) => void;
  onInspectUser?: (userId: number) => void;
  notifications?: OwnerNotificationRecord[];
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onRefresh,
  onOpenCreateKey,
  onOpenBatch,
  onNavigateTab,
  onInspectUser,
  notifications = [],
  unreadNotifications = 0,
  onOpenNotifications,
}) => {
  const { role, credits } = useAuth();
  const { toast } = useToast();
  const [copiedStr, setCopiedStr] = useState<string | null>(null);

  const totalKeys = stats?.totalKeys ?? 0;
  const activeKeys = stats?.activeKeys ?? 0;
  const boundKeys = stats?.boundKeys ?? 0;
  const unboundKeys = stats?.unboundKeys ?? Math.max(0, totalKeys - boundKeys);
  const expiredKeys = stats?.expiredKeys ?? 0;
  const pausedKeys = stats?.pausedKeys ?? 0;
  const verifications24h = stats?.past24hVerifications ?? stats?.verifications24h ?? 0;
  const successRate = stats?.successRate ?? 100;
  const success24h = stats?.success24h ?? Math.round((verifications24h * successRate) / 100);
  const activePercent = totalKeys > 0 ? (activeKeys / totalKeys) * 100 : 0;
  const boundPercent = totalKeys > 0 ? (boundKeys / totalKeys) * 100 : 0;

  const durationTiers = stats?.generationByDuration || [];
  const creatorRows = stats?.generationByCreator || [];
  const timeline = stats?.generationTimeline || [];

  const handleQuickCopy = async (text: string, label = "Key") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedStr(text);
      setTimeout(() => setCopiedStr(null), 1500);
      toast(`${label} copied to clipboard`, "success", text);
    } else {
      toast("Clipboard copy failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Command Bar */}
      <div className="ref-panel p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="ref-eyebrow !mb-0">TELEMETRY &amp; LICENSE COMMAND</span>
              <span className="ref-badge success !h-[20px] text-[10px]">
                <span className="dot" />
                GATEWAY ONLINE
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
              Void Licensing Operations
            </h1>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              1 Key = 1 Android Device Hardware Lock. Every key minted by any account is logged with payment receipt proof and dispatched directly to Owner telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onOpenCreateKey} className="ref-btn primary !min-h-[38px] !px-4">
              <Plus className="w-4 h-4" />
              <span>Mint Key + Receipt</span>
            </button>
            <button onClick={onOpenBatch} className="ref-btn !min-h-[38px] !px-3.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Batch Mint</span>
            </button>
            {onOpenNotifications && (
              <button onClick={onOpenNotifications} className="ref-btn !min-h-[38px] !px-3.5">
                <Bell className="w-4 h-4 text-[var(--accent)]" />
                <span>Owner Key Feed</span>
                {unreadNotifications > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => onNavigateTab("credits")}
              className="ref-btn !min-h-[38px] !px-3.5"
            >
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>Payment Receipts</span>
            </button>
            <button
              onClick={onRefresh}
              className="ref-btn !min-h-[38px] !px-3"
              title="Refresh live telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Section 01: Core Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab("keys")}
          className="ref-panel p-5 flex items-center justify-between cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <div>
            <span className="text-[10.5px] uppercase tracking-wider text-[var(--muted)] font-mono font-semibold">
              01 · Total Licenses
            </span>
            <div className="font-mono text-3xl font-bold text-[var(--ink)] mt-1.5 tabular-nums">
              {totalKeys}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1 font-mono">
              <span className="text-emerald-500 font-semibold">{activeKeys} active</span> · {pausedKeys} paused · {expiredKeys} exp
            </div>
          </div>
          <ProgressRing value={activePercent} size={58} label="Active" />
        </div>

        <div
          onClick={() => onNavigateTab("keys")}
          className="ref-panel p-5 flex items-center justify-between cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <div>
            <span className="text-[10.5px] uppercase tracking-wider text-[var(--muted)] font-mono font-semibold">
              02 · 1-Device HWID Lock
            </span>
            <div className="font-mono text-3xl font-bold text-[var(--ink)] mt-1.5 tabular-nums">
              {boundKeys}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1 font-mono">
              <span className="text-sky-400 font-semibold">{boundKeys} locked</span> · {unboundKeys} fresh
            </div>
          </div>
          <ProgressRing value={boundPercent} size={58} label="Bound" />
        </div>

        <div
          onClick={() => onNavigateTab("credits")}
          className="ref-panel p-5 flex items-center justify-between cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <div>
            <span className="text-[10.5px] uppercase tracking-wider text-[var(--muted)] font-mono font-semibold">
              03 · Credits &amp; Receipts
            </span>
            <div className="font-mono text-3xl font-bold text-amber-500 mt-1.5 tabular-nums">
              {role === "owner" ? "∞" : credits.toLocaleString()}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1 font-mono">
              {stats?.totalReceipts ?? 0} receipts · ${(stats?.totalRevenue ?? 0).toFixed(2)} settled
            </div>
          </div>
          <div className="w-11 h-11 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-hover)] flex items-center justify-center text-amber-500">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("audit")}
          className="ref-panel p-5 flex items-center justify-between cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <div>
            <span className="text-[10.5px] uppercase tracking-wider text-[var(--muted)] font-mono font-semibold">
              04 · 24H Handshakes
            </span>
            <div className="font-mono text-3xl font-bold text-[var(--ink)] mt-1.5 tabular-nums">
              {verifications24h}
            </div>
            <div className="text-[11px] text-emerald-500 mt-1 font-mono">
              {success24h} authenticated ({successRate}%)
            </div>
          </div>
          <ProgressRing value={successRate} size={58} label="Pass" />
        </div>
      </div>

      {/* Live Owner Key Creation & Receipt Dispatch Feed */}
      <div className="ref-panel p-6">
        <div className="ref-section-head">
          <div className="flex items-start gap-3">
            <span className="ref-section-number">02</span>
            <div>
              <div className="ref-eyebrow">Real-Time Owner Intelligence</div>
              <h2>Live Key Creation &amp; Payment Receipt Dispatches</h2>
            </div>
          </div>
          {onOpenNotifications && (
            <button onClick={onOpenNotifications} className="ref-btn !min-h-[32px] text-xs">
              <Bell className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Open Full Dispatch Feed ({notifications.length})</span>
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="ref-card p-6 text-center text-xs font-mono text-[var(--muted)]">
            No key creation dispatches yet. Whenever any Reseller, Admin, or Owner creates a key, full telemetry and payment proof appear here automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notifications.slice(0, 4).map((n) => {
              const durLabel = n.duration_days === 0 ? "Lifetime" : `${n.duration_days}D`;
              const firstKey = n.keys_list[0] || "";
              return (
                <div
                  key={n.id}
                  className="ref-card p-3.5 flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`ref-badge !h-[19px] !px-2 uppercase !text-[9.5px] ${
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
                        onClick={() => n.creator_id && onInspectUser?.(n.creator_id)}
                        className="font-mono font-semibold text-xs text-[var(--ink)] hover:text-[var(--accent)] truncate cursor-pointer"
                      >
                        @{n.creator_username}
                      </button>
                      <span className="text-[11px] text-[var(--muted)] font-mono">
                        minted <strong>{n.quantity}x {durLabel}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">
                      {new Date(n.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2 rounded bg-[var(--surface-hover)] border border-[var(--border-soft)] font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Key className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      <span className="font-semibold text-[var(--ink)] truncate">{firstKey}</span>
                      {n.keys_list.length > 1 && (
                        <span className="text-[10px] text-[var(--muted)]">
                          +{n.keys_list.length - 1} more
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickCopy(n.keys_list.join("\n"), "Key(s)")}
                      className="ref-btn !min-h-[24px] !px-2 text-[10px] shrink-0"
                    >
                      {copiedStr === n.keys_list.join("\n") ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono text-[var(--muted)]">
                    <span>
                      Cost: <strong className="text-amber-500">{n.credit_cost} CR</strong> · Bal:{" "}
                      <strong className="text-[var(--ink)]">
                        {n.creator_role === "owner" ? "∞" : `${n.balance_after} CR`}
                      </strong>
                    </span>
                    {n.payment_amount > 0 || n.proof_image ? (
                      <button
                        type="button"
                        onClick={onOpenNotifications}
                        className="inline-flex items-center gap-1 text-[var(--success)] font-semibold hover:underline cursor-pointer"
                      >
                        <Receipt className="w-3 h-3" />
                        <span>
                          Receipt: {n.payment_amount.toFixed(2)} {n.payment_currency}
                          {n.proof_image ? " + Proof" : ""}
                        </span>
                      </button>
                    ) : (
                      <span>{n.customer_name || n.note || "No memo"}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 03 & 04: Deep Analysis of Key Generation (Duration Tiers + Account Leaderboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Key Generation Breakdown by Duration Tier & 7-Day Velocity */}
        <div className="lg:col-span-6 ref-panel p-6 space-y-4">
          <div className="ref-section-head">
            <div className="flex items-start gap-3">
              <span className="ref-section-number">03</span>
              <div>
                <div className="ref-eyebrow">Tier Telemetry</div>
                <h2>Key Generation Analysis by Duration</h2>
              </div>
            </div>
            <span className="ref-badge font-mono text-[10px]">
              {stats?.totalCreditsSpentOnKeys?.toLocaleString() || 0} CR Volume
            </span>
          </div>

          <div className="space-y-2.5">
            {durationTiers.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--muted)]">
                No keys generated yet. Click "Mint Key" to create your first license.
              </div>
            ) : (
              durationTiers.map((tier) => {
                const pct = totalKeys > 0 ? Math.round((tier.count / totalKeys) * 100) : 0;
                const tierLabel =
                  tier.duration_days === 0
                    ? "Lifetime Unlimited (∞)"
                    : tier.duration_days === 1
                    ? "24 Hours (1 Day)"
                    : `${tier.duration_days} Days Subscription`;

                return (
                  <div
                    key={tier.duration_days}
                    className="ref-card p-3.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <span className="font-semibold text-[var(--ink)]">{tierLabel}</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="ref-badge !h-[20px] !px-2 font-bold">
                          {tier.count} keys ({pct}%)
                        </span>
                        <span className="text-emerald-500">{tier.active_count} active</span>
                        <span className="text-sky-400">{tier.bound_count} bound</span>
                        <span className="text-amber-500">{tier.credit_cost || 0} CR</span>
                      </div>
                    </div>
                    <div className="ref-linear-progress">
                      <span style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 7-Day Generation & Handshake Timeline */}
          {timeline.length > 0 && (
            <div className="pt-4 border-t border-[var(--line)]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                  7-Day Minting &amp; Verification Velocity
                </span>
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  Minted vs Handshakes
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {timeline.map((d) => (
                  <div
                    key={d.label}
                    className="p-2 rounded border border-[var(--border-soft)] bg-[var(--surface)] text-center font-mono"
                  >
                    <div className="text-[9px] text-[var(--muted)]">{d.label}</div>
                    <div className="text-sm font-bold text-[var(--ink)] mt-0.5 tabular-nums">
                      {d.keysCreated}
                    </div>
                    <div className="text-[9px] text-emerald-500">+{d.verifications}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 6 cols: Per-Account Key Generation Breakdown (Click any account to inspect!) */}
        <div className="lg:col-span-6 ref-panel p-6 space-y-4">
          <div className="ref-section-head">
            <div className="flex items-start gap-3">
              <span className="ref-section-number">04</span>
              <div>
                <div className="ref-eyebrow">Account Attribution</div>
                <h2>Keys Generated by Account</h2>
              </div>
            </div>
            {(role === "owner" || role === "admin") && (
              <button
                onClick={() => onNavigateTab("users")}
                className="ref-btn !min-h-[30px] !px-2.5 text-xs shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Manage Accounts</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {creatorRows.map((c) => {
              const sharePct = totalKeys > 0 ? Math.round((c.total_keys / totalKeys) * 100) : 0;
              return (
                <div
                  key={c.id}
                  onClick={() => onInspectUser?.(c.id)}
                  className="ref-card p-3.5 hover:border-[var(--accent)] transition-all cursor-pointer space-y-2"
                  title={`Click to inspect @${c.username}'s generated keys and payment receipts`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-xs text-[var(--ink)] hover:text-[var(--accent)]">
                        @{c.username}
                      </strong>
                      <span
                        className={`ref-badge !h-[19px] !px-2 text-[9.5px] font-mono uppercase ${
                          c.role === "owner" ? "warning" : c.role === "admin" ? "info" : "success"
                        }`}
                      >
                        {c.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-[var(--ink)]">
                        {c.total_keys} {c.total_keys === 1 ? "Key" : "Keys"} Generated
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">({sharePct}%)</span>
                    </div>
                  </div>

                  <div className="ref-linear-progress">
                    <span style={{ width: `${Math.max(3, sharePct)}%` }} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-[var(--muted)]">
                    <span>
                      <strong className="text-emerald-500">{c.active_keys || 0}</strong> active ·{" "}
                      <strong className="text-sky-400">{c.bound_keys || 0}</strong> bound ·{" "}
                      <strong className="text-rose-400">{c.expired_keys || 0}</strong> expired
                    </span>
                    <span>
                      Spent: <strong className="text-amber-500">{c.credits_spent || 0} CR</strong> · Balance:{" "}
                      <strong className="text-[var(--ink)]">
                        {c.role === "owner" ? "∞" : `${c.credits} CR`}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 05: Live Verification Stream */}
      <div className="ref-panel p-6">
        <div className="ref-section-head">
          <div className="flex items-start gap-3">
            <span className="ref-section-number">05</span>
            <div>
              <div className="ref-eyebrow">Socket Handshakes</div>
              <h2>Live Client Authentication Stream</h2>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("keys")}
            className="ref-btn !min-h-[32px] text-xs"
          >
            <span>Open Key Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {stats?.recentLogs && stats.recentLogs.length > 0 ? (
            stats.recentLogs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className="ref-card p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.status === "authenticated"
                        ? "bg-emerald-500"
                        : log.status === "mismatch"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[var(--ink)] truncate">
                        {log.key_str}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickCopy(log.key_str, "Key")}
                        className="ref-btn !min-h-[20px] !px-1.5 text-[10px]"
                        title="Copy key"
                      >
                        {copiedStr === log.key_str ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <small className="text-[10px] text-[var(--muted)] font-mono block">
                      {log.hwid ? `HWID: ${log.hwid}` : "Unbound"} · IP: {log.ip} · {log.message}
                    </small>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`ref-badge !h-[20px] text-[10px] font-mono uppercase ${
                      log.status === "authenticated"
                        ? "success"
                        : log.status === "mismatch"
                        ? "warning"
                        : "danger"
                    }`}
                  >
                    {log.status === "authenticated" ? "Verified" : log.status}
                  </span>
                  <div className="text-[9px] text-[var(--muted)] font-mono mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-[var(--muted)] font-mono">
              No recent authentication attempts recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
