import React, { useState } from "react";
import { KeyRecord, api, copyToClipboard, printReceiptWindow } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import {
  Copy,
  Check,
  RefreshCcw,
  Clock,
  Trash2,
  PauseCircle,
  PlayCircle,
  Search,
  CheckSquare,
  ShieldCheck,
  Unlock,
  Eye,
  FileSpreadsheet,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Receipt,
  Printer,
} from "lucide-react";

interface KeyManagerViewProps {
  keys: KeyRecord[];
  loading?: boolean;
  onRefresh: () => void;
  onOpenCreateKey?: () => void;
  onOpenBatch?: () => void;
  onInspectUser?: (userId: number) => void;
}

export const KeyManagerView: React.FC<KeyManagerViewProps> = ({
  keys,
  onRefresh,
  onOpenCreateKey,
  onOpenBatch,
  onInspectUser,
}) => {
  const { role } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bindingFilter, setBindingFilter] = useState<"all" | "bound" | "unbound">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Delete All Keys Modal state
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteAllFilter, setDeleteAllFilter] = useState<"all" | "expired" | "unbound" | "paused">("all");
  const [deletingAll, setDeletingAll] = useState(false);

  // Modal target states
  const [resetTargetKey, setResetTargetKey] = useState<KeyRecord | null>(null);
  const [resetting, setResetting] = useState(false);

  const [extendTargetKey, setExtendTargetKey] = useState<KeyRecord | null>(null);
  const [extendDays, setExtendDays] = useState(30);

  const [inspectKey, setInspectKey] = useState<KeyRecord | null>(null);

  // Filter keys by search query, status, and binding state
  const filteredKeys = keys.filter((k) => {
    const q = search.toLowerCase();
    const matchesSearch =
      k.key_str.toLowerCase().includes(q) ||
      (k.hwid && k.hwid.toLowerCase().includes(q)) ||
      (k.note && k.note.toLowerCase().includes(q)) ||
      (k.created_by_name && k.created_by_name.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "all" ? true : k.status.toLowerCase() === statusFilter.toLowerCase();

    const isBound = Boolean(k.hwid && k.hwid.trim() !== "");
    const matchesBinding =
      bindingFilter === "all"
        ? true
        : bindingFilter === "bound"
        ? isBound
        : !isBound;

    return matchesSearch && matchesStatus && matchesBinding;
  });

  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredKeys.length);
  const paginatedKeys = filteredKeys.slice(startIndex, endIndex);

  const handleCopy = async (text: string, label = "License Key") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 1600);
      toast(`${label} copied!`, "success", text);
    } else {
      toast(`Could not copy ${label}`, "error");
    }
  };

  const handleCopyAllFiltered = async () => {
    if (filteredKeys.length === 0) return;
    const allStr = filteredKeys.map((k) => k.key_str).join("\n");
    const ok = await copyToClipboard(allStr);
    if (ok) {
      toast(`Copied ${filteredKeys.length} license keys to clipboard!`, "success");
    } else {
      toast("Failed to copy keys", "error");
    }
  };

  const handleResetHwid = async () => {
    if (!resetTargetKey) return;
    setResetting(true);
    try {
      const res = await api.resetHwid(resetTargetKey.id);
      if (res.success) {
        toast("Device HWID reset successfully!", "success", "Key can now bind to a fresh Android device.");
        setResetTargetKey(null);
        if (inspectKey?.id === resetTargetKey.id) {
          setInspectKey({ ...inspectKey, hwid: null, bound_at: null, reset_count: inspectKey.reset_count + 1 });
        }
        onRefresh();
      }
    } catch (err: any) {
      toast("Failed to reset HWID", "error", err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleToggleStatus = async (key: KeyRecord) => {
    const nextStatus = key.status === "active" ? "paused" : "active";
    try {
      await api.updateKeyStatus(key.id, nextStatus);
      toast(`Key marked as ${nextStatus}`, "info");
      onRefresh();
    } catch (err: any) {
      toast("Failed to update status", "error", err.message);
    }
  };

  const handleExtendDuration = async () => {
    if (!extendTargetKey) return;
    try {
      await api.extendKey(extendTargetKey.id, extendDays);
      toast(`Key extended by +${extendDays} days`, "success");
      setExtendTargetKey(null);
      onRefresh();
    } catch (err: any) {
      toast("Failed to extend duration", "error", err.message);
    }
  };

  const handleDelete = async (key: KeyRecord) => {
    if (!confirm(`Are you sure you want to permanently delete key ${key.key_str}?`)) return;
    try {
      await api.deleteKey(key.id);
      toast("Key deleted permanently", "warning");
      onRefresh();
    } catch (err: any) {
      toast("Failed to delete key", "error", err.message);
    }
  };

  const handleConfirmDeleteAllKeys = async () => {
    setDeletingAll(true);
    try {
      const res = await api.deleteAllKeys(deleteAllFilter);
      if (res.success) {
        toast(res.message || `Deleted ${res.affected} keys`, "warning");
        setSelectedIds(new Set());
        setDeleteAllModalOpen(false);
        onRefresh();
      }
    } catch (err: any) {
      toast("Failed to delete keys", "error", err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  // Bulk Operations Handlers
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredKeys.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredKeys.map((k) => k.id)));
    }
  };

  const handleBulkAction = async (action: "pause" | "activate" | "extend" | "reset_hwid" | "delete", days = 30) => {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`Permanently delete ${selectedIds.size} selected keys?`)) return;

    setBulkLoading(true);
    try {
      const res = await api.bulkKeyAction(action, Array.from(selectedIds), days);
      if (res.success) {
        toast(`Bulk ${action} succeeded for ${res.affected} keys!`, "success");
        setSelectedIds(new Set());
        onRefresh();
      }
    } catch (err: any) {
      toast(`Bulk ${action} failed`, "error", err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const boundTotal = keys.filter((k) => k.hwid && k.hwid.trim() !== "").length;
  const activeTotal = keys.filter((k) => k.status === "active").length;
  const expiredTotal = keys.filter((k) => k.status === "expired").length;

  return (
    <div className="space-y-5">
      {/* Section Header + Summary Pills + Master Action Buttons */}
      <div className="ref-panel p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="ref-section-head">
          <span className="ref-section-number">01</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-normal text-[var(--ink)]">
                License Key Registry
              </h2>
              <span className="ref-badge font-mono text-[10px]">{keys.length} Total</span>
              <span className="ref-badge success font-mono text-[10px]">{activeTotal} Active</span>
              <span className="ref-badge info font-mono text-[10px]">{boundTotal} Bound</span>
              {expiredTotal > 0 && (
                <span className="ref-badge danger font-mono text-[10px]">{expiredTotal} Expired</span>
              )}
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Click any key to copy or inspect telemetry. Click any creator handle to view their account generation report.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCreateKey && (
            <button onClick={onOpenCreateKey} className="ref-btn primary font-semibold">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Key</span>
            </button>
          )}
          {onOpenBatch && (
            <button onClick={onOpenBatch} className="ref-btn">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Batch Mint</span>
            </button>
          )}
          <button
            onClick={handleCopyAllFiltered}
            disabled={filteredKeys.length === 0}
            className="ref-btn"
            title="Copy all filtered keys to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All ({filteredKeys.length})</span>
          </button>
          <a
            href={api.getExportUrl("csv")}
            target="_blank"
            rel="noreferrer"
            className="ref-btn"
            title="Export keys to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>CSV</span>
          </a>
          <button
            onClick={() => {
              setDeleteAllFilter("all");
              setDeleteAllModalOpen(true);
            }}
            disabled={keys.length === 0}
            className="ref-btn danger font-medium"
            title="Delete all keys or filtered subset at once"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All Keys</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="ref-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="ref-input-wrap flex-1 max-w-md !min-h-[36px]">
          <Search className="w-4 h-4 text-[var(--muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search key string, Android HWID, creator, or customer note..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-transparent border-0 outline-none text-xs font-mono text-[var(--ink)] placeholder:text-[var(--muted)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Binding Filter */}
          <div className="ref-tab-list">
            {(["all", "bound", "unbound"] as const).map((b) => (
              <button
                key={b}
                type="button"
                aria-selected={bindingFilter === b}
                onClick={() => {
                  setBindingFilter(b);
                  setCurrentPage(1);
                }}
                className="ref-tab-btn capitalize !text-[11px] !px-2.5"
              >
                {b === "all" ? "All Bindings" : b === "bound" ? "Locked (Bound)" : "Fresh (Unbound)"}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="ref-tab-list">
            {["all", "active", "paused", "expired"].map((s) => (
              <button
                key={s}
                type="button"
                aria-selected={statusFilter === s}
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className="ref-tab-btn uppercase !text-[10.5px] !px-2.5 font-mono"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="ref-panel p-3.5 border-[var(--accent)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
            <span>
              <strong>{selectedIds.size}</strong> license key(s) selected
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                const selectedKeys = keys
                  .filter((k) => selectedIds.has(k.id))
                  .map((k) => k.key_str)
                  .join("\n");
                await handleCopy(selectedKeys, `${selectedIds.size} Selected Keys`);
              }}
              className="ref-btn !min-h-[30px] !px-2.5 text-[11px]"
            >
              <Copy className="w-3 h-3" /> Copy Selected
            </button>
            <button
              onClick={() => handleBulkAction("pause")}
              disabled={bulkLoading}
              className="ref-btn !min-h-[30px] !px-2.5 text-[11px] text-amber-500"
            >
              Bulk Pause
            </button>
            <button
              onClick={() => handleBulkAction("activate")}
              disabled={bulkLoading}
              className="ref-btn !min-h-[30px] !px-2.5 text-[11px] text-emerald-500"
            >
              Bulk Activate
            </button>
            {role !== "reseller" && (
              <button
                onClick={() => handleBulkAction("extend", 30)}
                disabled={bulkLoading}
                className="ref-btn !min-h-[30px] !px-2.5 text-[11px] text-sky-400"
              >
                Bulk +30 Days
              </button>
            )}
            <button
              onClick={() => handleBulkAction("reset_hwid")}
              disabled={bulkLoading}
              className="ref-btn !min-h-[30px] !px-2.5 text-[11px]"
            >
              Bulk Reset HWID
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              disabled={bulkLoading}
              className="ref-btn danger !min-h-[30px] !px-2.5 text-[11px]"
            >
              <Trash2 className="w-3 h-3" /> Delete Selected ({selectedIds.size})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="ref-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] font-mono text-[10.5px] uppercase tracking-wider">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredKeys.length && filteredKeys.length > 0}
                    onChange={selectAll}
                    className="rounded accent-[var(--accent)] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">License Key (Click to Copy)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Device Binding (HWID)</th>
                <th className="py-3 px-4">Duration / Cost</th>
                <th className="py-3 px-4">Creator Account</th>
                <th className="py-3 px-4">Customer Note</th>
                <th className="py-3 px-4 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] font-ui">
              {paginatedKeys.length > 0 ? (
                paginatedKeys.map((k) => {
                  const isBound = Boolean(k.hwid && k.hwid.trim() !== "");
                  const isSelected = selectedIds.has(k.id);
                  const isKeyCopied = copiedId === k.key_str;

                  return (
                    <tr
                      key={k.id}
                      className={`transition-colors ${
                        isSelected ? "bg-[var(--selection)]" : "hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(k.id)}
                          className="rounded accent-[var(--accent)] cursor-pointer"
                        />
                      </td>

                      {/* License Key with prominent 1-click Copy button */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(k.key_str, "License Key")}
                            className="font-mono font-bold text-[var(--ink)] hover:text-[var(--accent)] text-left cursor-pointer"
                            title="Click to copy license key"
                          >
                            {k.key_str}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(k.key_str, "License Key")}
                            title="Copy license key to clipboard"
                            className={`ref-btn !min-h-[24px] !px-2 !py-0 text-[10px] font-mono ${
                              isKeyCopied ? "success-badge" : ""
                            }`}
                          >
                            {isKeyCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`ref-badge !h-[22px] text-[10px] uppercase font-mono font-semibold ${
                            k.status === "active"
                              ? "success"
                              : k.status === "paused"
                              ? "warning"
                              : "danger"
                          }`}
                        >
                          <i className="w-1.5 h-1.5 rounded-full bg-current" />
                          {k.status}
                        </span>
                      </td>

                      {/* Device Binding */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {isBound ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[130px] font-semibold text-[var(--ink)]" title={k.hwid!}>
                                {k.hwid}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(k.hwid!, "Device HWID")}
                                className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                                title="Copy HWID"
                              >
                                {copiedId === k.hwid ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <span className="block text-[10px] text-[var(--muted)]">
                              Resets: {k.reset_count}/{k.max_resets}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--muted)]">
                            <Unlock className="w-3 h-3" />
                            Unbound (1st login locks)
                          </span>
                        )}
                      </td>

                      {/* Duration & Credit Cost */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div>
                          <span className="font-semibold text-[var(--ink)]">
                            {k.duration_days === 0 ? "Lifetime (∞)" : `${k.duration_days} Days`}
                          </span>
                          <span className="ml-1.5 text-[10px] text-amber-500">({k.credit_cost} CR)</span>
                        </div>
                        <small className="block text-[10px] text-[var(--muted)]">
                          {k.expires_at
                            ? `Exp: ${new Date(k.expires_at).toLocaleDateString()}`
                            : k.duration_days === 0
                            ? "Never expires"
                            : "Starts on activation"}
                        </small>
                      </td>

                      {/* Creator Account (Clickable to inspect user's generated keys) */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <button
                          type="button"
                          onClick={() => k.created_by_id && onInspectUser?.(k.created_by_id)}
                          className={`text-left ${
                            k.created_by_id
                              ? "text-[var(--ink)] hover:text-[var(--accent)] underline decoration-dotted underline-offset-2 cursor-pointer"
                              : "text-[var(--muted)]"
                          }`}
                          title={
                            k.created_by_id
                              ? `Click to inspect @${k.created_by_name}'s total keys generated`
                              : undefined
                          }
                        >
                          @{k.created_by_name || "system"}
                        </button>
                        <small className="block text-[10px] text-[var(--muted)]">
                          {new Date(k.created_at).toLocaleDateString()}
                        </small>
                      </td>

                      {/* Note & Payment Receipt Indicator */}
                      <td className="py-3 px-4 text-[11px] text-[var(--muted)] max-w-[180px]">
                        <div className="space-y-1">
                          {(k.payment_amount && k.payment_amount > 0) || k.proof_image || k.payment_method ? (
                            <button
                              type="button"
                              onClick={() => setInspectKey(k)}
                              className="ref-badge success !h-[20px] !px-2 !text-[10px] cursor-pointer"
                              title="Click to inspect Payment Receipt & Proof Screenshot"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>
                                {k.payment_amount && k.payment_amount > 0
                                  ? `${k.payment_amount} ${k.payment_currency || "USD"}`
                                  : "Receipt"}
                                {k.proof_image ? " + Proof" : ""}
                              </span>
                            </button>
                          ) : null}
                          <div className="truncate text-[var(--ink)]">
                            {k.customer_name || k.note || "—"}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectKey(k)}
                            title="Inspect license & device binding"
                            className="ref-btn !min-h-[28px] !px-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isBound && (
                            <button
                              type="button"
                              onClick={() => setResetTargetKey(k)}
                              title="Reset HWID / Unbind Device"
                              className="ref-btn !min-h-[28px] !px-2 text-amber-500"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {k.duration_days > 0 && role !== "reseller" && (
                            <button
                              type="button"
                              onClick={() => {
                                setExtendTargetKey(k);
                                setExtendDays(30);
                              }}
                              title="Extend duration"
                              className="ref-btn !min-h-[28px] !px-2 text-sky-400"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(k)}
                            title={k.status === "active" ? "Pause key" : "Resume key"}
                            className="ref-btn !min-h-[28px] !px-2"
                          >
                            {k.status === "active" ? (
                              <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(k)}
                            title="Delete key permanently"
                            className="ref-btn danger !min-h-[28px] !px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[var(--muted)] font-mono">
                    No license keys found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredKeys.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--line)] bg-[var(--surface-solid)] text-xs font-mono">
            <div className="text-[var(--muted)] text-[11px]">
              Showing <strong className="text-[var(--ink)]">{startIndex + 1}</strong>–
              <strong className="text-[var(--ink)]">{endIndex}</strong> of{" "}
              <strong className="text-[var(--ink)]">{filteredKeys.length}</strong> keys
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[var(--surface)] border border-[var(--border-soft)] rounded px-2 py-1 text-[var(--ink)] outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="ref-btn !min-h-[28px] !px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2.5 text-[11px] text-[var(--muted)]">
                  Page <strong className="text-[var(--ink)]">{safeCurrentPage}</strong> / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="ref-btn !min-h-[28px] !px-2"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Delete All Keys At Once */}
      <Modal
        isOpen={deleteAllModalOpen}
        onClose={() => setDeleteAllModalOpen(false)}
        title="Delete All License Keys"
        subtitle="Select which category of license keys to permanently purge at once"
        icon={<AlertTriangle className="w-5 h-5 text-[var(--danger)]" />}
      >
        <div className="space-y-4 text-xs font-ui">
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: "all", label: `Delete ALL Keys (${keys.length} total)`, desc: "Purges every active, bound, paused, and expired key in your scope" },
              { id: "expired", label: `Delete Only Expired Keys (${expiredTotal})`, desc: "Removes expired keys while keeping active licenses intact" },
              { id: "unbound", label: `Delete Only Unbound Keys (${keys.length - boundTotal})`, desc: "Removes unused keys that have not yet bound to any device" },
              { id: "paused", label: "Delete Only Paused Keys", desc: "Removes keys currently marked as paused" },
            ].map((opt) => (
              <label
                key={opt.id}
                onClick={() => setDeleteAllFilter(opt.id as any)}
                className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                  deleteAllFilter === opt.id
                    ? "border-[var(--danger)] bg-[var(--danger-fill)]"
                    : "border-[var(--border-soft)] bg-[var(--surface)]"
                }`}
              >
                <input
                  type="radio"
                  name="deleteAllFilter"
                  checked={deleteAllFilter === opt.id}
                  onChange={() => setDeleteAllFilter(opt.id as any)}
                  className="mt-0.5 accent-[var(--danger)]"
                />
                <div>
                  <strong className="block font-mono text-xs text-[var(--ink)]">{opt.label}</strong>
                  <span className="text-[11px] text-[var(--muted)]">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteAllModalOpen(false)}
              className="ref-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteAllKeys}
              disabled={deletingAll}
              className="ref-btn solid-danger font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deletingAll ? "Deleting..." : "Confirm Bulk Purge"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Reset HWID Confirmation */}
      <Modal
        isOpen={Boolean(resetTargetKey)}
        onClose={() => setResetTargetKey(null)}
        title="Reset Device Hardware Binding"
        subtitle={`Key: ${resetTargetKey?.key_str}`}
        icon={<RefreshCcw className="w-5 h-5 text-amber-500" />}
      >
        <div className="space-y-4 text-xs font-ui">
          <div className="p-3.5 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-fill)] text-[var(--ink)]">
            <strong className="block mb-1">Unbinding Hardware Notice</strong>
            This clears the bound HWID (<code className="font-mono">{resetTargetKey?.hwid}</code>) so the license can bind to a replacement Android device on next login.
          </div>

          <div className="font-mono text-[11px] p-2.5 rounded bg-[var(--surface)] border border-[var(--border-soft)]">
            Resets Used: {resetTargetKey?.reset_count} / {resetTargetKey?.max_resets} allowable
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setResetTargetKey(null)} className="ref-btn">
              Cancel
            </button>
            <button
              onClick={handleResetHwid}
              disabled={resetting}
              className="ref-btn primary font-semibold"
            >
              {resetting ? "Resetting..." : "Confirm HWID Reset"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Extend Key Duration */}
      <Modal
        isOpen={Boolean(extendTargetKey)}
        onClose={() => setExtendTargetKey(null)}
        title="Extend Subscription Duration"
        subtitle={`Key: ${extendTargetKey?.key_str}`}
        icon={<Clock className="w-5 h-5 text-sky-400" />}
      >
        <div className="space-y-4 text-xs font-ui">
          <div className="grid grid-cols-4 gap-2">
            {[7, 15, 30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setExtendDays(d)}
                className={`ref-btn font-mono ${extendDays === d ? "primary" : ""}`}
              >
                +{d}D
              </button>
            ))}
          </div>

          <div className="ref-input-wrap">
            <input
              type="number"
              min="1"
              max="365"
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setExtendTargetKey(null)} className="ref-btn">
              Cancel
            </button>
            <button onClick={handleExtendDuration} className="ref-btn primary font-semibold">
              Add +{extendDays} Days
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Inspect Key Details */}
      <Modal
        isOpen={Boolean(inspectKey)}
        onClose={() => setInspectKey(null)}
        title="License & Device Binding Telemetry"
        subtitle={`Specification for ${inspectKey?.key_str}`}
        icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
      >
        {inspectKey && (
          <div className="space-y-4 text-xs font-ui">
            <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)] flex items-center justify-between gap-2">
              <code className="text-sm font-mono font-bold text-[var(--ink)] break-all">
                {inspectKey.key_str}
              </code>
              <button
                onClick={() => handleCopy(inspectKey.key_str, "License Key")}
                className="ref-btn !min-h-[30px] font-mono shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Key</span>
              </button>
            </div>

            <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)] space-y-2.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)] uppercase text-[10px]">Hardware Binding</span>
                <span className={`ref-badge !h-[20px] text-[10px] ${inspectKey.hwid ? "success" : ""}`}>
                  {inspectKey.hwid ? "LOCKED TO 1 DEVICE" : "UNBOUND"}
                </span>
              </div>
              {inspectKey.hwid && (
                <div className="flex items-center justify-between gap-2 p-2 rounded bg-[var(--surface-solid)] border border-[var(--border-soft)]">
                  <code className="text-[11px] break-all">{inspectKey.hwid}</code>
                  <button
                    onClick={() => handleCopy(inspectKey.hwid!, "HWID")}
                    className="ref-btn !min-h-[24px] !px-2 text-[10px]"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px]">
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Duration</span>
                  <strong>{inspectKey.duration_days === 0 ? "Lifetime" : `${inspectKey.duration_days} Days`}</strong>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Credit Cost</span>
                  <strong className="text-amber-500">{inspectKey.credit_cost} CR</strong>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Created By</span>
                  <strong>@{inspectKey.created_by_name}</strong>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Resets Used</span>
                  <strong>{inspectKey.reset_count} / {inspectKey.max_resets}</strong>
                </div>
              </div>
            </div>

            {/* Attached Payment Receipt & Proof Screenshot inside Key Inspector */}
            {((inspectKey.payment_amount && inspectKey.payment_amount > 0) ||
              inspectKey.proof_image ||
              inspectKey.payment_method ||
              inspectKey.customer_name) && (
              <div className="p-4 rounded-lg border border-[var(--success-border)] bg-[var(--success-fill)] space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--success)]">
                    <Receipt className="w-4 h-4" />
                    Attached Payment Receipt &amp; Proof
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      printReceiptWindow({
                        id: inspectKey.id,
                        receipt_no: `VOID-KEY-${inspectKey.id}`,
                        user_id: inspectKey.created_by_id,
                        username: inspectKey.created_by_name,
                        customer_name: inspectKey.customer_name || inspectKey.note || "Direct Buyer",
                        amount_paid: inspectKey.payment_amount || 0,
                        currency: inspectKey.payment_currency || "USD",
                        credits_granted: inspectKey.credit_cost,
                        keys_summary: `1x ${inspectKey.duration_days === 0 ? "Lifetime" : inspectKey.duration_days + "D"} Key (${inspectKey.key_str})`,
                        payment_method: inspectKey.payment_method || "Direct",
                        transaction_ref: inspectKey.payment_ref || "N/A",
                        proof_image: inspectKey.proof_image,
                        key_str: inspectKey.key_str,
                        status: "paid",
                        note: inspectKey.note,
                        issued_by_id: inspectKey.created_by_id,
                        issued_by_name: inspectKey.created_by_name,
                        created_at: inspectKey.created_at,
                      })
                    }
                    className="ref-btn !min-h-[26px] !px-2.5 text-[10.5px]"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[var(--ink)]">
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Customer / Buyer</span>
                    <strong>{inspectKey.customer_name || inspectKey.note || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Amount Paid</span>
                    <strong>
                      {(inspectKey.payment_amount || 0).toFixed(2)} {inspectKey.payment_currency || "USD"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Payment Method</span>
                    <strong>{inspectKey.payment_method || "Direct"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Transaction Ref</span>
                    <strong>{inspectKey.payment_ref || "N/A"}</strong>
                  </div>
                </div>

                {inspectKey.proof_image && (
                  <div className="pt-2 border-t border-[var(--line)]">
                    <span className="text-[10px] text-[var(--muted)] block mb-1.5">
                      Payment Proof Screenshot
                    </span>
                    <img
                      src={inspectKey.proof_image}
                      alt="Payment Proof Screenshot"
                      className="max-h-56 w-auto rounded border border-[var(--border)] bg-[var(--surface-solid)]"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setInspectKey(null)} className="ref-btn">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
