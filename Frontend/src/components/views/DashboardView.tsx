import React from "react";
import { OverviewStats } from "../../lib/api";
import { ProgressRing } from "../ProgressRing";
import { useAuth } from "../../context/AuthContext";
import {
  Key,
  ShieldCheck,
  Cpu,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Plus,
  Download,
  Sparkles,
  RefreshCw,
  Coins,
  ArrowRight,
} from "lucide-react";
import { useToast } from "../Toast";

interface DashboardViewProps {
  stats: OverviewStats | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateKey: () => void;
  onOpenBatch: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onRefresh,
  onOpenCreateKey,
  onOpenBatch,
  onNavigateTab,
}) => {
  const { role, credits } = useAuth();
  const { toast } = useToast();

  const totalKeys = stats?.totalKeys ?? 0;
  const activeKeys = stats?.activeKeys ?? 0;
  const boundKeys = stats?.boundKeys ?? 0;
  const expiredKeys = stats?.expiredKeys ?? 0;
  const verifications24h = stats?.past24hVerifications ?? stats?.verifications24h ?? 0;
  const successRate = stats?.successRate ?? 100;
  const success24h = stats?.success24h ?? Math.round((verifications24h * successRate) / 100);
  const activePercent = totalKeys > 0 ? (activeKeys / totalKeys) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Clean Luxury Header Banner */}
      <div className="p-6 sm:p-8 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] tracking-[2px] uppercase font-mono text-emerald-400 font-semibold">
                Void License Server Active
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[var(--ink)] mb-2">
              Management & License Hub
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              Create and manage hardware-locked keys. Every key binds strictly to 1 client device upon activation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenCreateKey}
              className="primary-btn flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Generate Key (24H = 10 CR)
            </button>
            <button
              onClick={onOpenBatch}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-md text-xs border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors font-medium"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Batch Keys
            </button>
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Clean Metric Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total & Active Keys */}
        <div
          onClick={() => onNavigateTab("keys")}
          className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm flex items-center justify-between cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-mono">
              Total Licenses
            </span>
            <div className="font-display text-3xl font-normal text-[var(--ink)] mt-1">
              {totalKeys}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1">
              <span className="text-emerald-500 font-semibold">{activeKeys}</span> active now
            </div>
          </div>
          <ProgressRing value={activePercent} size={58} label="Active" />
        </div>

        {/* Card 2: Bound Devices */}
        <div
          onClick={() => onNavigateTab("keys")}
          className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm flex items-center justify-between cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-mono">
              Bound to 1 Device
            </span>
            <div className="font-display text-3xl font-normal text-[var(--ink)] mt-1">
              {boundKeys}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 font-medium">
              Hardware locked
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Credits Balance */}
        <div
          onClick={() => onNavigateTab("credits")}
          className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm flex items-center justify-between cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-mono">
              Your Credits
            </span>
            <div className="font-display text-3xl font-normal text-amber-500 mt-1">
              {role === "owner" ? "∞" : credits.toLocaleString()}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1">
              {role === "owner" ? "Master Owner (Free)" : "Available to spend"}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border border-amber-500/20 bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: 24h Verifications */}
        <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-mono">
              24h Gate Checks
            </span>
            <div className="font-display text-3xl font-normal text-[var(--ink)] mt-1">
              {verifications24h}
            </div>
            <div className="text-[11px] text-emerald-500 mt-1 font-medium">
              {success24h} verified
            </div>
          </div>
          <ProgressRing value={successRate} size={58} label="Pass" />
        </div>
      </div>

      {/* Live Verification Stream */}
      <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-normal text-[var(--ink)]">
              Live Authentication Activity
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Recent verification attempts from connecting game clients
            </p>
          </div>
          <button
            onClick={() => onNavigateTab("keys")}
            className="text-xs text-[var(--accent)] hover:underline font-medium flex items-center gap-1"
          >
            Manage Keys <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {stats?.recentLogs && stats.recentLogs.length > 0 ? (
            stats.recentLogs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] flex items-center justify-between gap-3 text-xs"
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
                    <span className="font-mono font-semibold text-[var(--ink)] truncate block">
                      {log.key_str}
                    </span>
                    <small className="text-[10px] text-[var(--muted)] font-mono block">
                      {log.hwid ? `HWID: ${log.hwid.slice(0, 16)}...` : "Unbound"} · IP: {log.ip}
                    </small>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      log.status === "authenticated"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : log.status === "mismatch"
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {log.status === "authenticated" ? "Verified" : log.status}
                  </span>
                  <div className="text-[9px] text-[var(--muted)] mt-0.5">
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
