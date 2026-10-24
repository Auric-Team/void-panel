import React, { useState, useEffect } from "react";
import { api, CreditTransactionRecord, VoucherRecord } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import {
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  Gift,
  Plus,
  Copy,
  Trash2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export const CreditsView: React.FC = () => {
  const { role, credits, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<CreditTransactionRecord[]>([]);
  const [rates, setRates] = useState<Record<number, number>>({});
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Voucher redeem state
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Create voucher modal state (Owner & Admin only)
  const [createVoucherModal, setCreateVoucherModal] = useState(false);
  const [newVoucherCode, setNewVoucherCode] = useState("");
  const [newVoucherCredits, setNewVoucherCredits] = useState(100);
  const [newVoucherMaxUses, setNewVoucherMaxUses] = useState(1);
  const [creatingVoucher, setCreatingVoucher] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, ratesRes, vouchersData] = await Promise.all([
        api.getCreditLedger().catch(() => []),
        api.getCreditRates().catch(() => null),
        role === "owner" || role === "admin"
          ? api.getVouchers().catch(() => [])
          : Promise.resolve([]),
      ]);
      setTransactions(txs);
      if (ratesRes?.rates) setRates(ratesRes.rates);
      setVouchers(vouchersData);
    } catch (err: any) {
      toast("Failed to load credits info", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = redeemCode.trim().toUpperCase();
    if (!clean) return;
    setRedeeming(true);
    try {
      const res = await api.redeemVoucher(clean);
      if (res.success) {
        toast(`🎉 Success! ${res.message} (+${res.creditsAdded} credits)`, "success");
        setRedeemCode("");
        refreshProfile();
        loadData();
      }
    } catch (err: any) {
      toast("Voucher Failed", "error", err.message);
    } finally {
      setRedeeming(false);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingVoucher(true);
    try {
      const codeToSend = newVoucherCode.trim() || `VOID-VOUCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const res = await api.createVoucher(codeToSend, newVoucherCredits, newVoucherMaxUses);
      if (res.success && res.voucher) {
        toast(`Voucher ${res.voucher.code} created!`, "success");
        setCreateVoucherModal(false);
        setNewVoucherCode("");
        loadData();
      }
    } catch (err: any) {
      toast("Failed to create voucher", "error", err.message);
    } finally {
      setCreatingVoucher(false);
    }
  };

  const handleDeleteVoucher = async (id: number) => {
    try {
      await api.deleteVoucher(id);
      toast("Voucher deleted", "success");
      loadData();
    } catch (err: any) {
      toast("Delete failed", "error", err.message);
    }
  };

  const handleCopy = (text: string, label = "Code") => {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard!`, "success");
  };

  return (
    <div className="space-y-6">
      {/* Top 2 Cards: Balance Overview & 1-Click Voucher Redeem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Balance & Rule */}
        <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-mono text-[var(--muted)]">
                Available Credits Balance
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-500 border border-amber-500/30">
                {role}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display text-4xl sm:text-5xl font-medium text-[var(--ink)]">
                {role === "owner" ? "∞" : credits.toLocaleString()}
              </span>
              <span className="text-sm font-mono text-amber-500 font-semibold">
                {role === "owner" ? "Unlimited (Master Owner)" : "Credits"}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border-soft)] flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 1 Key (24 Hours) = 10 Credits
            </span>
            <span>Credits never expire</span>
          </div>
        </div>

        {/* Card 2: Quick Voucher Redeem */}
        <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-[var(--ink)]">Redeem Gift Voucher</h2>
            </div>
            <p className="text-xs text-[var(--muted)] mb-4">
              Enter a promotional or top-up voucher code to instantly credit your balance.
            </p>
          </div>
          <form onSubmit={handleRedeem} className="flex gap-2">
            <input
              type="text"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="e.g. VOID-PROMO-100"
              className="flex-1 px-3 py-2 text-xs font-mono rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={redeeming || !redeemCode.trim()}
              className="primary-btn px-4 py-2 text-xs font-medium rounded-md flex items-center gap-1.5 shrink-0 disabled:opacity-40"
            >
              <Coins className="w-3.5 h-3.5" />
              {redeeming ? "Redeeming..." : "Redeem"}
            </button>
          </form>
        </div>
      </div>

      {/* Credit Pricing Rates Banner */}
      <div className="p-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase font-mono tracking-wider text-[var(--muted)]">
            Transparent Credit Pricing Rules
          </span>
          <span className="text-[11px] text-[var(--muted)] font-mono">Deducted automatically on key generation</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center font-mono">
          <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-500/5">
            <div className="text-[10px] text-emerald-400 font-semibold uppercase">24 Hours (1 Day)</div>
            <div className="text-base font-bold text-[var(--ink)] mt-0.5">10 CR</div>
          </div>
          <div className="p-2.5 rounded border border-[var(--border-soft)] bg-[var(--surface)]">
            <div className="text-[10px] text-[var(--muted)] uppercase">3 Days</div>
            <div className="text-base font-bold text-[var(--ink)] mt-0.5">25 CR</div>
          </div>
          <div className="p-2.5 rounded border border-[var(--border-soft)] bg-[var(--surface)]">
            <div className="text-[10px] text-[var(--muted)] uppercase">7 Days (1 Week)</div>
            <div className="text-base font-bold text-[var(--ink)] mt-0.5">50 CR</div>
          </div>
          <div className="p-2.5 rounded border border-[var(--border-soft)] bg-[var(--surface)]">
            <div className="text-[10px] text-[var(--muted)] uppercase">30 Days (1 Month)</div>
            <div className="text-base font-bold text-[var(--ink)] mt-0.5">180 CR</div>
          </div>
          <div className="p-2.5 rounded border border-[var(--border-soft)] bg-[var(--surface)]">
            <div className="text-[10px] text-[var(--muted)] uppercase">90 Days (3 Months)</div>
            <div className="text-base font-bold text-[var(--ink)] mt-0.5">450 CR</div>
          </div>
          <div className="p-2.5 rounded border border-amber-500/30 bg-amber-500/5">
            <div className="text-[10px] text-amber-500 font-semibold uppercase">Lifetime</div>
            <div className="text-base font-bold text-[var(--ink)] mt-0.5">3,000 CR</div>
          </div>
        </div>
      </div>

      {/* Admin/Owner Voucher Management */}
      {(role === "owner" || role === "admin") && (
        <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                Voucher Management ({vouchers.length})
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Generate top-up voucher codes for your resellers or promotional campaigns.
              </p>
            </div>
            <button
              onClick={() => setCreateVoucherModal(true)}
              className="primary-btn px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate Voucher Code
            </button>
          </div>

          {vouchers.length === 0 ? (
            <div className="text-center py-6 text-xs text-[var(--muted)] font-mono">
              No active vouchers. Click "Generate Voucher Code" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-[var(--muted)] text-[10px] uppercase">
                    <th className="py-2 px-3">Voucher Code</th>
                    <th className="py-2 px-3">Credits</th>
                    <th className="py-2 px-3">Redemptions</th>
                    <th className="py-2 px-3">Created By</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {vouchers.map((v) => {
                    const isFullyUsed = v.used_count >= v.max_uses;
                    return (
                      <tr key={v.id} className="hover:bg-[var(--surface-hover)]">
                        <td className="py-2.5 px-3 font-semibold text-[var(--ink)] flex items-center gap-2">
                          <span>{v.code}</span>
                          <button
                            onClick={() => handleCopy(v.code, "Voucher code")}
                            className="p-1 rounded hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
                            title="Copy code"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-amber-500 font-bold">
                          +{v.credits} CR
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              isFullyUsed
                                ? "bg-rose-500/10 text-rose-400"
                                : "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {v.used_count} / {v.max_uses} used
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--muted)]">@{v.created_by}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteVoucher(v.id)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                            title="Delete voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Credit Transactions Ledger */}
      <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--muted)]" />
            Credit History Ledger ({transactions.length})
          </h2>
          <span className="text-[10px] text-[var(--muted)] font-mono">Real-time audit records</span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--muted)] font-mono">
            No credit activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[var(--muted)] text-[10px] uppercase">
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Balance After</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Performed By</th>
                  <th className="py-2 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isPositive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${tx.amount}` : tx.amount} CR
                      </td>
                      <td className="py-2.5 px-3 text-[var(--ink)] font-semibold">
                        {tx.balance_after} CR
                      </td>
                      <td className="py-2.5 px-3 text-[var(--muted)] max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--muted)]">
                        @{tx.performed_by_name || "system"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[var(--muted)]">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Voucher (Owner & Admin) */}
      <Modal
        isOpen={createVoucherModal}
        onClose={() => setCreateVoucherModal(false)}
        title="Generate Gift Voucher"
        subtitle="Create an authenticated promotional code redeemable for balance credits"
      >
        <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs font-ui">
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Custom Voucher Code (Optional)
            </label>
            <input
              type="text"
              value={newVoucherCode}
              onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
              placeholder="Leave empty for auto-generated VOID-XXXX"
              className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Credits Amount
            </label>
            <input
              type="number"
              min="10"
              max="50000"
              value={newVoucherCredits}
              onChange={(e) => setNewVoucherCredits(Number(e.target.value))}
              className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Max Redemptions
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={newVoucherMaxUses}
              onChange={(e) => setNewVoucherMaxUses(Number(e.target.value))}
              className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setCreateVoucherModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingVoucher}
              className="primary-btn px-4 py-2 rounded-md font-medium"
            >
              {creatingVoucher ? "Generating..." : `Create Voucher (+${newVoucherCredits} CR)`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
