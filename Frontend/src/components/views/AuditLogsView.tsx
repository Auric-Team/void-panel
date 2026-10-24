import React, { useState, useEffect } from "react";
import { LogRecord, api } from "../../lib/api";
import { ShieldCheck, AlertCircle, RefreshCw, Trash2, Filter } from "lucide-react";
import { useToast } from "../Toast";

export const AuditLogsView: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getLogs(statusFilter, 150);
      setLogs(data);
    } catch (err: any) {
      toast("Failed to load logs", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [statusFilter]);

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all historical verification logs?")) return;
    try {
      await api.clearLogs();
      toast("All audit logs cleared", "info");
      loadLogs();
    } catch (err: any) {
      toast("Failed to clear logs", "error", err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)]">
        <div>
          <h2 className="font-display text-xl font-normal">
            Verification Audit Logs
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Trace every socket authentication handshake and rejection from mod menus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status filter pill group */}
          <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-xs">
            {["all", "authenticated", "mismatch", "expired", "invalid"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded capitalize transition-all ${
                  statusFilter === s
                    ? "bg-[var(--surface-solid)] text-[var(--ink)] font-semibold shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={loadLogs}
            className="p-2 rounded-md border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleClearLogs}
            className="p-2 rounded-md border border-[var(--border-soft)] text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Clear all logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Result Status</th>
                <th className="py-3 px-4">Target Key</th>
                <th className="py-3 px-4">Device HWID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Diagnostics / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)] font-mono text-[11px]">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-pill text-[10px] uppercase font-bold tracking-wider ${
                          log.status === "authenticated"
                            ? "success-badge"
                            : log.status === "mismatch"
                            ? "warning-badge"
                            : "danger-badge"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[var(--ink)]">
                      {log.key_str}
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)] max-w-[140px] truncate">
                      {log.hwid || "None"}
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)]">
                      {log.ip}
                    </td>
                    <td className="py-3 px-4 font-sans text-xs text-[var(--ink)]">
                      {log.message || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--muted)] font-sans">
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
