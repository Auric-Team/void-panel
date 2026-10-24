import React, { useState, useEffect } from "react";
import { api, BanRecord } from "../../lib/api";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import { ShieldAlert, ShieldCheck, Plus, Trash2, Smartphone, Globe, AlertTriangle } from "lucide-react";

export const BansView: React.FC = () => {
  const { toast } = useToast();
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Ban Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [banType, setBanType] = useState<"hwid" | "ip">("hwid");
  const [banValue, setBanValue] = useState("");
  const [banReason, setBanReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBans = async () => {
    setLoading(true);
    try {
      const data = await api.getBans();
      setBans(data);
    } catch (err: any) {
      toast("Failed to load blacklist", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBans();
  }, []);

  const handleAddBan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.addBan(banType, banValue, banReason);
      if (res.success) {
        toast(`Blacklisted ${banType.toUpperCase()} ${banValue}`, "success");
        setModalOpen(false);
        setBanValue("");
        setBanReason("");
        loadBans();
      }
    } catch (err: any) {
      toast("Failed to add blacklist entry", "error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveBan = async (ban: BanRecord) => {
    if (!confirm(`Are you sure you want to unban ${ban.value}?`)) return;
    try {
      await api.removeBan(ban.id);
      toast(`Removed ban for ${ban.value}`, "info");
      loadBans();
    } catch (err: any) {
      toast("Failed to remove ban", "error", err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-display tracking-tight font-medium">
              Security Blacklist & Hardware Bans
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
              {bans.length} Active Bans
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Banned device HWIDs or network IPs are immediately rejected by the socket authentication gate.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Blacklist Ban</span>
        </button>
      </div>

      {/* Bans Table */}
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface)] text-[var(--muted)] border-b border-[var(--border-soft)]">
              <tr>
                <th className="px-4 py-3 font-medium">TYPE</th>
                <th className="px-4 py-3 font-medium">IDENTIFIER (HWID / IP)</th>
                <th className="px-4 py-3 font-medium">BAN REASON</th>
                <th className="px-4 py-3 font-medium">BANNED BY</th>
                <th className="px-4 py-3 font-medium">DATE</th>
                <th className="px-4 py-3 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {bans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                    No active hardware or IP bans. System is clear.
                  </td>
                </tr>
              ) : (
                bans.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                          b.type === "hwid"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                        }`}
                      >
                        {b.type === "hwid" ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {b.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-[var(--ink)]">
                      {b.value}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {b.reason}
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--muted)]">
                      @{b.banned_by}
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--muted)] text-[11px]">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveBan(b)}
                        title="Remove ban"
                        className="px-2.5 py-1 text-[11px] rounded border border-[var(--border-soft)] hover:bg-rose-500/10 hover:text-rose-500 text-[var(--muted)] transition-colors"
                      >
                        Unban
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Ban Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Hardware ID or IP Blacklist Entry">
        <form onSubmit={handleAddBan} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Target Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBanType("hwid")}
                className={`py-2 text-center rounded text-xs border font-mono transition-all ${
                  banType === "hwid"
                    ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold border-transparent"
                    : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)]"
                }`}
              >
                📱 Device HWID
              </button>
              <button
                type="button"
                onClick={() => setBanType("ip")}
                className={`py-2 text-center rounded text-xs border font-mono transition-all ${
                  banType === "ip"
                    ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold border-transparent"
                    : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)]"
                }`}
              >
                🌐 Network IP
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              {banType === "hwid" ? "Hardware Identifier (HWID)" : "IP Address"}
            </label>
            <input
              type="text"
              required
              value={banValue}
              onChange={(e) => setBanValue(e.target.value.trim())}
              placeholder={banType === "hwid" ? "HWID-XXXXXXXXXXXXXXXX" : "192.168.1.1"}
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Ban Reason
            </label>
            <input
              type="text"
              required
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Memory dumping / Anti-tamper violation"
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-1.5 text-xs rounded border border-[var(--border-soft)] hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs rounded bg-rose-600 text-white hover:bg-rose-700"
            >
              {submitting ? "Blacklisting..." : "Enforce Blacklist"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
