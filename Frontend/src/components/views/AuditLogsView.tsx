import React, { useState, useEffect } from "react";
import { LogRecord, api, copyToClipboard } from "../../lib/api";
import { RefreshCw, Trash2, Copy, Check } from "lucide-react";
import { useToast } from "../Toast";

export const AuditLogsView: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopy = async (text: string, label = "Key") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 1500);
      toast(`${label} copied!`, "success");
    }
  };

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
    <div className="space-y-5">
      <div className="ref-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="ref-section-head">
          <span className="ref-section-number">02</span>
          <div>
            <h2 className="font-display text-2xl font-normal text-[var(--ink)]">
              Verification Audit Logs ({logs.length})
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Trace every socket authentication handshake and rejection from mod menu clients.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="ref-tab-list">
            {["all", "authenticated", "mismatch", "expired", "invalid"].map((s) => (
              <button
                key={s}
                type="button"
                aria-selected={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                className="ref-tab-btn capitalize !text-[11px] !px-2.5"
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={loadLogs}
            className="ref-btn !px-2.5"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleClearLogs}
            className="ref-btn danger !px-2.5"
            title="Clear all logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Logs</span>
          </button>
        </div>
      </div>

      <div className="ref-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] font-mono text-[10.5px] uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Result Status</th>
                <th className="py-3 px-4">Target Key</th>
                <th className="py-3 px-4">Device HWID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Diagnostics / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] font-mono text-[11px]">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`ref-badge !h-[20px] text-[10px] uppercase font-bold ${
                          log.status === "authenticated"
                            ? "success"
                            : log.status === "mismatch"
                            ? "warning"
                            : "danger"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[var(--ink)]">
                      <div className="flex items-center gap-1.5">
                        <span>{log.key_str}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(log.key_str, "Key")}
                          className="ref-btn !min-h-[20px] !px-1.5 text-[10px]"
                        >
                          {copiedId === log.key_str ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)] max-w-[160px] truncate">
                      {log.hwid || "None"}
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)]">{log.ip}</td>
                    <td className="py-3 px-4 font-sans text-xs text-[var(--ink)]">
                      {log.message || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--muted)] font-mono">
                    No verification logs found.
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
