import React, { useState, useEffect } from "react";
import { api, BanRecord, copyToClipboard } from "../../lib/api";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import { Plus, Trash2, Smartphone, Globe, Copy, Check } from "lucide-react";

export const BansView: React.FC = () => {
  const { toast } = useToast();
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 1500);
      toast(`Copied ${text} to clipboard`, "success");
    }
  };

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
    <div className="space-y-5">
      <div className="ref-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="ref-section-head">
          <span className="ref-section-number">02</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-normal text-[var(--ink)]">
                Security Blacklist &amp; Hardware Bans
              </h2>
              <span className="ref-badge danger font-mono text-[10px]">
                {bans.length} Active Bans
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Banned device HWIDs or network IPs are immediately rejected at the socket authentication gate.
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="ref-btn solid-danger font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Add Blacklist Ban</span>
        </button>
      </div>

      <div className="ref-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface)] text-[var(--muted)] border-b border-[var(--line)] font-mono text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Identifier (HWID / IP)</th>
                <th className="px-4 py-3 font-medium">Ban Reason</th>
                <th className="px-4 py-3 font-medium">Banned By</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {bans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)] font-mono">
                    No active hardware or IP bans. System is clear.
                  </td>
                </tr>
              ) : (
                bans.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`ref-badge !h-[22px] text-[10px] font-mono uppercase ${
                          b.type === "hwid" ? "warning" : "info"
                        }`}
                      >
                        {b.type === "hwid" ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {b.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-[var(--ink)]">
                      <div className="flex items-center gap-2">
                        <span>{b.value}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(b.value)}
                          className="ref-btn !min-h-[22px] !px-1.5 text-[10px]"
                        >
                          {copiedId === b.value ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{b.reason}</td>
                    <td className="px-4 py-3 font-mono text-[var(--muted)]">@{b.banned_by}</td>
                    <td className="px-4 py-3 font-mono text-[var(--muted)] text-[11px]">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveBan(b)}
                        title="Remove ban"
                        className="ref-btn danger !min-h-[26px] !px-2.5 text-[11px]"
                      >
                        <Trash2 className="w-3 h-3" /> Unban
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Hardware ID or IP Blacklist Entry"
        subtitle="Immediately block a client HWID or IP from authenticating"
      >
        <form onSubmit={handleAddBan} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--muted)] font-mono uppercase text-[10px] mb-1">
              Target Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBanType("hwid")}
                className={`ref-btn font-mono ${banType === "hwid" ? "primary font-semibold" : ""}`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Device HWID
              </button>
              <button
                type="button"
                onClick={() => setBanType("ip")}
                className={`ref-btn font-mono ${banType === "ip" ? "primary font-semibold" : ""}`}
              >
                <Globe className="w-3.5 h-3.5" /> Network IP
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] font-mono uppercase text-[10px] mb-1">
              {banType === "hwid" ? "Hardware Identifier (HWID)" : "IP Address"}
            </label>
            <div className="ref-input-wrap">
              <input
                type="text"
                required
                value={banValue}
                onChange={(e) => setBanValue(e.target.value.trim())}
                placeholder={banType === "hwid" ? "HWID-XXXXXXXXXXXXXXXX" : "192.168.1.1"}
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] font-mono uppercase text-[10px] mb-1">
              Ban Reason
            </label>
            <div className="ref-input-wrap">
              <input
                type="text"
                required
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Memory dumping / Anti-tamper violation"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="ref-btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="ref-btn solid-danger font-semibold">
              {submitting ? "Blacklisting..." : "Enforce Blacklist"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
