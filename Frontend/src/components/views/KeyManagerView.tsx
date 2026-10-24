import React, { useState } from "react";
import { KeyRecord, api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import {
  Key,
  Copy,
  RefreshCcw,
  Clock,
  Trash2,
  PauseCircle,
  PlayCircle,
  Search,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  Unlock,
  Smartphone,
  Eye,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface KeyManagerViewProps {
  keys: KeyRecord[];
  loading?: boolean;
  onRefresh: () => void;
  onOpenCreateKey?: () => void;
  onOpenBatch?: () => void;
}

export const KeyManagerView: React.FC<KeyManagerViewProps> = ({
  keys,
  loading,
  onRefresh,
  onOpenCreateKey,
  onOpenBatch,
}) => {
  const { role } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bindingFilter, setBindingFilter] = useState<"all" | "bound" | "unbound">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

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

  const handleCopy = (text: string, label = "Key") => {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard!`, "success");
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
    if (action === "delete" && !confirm(`Permanently delete ${selectedIds.size} keys?`)) return;

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

  return (
    <div className="space-y-6">
      {/* Top Bar: Search, Filters, and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by key, hardware ID, creator, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
          />
        </div>

        {/* Binding Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] p-0.5 text-xs font-mono">
            <button
              onClick={() => setBindingFilter("all")}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                bindingFilter === "all"
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              All Bindings
            </button>
            <button
              onClick={() => setBindingFilter("bound")}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1 ${
                bindingFilter === "bound"
                  ? "bg-emerald-500 text-white font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-emerald-400"
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Bound (Locked)</span>
            </button>
            <button
              onClick={() => setBindingFilter("unbound")}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1 ${
                bindingFilter === "unbound"
                  ? "bg-zinc-600 text-white font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <Unlock className="w-3 h-3" />
              <span>Unbound (Fresh)</span>
            </button>
          </div>

          {/* Status Filters */}
          <div className="flex items-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] p-0.5 text-xs font-mono ml-1">
            {["all", "active", "paused", "expired"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-[11px] uppercase transition-colors ${
                  statusFilter === s
                    ? "bg-[var(--surface-hover)] text-[var(--ink)] font-semibold border border-[var(--border)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <a
            href={api.getExportUrl("csv")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)] font-mono transition-colors shrink-0"
            title="Export keys to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export</span>
          </a>

          {/* Quick Generate Key & Batch buttons */}
          {onOpenCreateKey && (
            <button
              onClick={onOpenCreateKey}
              className="primary-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Key</span>
            </button>
          )}
          {onOpenBatch && (
            <button
              onClick={onOpenBatch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors shrink-0 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
            <span>
              <strong>{selectedIds.size}</strong> key(s) selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction("pause")}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded border border-[var(--border-soft)] hover:bg-[var(--surface)] text-amber-500 font-medium cursor-pointer"
            >
              Bulk Pause
            </button>
            <button
              onClick={() => handleBulkAction("activate")}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded border border-[var(--border-soft)] hover:bg-[var(--surface)] text-emerald-500 font-medium cursor-pointer"
            >
              Bulk Activate
            </button>
            <button
              onClick={() => handleBulkAction("extend", 30)}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded border border-[var(--border-soft)] hover:bg-[var(--surface)] text-sky-400 font-medium cursor-pointer"
            >
              Bulk +30 Days
            </button>
            <button
              onClick={() => handleBulkAction("reset_hwid")}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded border border-[var(--border-soft)] hover:bg-[var(--surface)] text-[var(--ink)] font-medium cursor-pointer"
            >
              Bulk Reset HWID
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-medium cursor-pointer"
            >
              Bulk Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Keys Table */}
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredKeys.length && filteredKeys.length > 0}
                    onChange={selectAll}
                    className="rounded accent-[var(--accent)] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">License Key</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Device Binding (HWID)</th>
                <th className="py-3 px-4">Duration / Expiration</th>
                <th className="py-3 px-4">Created By / On</th>
                <th className="py-3 px-4">Customer Note</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)] font-ui">
              {paginatedKeys.length > 0 ? (
                paginatedKeys.map((k) => {
                  const isBound = Boolean(k.hwid && k.hwid.trim() !== "");
                  const isSelected = selectedIds.has(k.id);

                  return (
                    <tr
                      key={k.id}
                      className={`transition-colors ${
                        isSelected ? "bg-[var(--accent)]/5" : "hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(k.id)}
                          className="rounded accent-[var(--accent)] cursor-pointer"
                        />
                      </td>

                      {/* License Key */}
                      <td className="py-3.5 px-4 font-mono font-medium text-[var(--ink)]">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => setInspectKey(k)}
                            className="cursor-pointer hover:underline text-[var(--accent)] font-semibold"
                            title="Click to view full license & device binding telemetry"
                          >
                            {k.key_str}
                          </span>
                          <button
                            onClick={() => handleCopy(k.key_str, "License Key")}
                            title="Copy key string"
                            className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-semibold ${
                            k.status === "active"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : k.status === "paused"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              k.status === "active"
                                ? "bg-emerald-400"
                                : k.status === "paused"
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                          />
                          {k.status}
                        </span>
                      </td>

                      {/* Device Binding (HWID) Column - STRICT 1 DEVICE INDICATOR */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {isBound ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 w-fit">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              BOUND TO 1 DEVICE
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink)]">
                              <Smartphone className="w-3 h-3 text-[var(--muted)] shrink-0" />
                              <span className="truncate max-w-[130px] font-medium" title={k.hwid!}>
                                {k.hwid}
                              </span>
                              <button
                                onClick={() => handleCopy(k.hwid!, "Device HWID")}
                                title="Copy HWID"
                                className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-[10px] text-[var(--muted)]">
                              Bound: {k.bound_at ? new Date(k.bound_at).toLocaleString() : "First Login"} · ({k.reset_count}/{k.max_resets} resets)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 w-fit">
                              <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                              NOT BOUNDED
                            </span>
                            <span className="text-[10px] text-[var(--muted)] italic">
                              Ready for 1st device activation
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Duration / Expiration */}
                      <td className="py-3.5 px-4 text-[11px]">
                        {k.duration_days === 0 ? (
                          <span className="text-emerald-400 font-semibold font-mono">
                            LIFETIME ACCESS
                          </span>
                        ) : k.expires_at ? (
                          <div>
                            <span className="font-mono text-[var(--ink)] font-medium">
                              {new Date(k.expires_at).toLocaleDateString()}
                            </span>
                            <small className="block text-[10px] text-[var(--muted)] font-mono">
                              {new Date(k.expires_at).toLocaleTimeString()}
                            </small>
                          </div>
                        ) : (
                          <span className="text-[var(--muted)] font-mono">
                            {k.duration_days} Days (Starts on 1st login)
                          </span>
                        )}
                      </td>

                      {/* Created By / On */}
                      <td className="py-3.5 px-4 text-[11px] font-mono text-[var(--muted)]">
                        <div>
                          <span className="text-[var(--ink)]">@{k.created_by_name || "system"}</span>
                          <small className="block text-[10px] text-[var(--muted)]">
                            {new Date(k.created_at).toLocaleDateString()}
                          </small>
                        </div>
                      </td>

                      {/* Customer Note */}
                      <td className="py-3.5 px-4 text-[11px] text-[var(--muted)] max-w-[140px] truncate">
                        {k.note || "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Inspect / View Full Details */}
                          <button
                            onClick={() => setInspectKey(k)}
                            title="Inspect License & Device Binding Details"
                            className="p-1.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset HWID Button */}
                          {isBound && (
                            <button
                              onClick={() => setResetTargetKey(k)}
                              title="Reset HWID / Unbind Device"
                              className="p-1.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Extend Duration */}
                          {k.duration_days > 0 && (
                            <button
                              onClick={() => {
                                setExtendTargetKey(k);
                                setExtendDays(30);
                              }}
                              title="Extend subscription duration"
                              className="p-1.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Pause / Resume Toggle */}
                          <button
                            onClick={() => handleToggleStatus(k)}
                            title={k.status === "active" ? "Pause key" : "Resume key"}
                            className="p-1.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                          >
                            {k.status === "active" ? (
                              <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </button>

                          {/* Delete Key */}
                          <button
                            onClick={() => handleDelete(k)}
                            title="Delete key permanently"
                            className="p-1.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
                    No keys found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredKeys.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-soft)] bg-[var(--surface-solid)] text-xs font-mono">
            <div className="text-[var(--muted)] text-[11px]">
              Showing <span className="font-semibold text-[var(--ink)]">{startIndex + 1}</span> to{" "}
              <span className="font-semibold text-[var(--ink)]">{endIndex}</span> of{" "}
              <span className="font-semibold text-[var(--ink)]">{filteredKeys.length}</span> keys
            </div>

            <div className="flex items-center gap-3">
              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                <span>Per page:</span>
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

              {/* Prev / Page X of Y / Next Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-1.5 rounded border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-hover)] transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="px-2.5 py-1 text-[11px] text-[var(--muted)]">
                  Page <span className="font-semibold text-[var(--ink)]">{safeCurrentPage}</span> of{" "}
                  <span className="font-semibold text-[var(--ink)]">{totalPages}</span>
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-hover)] transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Reset HWID Confirmation */}
      <Modal
        isOpen={Boolean(resetTargetKey)}
        onClose={() => setResetTargetKey(null)}
        title="Reset Device Hardware Binding"
        subtitle={`Key: ${resetTargetKey?.key_str}`}
        icon={<RefreshCcw className="w-5 h-5 text-amber-500" />}
      >
        <div className="space-y-4 text-xs font-ui">
          <div className="p-3.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-[var(--ink)]">
            <strong className="block mb-1 text-amber-500">Unbinding Hardware Notice</strong>
            This action will clear the bound HWID (<code className="font-mono text-amber-300">{resetTargetKey?.hwid}</code>).
            The user will be able to activate this license on a fresh device on next launch.
          </div>

          <div className="font-mono text-[11px] p-2.5 rounded bg-[var(--surface)] border border-[var(--border-soft)]">
            Resets Used: {resetTargetKey?.reset_count} / {resetTargetKey?.max_resets} allowable
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setResetTargetKey(null)}
              className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleResetHwid}
              disabled={resetting}
              className="px-4 py-2 rounded-md font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              {resetting ? "Resetting..." : "Confirm HWID Reset"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Extend Key Duration */}
      <Modal
        isOpen={Boolean(extendTargetKey)}
        onClose={() => setExtendTargetKey(null)}
        title="Extend Subscription Duration"
        subtitle={`Key: ${extendTargetKey?.key_str}`}
        icon={<Clock className="w-5 h-5 text-sky-400" />}
      >
        <div className="space-y-4 text-xs font-ui">
          <label className="block text-[var(--muted)]">Additional Days:</label>
          <div className="grid grid-cols-4 gap-2">
            {[7, 15, 30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setExtendDays(d)}
                className={`py-2 text-center rounded border transition-colors cursor-pointer ${
                  extendDays === d
                    ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold border-transparent"
                    : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)]"
                }`}
              >
                +{d} Days
              </button>
            ))}
          </div>

          <input
            type="number"
            min="1"
            max="365"
            value={extendDays}
            onChange={(e) => setExtendDays(Number(e.target.value))}
            className="w-full p-2.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono"
          />

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setExtendTargetKey(null)}
              className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExtendDuration}
              className="px-4 py-2 rounded-md font-medium bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] transition-colors cursor-pointer"
            >
              Add Days to License
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: COMPREHENSIVE LICENSE & DEVICE BINDING SPECIFICATION */}
      <Modal
        isOpen={Boolean(inspectKey)}
        onClose={() => setInspectKey(null)}
        title="License & Device Binding Telemetry"
        subtitle={`Specification for ${inspectKey?.key_str}`}
        icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
      >
        {inspectKey && (
          <div className="space-y-4 text-xs font-ui">
            {/* Key String Card with Copy */}
            <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)]">
              <span className="block text-[10px] text-[var(--muted)] font-mono uppercase mb-1">
                License Key String
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono font-bold text-[var(--accent)] tracking-wide break-all">
                  {inspectKey.key_str}
                </code>
                <button
                  onClick={() => handleCopy(inspectKey.key_str, "License Key")}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-[var(--border-soft)] bg-[var(--surface-solid)] text-[var(--ink)] hover:bg-[var(--surface-hover)] shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {/* Device Hardware Binding Card (Strict 1 Device Lock) */}
            <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-[var(--ink)]">Hardware Binding Status</span>
                </div>
                {inspectKey.hwid ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    LOCKED TO 1 DEVICE ONLY
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 flex items-center gap-1">
                    <Unlock className="w-3 h-3 text-zinc-400" />
                    NOT BOUNDED (READY FOR 1ST DEVICE)
                  </span>
                )}
              </div>

              {inspectKey.hwid ? (
                <div className="space-y-2 pt-2 border-t border-[var(--border-soft)]">
                  <div>
                    <span className="text-[10px] text-[var(--muted)] font-mono uppercase block mb-1">
                      Bound Android HWID
                    </span>
                    <div className="flex items-center justify-between gap-2 p-2 rounded bg-[var(--surface-solid)] border border-[var(--border-soft)]">
                      <code className="text-[11px] font-mono text-[var(--ink)] break-all">
                        {inspectKey.hwid}
                      </code>
                      <button
                        onClick={() => handleCopy(inspectKey.hwid!, "Device HWID")}
                        className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] shrink-0 cursor-pointer"
                        title="Copy HWID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div>
                      <span className="text-[var(--muted)] block">Bound Timestamp:</span>
                      <span className="text-[var(--ink)]">
                        {inspectKey.bound_at
                          ? new Date(inspectKey.bound_at).toLocaleString()
                          : "First Login"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block">Resets Consumed:</span>
                      <span className="text-[var(--ink)]">
                        {inspectKey.reset_count} / {inspectKey.max_resets} allowable
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-[var(--surface-solid)] border border-[var(--border-soft)] text-[11px] text-[var(--muted)] font-mono">
                  This key has not yet authenticated from any device. The very first device that sends an authentication request with this key will permanently and automatically lock it to its hardware ID.
                </div>
              )}
            </div>

            {/* Validity & Subscription Telemetry */}
            <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)] space-y-2.5 font-mono text-xs">
              <span className="text-[10px] text-[var(--muted)] font-mono uppercase block font-semibold">
                Subscription & Validity Details
              </span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[var(--muted)] text-[10px] uppercase block">Status</span>
                  <span className="font-bold uppercase text-emerald-400">{inspectKey.status}</span>
                </div>
                <div>
                  <span className="text-[var(--muted)] text-[10px] uppercase block">Plan Duration</span>
                  <span className="text-[var(--ink)]">
                    {inspectKey.duration_days === 0
                      ? "Lifetime Unlimited"
                      : `${inspectKey.duration_days} Days (${inspectKey.duration_days * 24} Hours)`}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] text-[10px] uppercase block">Creation Date</span>
                  <span className="text-[var(--ink)]">
                    {new Date(inspectKey.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] text-[10px] uppercase block">Expiration Date</span>
                  <span className="text-[var(--ink)]">
                    {inspectKey.duration_days === 0
                      ? "Never (Lifetime)"
                      : inspectKey.expires_at
                      ? new Date(inspectKey.expires_at).toLocaleString()
                      : `${inspectKey.duration_days} Days from first login`}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] text-[10px] uppercase block">Created By</span>
                  <span className="text-[var(--ink)]">@{inspectKey.created_by_name || "system"}</span>
                </div>
                <div>
                  <span className="text-[var(--muted)] text-[10px] uppercase block">Credit Cost</span>
                  <span className="text-amber-500 font-semibold">{inspectKey.credit_cost} CR</span>
                </div>
              </div>

              {inspectKey.note && (
                <div className="pt-2 border-t border-[var(--border-soft)]">
                  <span className="text-[var(--muted)] text-[10px] uppercase block">Customer / Distributor Note</span>
                  <p className="text-[var(--ink)] font-ui text-xs mt-0.5">{inspectKey.note}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <div>
                {inspectKey.hwid && (
                  <button
                    onClick={() => {
                      setResetTargetKey(inspectKey);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-colors font-mono cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>Unbind Hardware ID</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setInspectKey(null)}
                className="px-4 py-1.5 text-xs rounded border border-[var(--border-soft)] hover:bg-[var(--surface-hover)] text-[var(--ink)] cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
