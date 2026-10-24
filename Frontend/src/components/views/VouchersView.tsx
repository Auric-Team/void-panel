import React, { useState, useEffect } from "react";
import { api, VoucherRecord } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import { Gift, Coins, Plus, Trash2, CheckCircle2, Sparkles, Copy, ArrowRight } from "lucide-react";

export const VouchersView: React.FC = () => {
  const { role, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Redeem Voucher state (for any logged in user)
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Create Voucher Modal state (for Owner & Admin)
  const [modalOpen, setModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newCredits, setNewCredits] = useState(100);
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const loadVouchers = async () => {
    if (role !== "owner" && role !== "admin") return;
    setLoading(true);
    try {
      const data = await api.getVouchers();
      setVouchers(data);
    } catch (err: any) {
      toast("Failed to load vouchers", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const res = await api.redeemVoucher(redeemCode);
      if (res.success) {
        toast(`🎉 ${res.message}`, "success");
        setRedeemCode("");
        refreshProfile();
        loadVouchers();
      }
    } catch (err: any) {
      toast("Redemption Failed", "error", err.message);
    } finally {
      setRedeeming(false);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createVoucher(newCode, newCredits, newMaxUses);
      if (res.success) {
        toast(`Gift Voucher ${res.voucher.code} created!`, "success");
        setModalOpen(false);
        setNewCode("");
        setNewCredits(100);
        loadVouchers();
      }
    } catch (err: any) {
      toast("Failed to create voucher", "error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this voucher?")) return;
    try {
      await api.deleteVoucher(id);
      toast("Voucher deleted", "info");
      loadVouchers();
    } catch (err: any) {
      toast("Failed to delete voucher", "error", err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Redeem Voucher Card (Visible to all roles) */}
      <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)] shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <h2 className="font-display text-lg font-medium text-[var(--ink)]">
                Redeem Credit Voucher
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-lg">
              Have a promotional gift voucher code? Enter it below to instantly credit your reseller balance.
            </p>
          </div>

          <form onSubmit={handleRedeem} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              required
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="e.g. VOID-WELCOME-100CR"
              className="px-3.5 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono min-w-[220px] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={redeeming}
              className="px-4 py-2 text-xs font-medium rounded bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>{redeeming ? "Verifying..." : "Redeem"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Admin / Owner Vouchers Management Table */}
      {(role === "owner" || role === "admin") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-medium">
              Vouchers Ledger & Campaign Generator
            </h3>
            <button
              onClick={() => {
                setNewCode(`VOID-GIFT-${Math.floor(1000 + Math.random() * 9000)}`);
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Gift Code</span>
            </button>
          </div>

          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface)] text-[var(--muted)] border-b border-[var(--border-soft)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">VOUCHER CODE</th>
                    <th className="px-4 py-3 font-medium">CREDITS VALUE</th>
                    <th className="px-4 py-3 font-medium">REDEMPTIONS</th>
                    <th className="px-4 py-3 font-medium">CREATED BY</th>
                    <th className="px-4 py-3 font-medium">CREATED DATE</th>
                    <th className="px-4 py-3 font-medium text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                        No active vouchers created yet.
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => {
                      const isExhausted = v.used_count >= v.max_uses;
                      return (
                        <tr key={v.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-[var(--ink)]">
                            <div className="flex items-center gap-2">
                              <span>{v.code}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(v.code);
                                  toast("Voucher code copied!", "success");
                                }}
                                className="text-[var(--muted)] hover:text-[var(--ink)]"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 font-mono font-semibold text-amber-500">
                              <Coins className="w-3.5 h-3.5" />
                              <span>+{v.credits} CR</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className={isExhausted ? "text-rose-500" : "text-emerald-500"}>
                              {v.used_count} / {v.max_uses} used
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--muted)]">
                            @{v.created_by}
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--muted)] text-[11px]">
                            {new Date(v.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-1 rounded text-[var(--muted)] hover:text-rose-500 hover:bg-[var(--surface)] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Voucher Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Credit Gift Voucher">
        <form onSubmit={handleCreateVoucher} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Voucher Code String
            </label>
            <input
              type="text"
              required
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="e.g. VOID-PROMO-500CR"
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Credits to Award (1 Day Key = 10 Credits)
            </label>
            <input
              type="number"
              min={1}
              required
              value={newCredits}
              onChange={(e) => setNewCredits(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Maximum Allowed Redemptions
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              required
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Set to 1 for a single-use gift code, or higher for Discord / community giveaways.
            </p>
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
              className="px-4 py-1.5 text-xs rounded bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)]"
            >
              {submitting ? "Creating..." : "Mint Voucher"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
