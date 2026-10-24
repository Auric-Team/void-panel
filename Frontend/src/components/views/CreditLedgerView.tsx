import React, { useState, useEffect } from "react";
import { api, CreditTransactionRecord } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toast";
import { Coins, ArrowDownRight, ArrowUpRight, Clock, Shield, Sparkles } from "lucide-react";

export const CreditLedgerView: React.FC = () => {
  const { role, credits } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<CreditTransactionRecord[]>([]);
  const [rates, setRates] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, ratesRes] = await Promise.all([
        api.getCreditLedger(),
        api.getCreditRates().catch(() => null),
      ]);
      setTransactions(txs);
      if (ratesRes?.rates) setRates(ratesRes.rates);
    } catch (err: any) {
      toast("Failed to load credit ledger", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Rate Matrix Card */}
      <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-display font-medium">Standard Credit Pricing Rules</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                24H Key = 10 Credits
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Automated deduction applied on key generation. Unused credits never expire.
            </p>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)]">
            <Coins className="w-4 h-4 text-amber-500" />
            <div>
              <span className="block text-[10px] text-[var(--muted)]">Your Balance</span>
              <span className="font-mono text-sm font-semibold text-amber-500">
                {role === "owner" ? "∞ Unlimited" : `${credits} Credits`}
              </span>
            </div>
          </div>
        </div>

        {/* Rates Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
          {[
            { days: "24 Hours (1D)", cost: 10, hot: true },
            { days: "3 Days", cost: 25 },
            { days: "7 Days (1W)", cost: 50 },
            { days: "30 Days (1M)", cost: 180 },
            { days: "Lifetime", cost: 3000 },
          ].map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-md border text-center ${
                r.hot
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-[var(--border-soft)] bg-[var(--surface-solid)]"
              }`}
            >
              <div className="text-[11px] text-[var(--muted)] font-mono">{r.days}</div>
              <div className="text-base font-mono font-semibold text-[var(--ink)] mt-0.5">
                {r.cost} <span className="text-[10px] text-[var(--muted)] font-normal">CR</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Audit Ledger Table */}
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--border-soft)] flex items-center justify-between">
          <h3 className="text-sm font-medium">Credit Transaction Audit Trail</h3>
          <span className="text-[10px] text-[var(--muted)] font-mono">
            {transactions.length} records recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface)] text-[var(--muted)] border-b border-[var(--border-soft)] font-medium">
              <tr>
                <th className="px-4 py-3">TYPE</th>
                <th className="px-4 py-3">ACCOUNT</th>
                <th className="px-4 py-3">AMOUNT</th>
                <th className="px-4 py-3">BALANCE AFTER</th>
                <th className="px-4 py-3">DESCRIPTION</th>
                <th className="px-4 py-3">PERFORMED BY</th>
                <th className="px-4 py-3">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                    No credit transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isPositive = t.amount > 0;
                  return (
                    <tr key={t.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${
                            isPositive
                              ? "border-[var(--success-border)] text-[var(--success)] bg-[var(--success-fill)]"
                              : "border-[var(--warning-border)] text-[var(--warning)] bg-[var(--warning-fill)]"
                          }`}
                        >
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">
                        @{t.target_user_name || `User #${t.user_id}`}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        <span className={isPositive ? "text-emerald-500" : "text-amber-500"}>
                          {isPositive ? `+${t.amount}` : t.amount} CR
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--muted)]">
                        {t.balance_after} CR
                      </td>
                      <td className="px-4 py-3 text-[var(--ink)]">
                        {t.description}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)] font-mono">
                        @{t.performed_by_name}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)] font-mono text-[11px]">
                        {new Date(t.created_at).toLocaleString()}
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
  );
};
