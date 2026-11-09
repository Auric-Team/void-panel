import React, { useState, useEffect } from "react";
import {
  api,
  CreditTransactionRecord,
  VoucherRecord,
  PaymentReceiptRecord,
  UserPublicProfile,
  copyToClipboard,
  formatReceiptText,
  printReceiptWindow,
} from "../../lib/api";
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
  Check,
  Trash2,
  CheckCircle2,
  Clock,
  Receipt,
  Printer,
  Eye,
  Upload,
  X,
} from "lucide-react";

export const CreditsView: React.FC = () => {
  const { user, role, credits, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<CreditTransactionRecord[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceiptRecord[]>([]);
  const [users, setUsers] = useState<UserPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Voucher redeem state
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Create voucher modal state
  const [createVoucherModal, setCreateVoucherModal] = useState(false);
  const [newVoucherCode, setNewVoucherCode] = useState("");
  const [newVoucherCredits, setNewVoucherCredits] = useState(100);
  const [newVoucherMaxUses, setNewVoucherMaxUses] = useState(1);
  const [creatingVoucher, setCreatingVoucher] = useState(false);

  // Create Payment Receipt Modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [rcpUsername, setRcpUsername] = useState("");
  const [rcpCustomerName, setRcpCustomerName] = useState("");
  const [rcpAmountPaid, setRcpAmountPaid] = useState(25);
  const [rcpCurrency, setRcpCurrency] = useState("USD");
  const [rcpCreditsGranted, setRcpCreditsGranted] = useState(250);
  const [rcpKeysSummary, setRcpKeysSummary] = useState("250 Reseller Credits Pack (25x 24H Keys)");
  const [rcpPaymentMethod, setRcpPaymentMethod] = useState("USDT (TRC20) / UPI");
  const [rcpTransactionRef, setRcpTransactionRef] = useState("");
  const [rcpStatus, setRcpStatus] = useState<"paid" | "pending" | "refunded">("paid");
  const [rcpNote, setRcpNote] = useState("");
  const [rcpProofImage, setRcpProofImage] = useState("");
  const [rcpAutoGrant, setRcpAutoGrant] = useState(true);
  const [creatingReceipt, setCreatingReceipt] = useState(false);

  // Inspect Single Receipt Modal
  const [inspectReceipt, setInspectReceipt] = useState<PaymentReceiptRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, vouchersData, receiptsData, usersData] = await Promise.all([
        api.getCreditLedger().catch(() => []),
        role === "owner" || role === "admin" ? api.getVouchers().catch(() => []) : Promise.resolve([]),
        api.getReceipts().catch(() => []),
        role === "owner" || role === "admin" ? api.getUsers().catch(() => []) : Promise.resolve([]),
      ]);
      setTransactions(txs);
      setVouchers(vouchersData);
      setReceipts(receiptsData);
      setUsers(usersData);
    } catch (err: any) {
      toast("Failed to load credits & receipts info", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleCopy = async (text: string, label = "Code") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 1600);
      toast(`${label} copied to clipboard!`, "success");
    } else {
      toast(`Failed to copy ${label}`, "error");
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = redeemCode.trim().toUpperCase();
    if (!clean) return;
    setRedeeming(true);
    try {
      const res = await api.redeemVoucher(clean);
      if (res.success) {
        toast(`Redeemed +${res.creditsAdded} credits!`, "success");
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
      const codeToSend =
        newVoucherCode.trim() ||
        `VOID-VOUCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
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

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingReceipt(true);
    try {
      const res = await api.createReceipt({
        username: rcpUsername.trim() || user?.username || "reseller",
        customerName: rcpCustomerName.trim() || rcpUsername.trim() || "VIP Customer",
        amountPaid: rcpAmountPaid,
        currency: rcpCurrency,
        creditsGranted: rcpCreditsGranted,
        keysSummary: rcpKeysSummary,
        paymentMethod: rcpPaymentMethod,
        transactionRef: rcpTransactionRef,
        proofImage: rcpProofImage,
        status: rcpStatus,
        note: rcpNote,
        autoGrantCredits: rcpAutoGrant && (role === "owner" || role === "admin"),
      });
      if (res.success && res.receipt) {
        toast(`Payment Receipt ${res.receipt.receipt_no} created!`, "success");
        setReceiptModalOpen(false);
        setRcpProofImage("");
        setInspectReceipt(res.receipt);
        refreshProfile();
        loadData();
      }
    } catch (err: any) {
      toast("Failed to create receipt", "error", err.message);
    } finally {
      setCreatingReceipt(false);
    }
  };

  const handleDeleteReceipt = async (id: number) => {
    if (!confirm("Delete this payment receipt?")) return;
    try {
      await api.deleteReceipt(id);
      toast("Payment receipt deleted", "info");
      loadData();
    } catch (err: any) {
      toast("Failed to delete receipt", "error", err.message);
    }
  };

  const handleGenerateReceiptFromTx = async (tx: CreditTransactionRecord) => {
    try {
      const creditsAmt = Math.abs(tx.amount);
      const res = await api.createReceipt({
        userId: tx.user_id,
        username: tx.target_user_name || user?.username || "account",
        customerName: `@${tx.target_user_name || user?.username || "account"}`,
        amountPaid: Math.max(1, Math.round(creditsAmt * 0.1)),
        currency: "USD",
        creditsGranted: creditsAmt,
        keysSummary: tx.description,
        paymentMethod: "Ledger Settlement",
        status: "paid",
        note: `Generated from Ledger TX #${tx.id}`,
        autoGrantCredits: false,
      });
      if (res.success && res.receipt) {
        toast(`Receipt ${res.receipt.receipt_no} generated!`, "success");
        setInspectReceipt(res.receipt);
        loadData();
      }
    } catch (err: any) {
      toast("Could not generate receipt", "error", err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 2 Cards: Balance Overview & 1-Click Voucher Redeem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="ref-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-mono text-[var(--muted)]">
                01 · Available Credits Balance
              </span>
              <span className="ref-badge warning font-mono uppercase text-[10px]">{role}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display text-4xl sm:text-5xl font-normal text-[var(--ink)]">
                {role === "owner" ? "∞" : credits.toLocaleString()}
              </span>
              <span className="text-sm font-mono text-amber-500 font-semibold">
                {role === "owner" ? "Unlimited (Master Owner)" : "Credits"}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-mono text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 1 Key (24 Hours) = 10 Credits
            </span>
            <button
              type="button"
              onClick={() => setReceiptModalOpen(true)}
              className="ref-btn primary !min-h-[30px] !px-3 text-xs font-semibold"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Create Payment Receipt</span>
            </button>
          </div>
        </div>

        {/* Quick Voucher Redeem */}
        <div className="ref-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-emerald-500" />
              <h2 className="font-display text-lg font-normal text-[var(--ink)]">
                Redeem Gift Voucher
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)] mb-4">
              Enter a promotional or reseller top-up voucher code to instantly credit your balance.
            </p>
          </div>
          <form onSubmit={handleRedeem} className="flex gap-2">
            <div className="ref-input-wrap flex-1">
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="e.g. VOID-WELCOME-100CR"
                className="w-full bg-transparent border-0 outline-none text-xs font-mono text-[var(--ink)]"
              />
            </div>
            <button
              type="submit"
              disabled={redeeming || !redeemCode.trim()}
              className="ref-btn primary !px-4 font-semibold"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{redeeming ? "Redeeming..." : "Redeem Code"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Section 02: Payment Receipts & Settlement Vouchers */}
      <div className="ref-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="ref-section-head">
            <span className="ref-section-number">02</span>
            <div>
              <h2 className="font-display text-xl font-normal text-[var(--ink)]">
                Payment Receipts &amp; Settlement Records ({receipts.length})
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Create, view, copy, or print official payment receipts for credit packs and license key settlements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReceiptModalOpen(true)}
              className="ref-btn primary font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Payment Receipt</span>
            </button>
          </div>
        </div>

        {receipts.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--muted)] font-mono">
            No payment receipts generated yet. Click "Create Payment Receipt" above to issue one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] text-[10px] uppercase">
                  <th className="py-2.5 px-3">Receipt No</th>
                  <th className="py-2.5 px-3">Account / Customer</th>
                  <th className="py-2.5 px-3">Amount Paid</th>
                  <th className="py-2.5 px-3">Credits / Summary</th>
                  <th className="py-2.5 px-3">Method &amp; Ref</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Issued On</th>
                  <th className="py-2.5 px-3 text-right">Receipt Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="py-3 px-3 font-bold text-[var(--ink)]">
                      <button
                        type="button"
                        onClick={() => setInspectReceipt(r)}
                        className="hover:text-[var(--accent)] underline decoration-dotted underline-offset-4 cursor-pointer"
                      >
                        {r.receipt_no}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[var(--ink)] font-semibold">@{r.username}</span>
                      {r.customer_name && r.customer_name !== r.username && (
                        <small className="block text-[10px] text-[var(--muted)]">{r.customer_name}</small>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-500">
                      {r.amount_paid.toFixed(2)} {r.currency}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-amber-500 font-bold">+{r.credits_granted} CR</span>
                      <small className="block text-[10px] text-[var(--muted)] font-sans truncate max-w-[180px]">
                        {r.keys_summary}
                      </small>
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      <span>{r.payment_method}</span>
                      <small className="block text-[10px] text-[var(--muted)]">{r.transaction_ref}</small>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`ref-badge !h-[20px] text-[10px] uppercase ${
                          r.status === "paid"
                            ? "success"
                            : r.status === "pending"
                            ? "warning"
                            : "danger"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[var(--muted)] text-[11px]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setInspectReceipt(r)}
                          className="ref-btn !min-h-[26px] !px-2 text-[10px]"
                          title="View Receipt"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(formatReceiptText(r), "Receipt Text")}
                          className="ref-btn !min-h-[26px] !px-2 text-[10px]"
                          title="Copy Receipt Text"
                        >
                          {copiedCode === formatReceiptText(r) ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => printReceiptWindow(r)}
                          className="ref-btn primary !min-h-[26px] !px-2 text-[10px]"
                          title="Print or Save Receipt as PDF"
                        >
                          <Printer className="w-3 h-3" /> PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReceipt(r.id)}
                          className="ref-btn danger !min-h-[26px] !px-2 text-[10px]"
                          title="Delete Receipt"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 03: Admin/Owner Voucher Management */}
      {(role === "owner" || role === "admin") && (
        <div className="ref-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="ref-section-head">
              <span className="ref-section-number">03</span>
              <div>
                <h2 className="font-display text-xl font-normal text-[var(--ink)]">
                  Promotional Gift Vouchers ({vouchers.length})
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Generate top-up voucher codes redeemable by resellers
                </p>
              </div>
            </div>
            <button
              onClick={() => setCreateVoucherModal(true)}
              className="ref-btn primary font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Voucher</span>
            </button>
          </div>

          {vouchers.length === 0 ? (
            <div className="text-center py-6 text-xs text-[var(--muted)] font-mono">
              No active vouchers.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--muted)] text-[10px] uppercase">
                    <th className="py-2 px-3">Voucher Code</th>
                    <th className="py-2 px-3">Credits</th>
                    <th className="py-2 px-3">Redemptions</th>
                    <th className="py-2 px-3">Created By</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {vouchers.map((v) => {
                    const isFullyUsed = v.used_count >= v.max_uses;
                    return (
                      <tr key={v.id} className="hover:bg-[var(--surface-hover)]">
                        <td className="py-2.5 px-3 font-semibold text-[var(--ink)] flex items-center gap-2">
                          <span>{v.code}</span>
                          <button
                            onClick={() => handleCopy(v.code, "Voucher code")}
                            className="ref-btn !min-h-[22px] !px-2 text-[10px]"
                          >
                            {copiedCode === v.code ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            Copy
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-amber-500 font-bold">+{v.credits} CR</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`ref-badge !h-[20px] text-[10px] ${
                              isFullyUsed ? "danger" : "success"
                            }`}
                          >
                            {v.used_count} / {v.max_uses} used
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--muted)]">@{v.created_by}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteVoucher(v.id)}
                            className="ref-btn danger !min-h-[24px] !px-2"
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

      {/* Section 04: Credit History Ledger */}
      <div className="ref-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="ref-section-head">
            <span className="ref-section-number">04</span>
            <div>
              <h2 className="font-display text-xl font-normal text-[var(--ink)]">
                Credit Audit Ledger ({transactions.length})
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Every credit grant, key deduction, and voucher redemption with 1-click receipt generation
              </p>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--muted)] font-mono">
            No credit activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)] text-[10px] uppercase">
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Account</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Balance After</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-2.5 px-3">
                        <span
                          className={`ref-badge !h-[20px] text-[10px] font-semibold ${
                            isPositive ? "success" : "danger"
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
                      <td className="py-2.5 px-3 font-semibold text-[var(--ink)]">
                        @{tx.target_user_name || user?.username}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          isPositive ? "text-emerald-500" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${tx.amount}` : tx.amount} CR
                      </td>
                      <td className="py-2.5 px-3 text-[var(--ink)] font-semibold">
                        {tx.balance_after} CR
                      </td>
                      <td className="py-2.5 px-3 text-[var(--muted)] max-w-xs truncate font-sans">
                        {tx.description}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--muted)] text-[11px]">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleGenerateReceiptFromTx(tx)}
                          className="ref-btn !min-h-[24px] !px-2 text-[10px]"
                          title="Generate an official payment receipt from this ledger entry"
                        >
                          <Receipt className="w-3 h-3 text-emerald-500" />
                          <span>Issue Receipt</span>
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

      {/* Modal: Create Payment Receipt */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Create Official Payment Receipt"
        subtitle="Generate a verifiable payment receipt and optionally credit the target reseller account"
        icon={<Receipt className="w-5 h-5 text-emerald-500" />}
      >
        <form onSubmit={handleCreateReceipt} className="space-y-3.5 text-xs font-ui">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Target Account Username
              </label>
              <div className="ref-input-wrap !min-h-[36px]">
                <input
                  type="text"
                  list="void-users-list"
                  value={rcpUsername}
                  onChange={(e) => setRcpUsername(e.target.value)}
                  placeholder="e.g. reseller"
                  className="w-full bg-transparent border-0 outline-none font-mono text-xs text-[var(--ink)]"
                  required
                />
                <datalist id="void-users-list">
                  {users.map((u) => (
                    <option key={u.id} value={u.username}>
                      @{u.username} ({u.role})
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Customer / Billing Name
              </label>
              <div className="ref-input-wrap !min-h-[36px]">
                <input
                  type="text"
                  value={rcpCustomerName}
                  onChange={(e) => setRcpCustomerName(e.target.value)}
                  placeholder="e.g. VIP Reseller Partner"
                  className="w-full bg-transparent border-0 outline-none text-xs text-[var(--ink)]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Amount Paid
              </label>
              <div className="ref-input-wrap !min-h-[36px]">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={rcpAmountPaid}
                  onChange={(e) => setRcpAmountPaid(Number(e.target.value))}
                  className="w-full bg-transparent border-0 outline-none font-mono text-xs text-[var(--ink)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Currency
              </label>
              <select
                value={rcpCurrency}
                onChange={(e) => setRcpCurrency(e.target.value)}
                className="w-full h-[36px] px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono text-xs outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USDT">USDT</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Credits Granted
              </label>
              <div className="ref-input-wrap !min-h-[36px]">
                <input
                  type="number"
                  min="0"
                  value={rcpCreditsGranted}
                  onChange={(e) => setRcpCreditsGranted(Number(e.target.value))}
                  className="w-full bg-transparent border-0 outline-none font-mono text-xs text-[var(--ink)]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Payment Method
              </label>
              <div className="ref-input-wrap !min-h-[36px]">
                <input
                  type="text"
                  value={rcpPaymentMethod}
                  onChange={(e) => setRcpPaymentMethod(e.target.value)}
                  placeholder="UPI / USDT / Crypto / PayPal"
                  className="w-full bg-transparent border-0 outline-none text-xs text-[var(--ink)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Transaction Ref / Hash (Optional)
              </label>
              <div className="ref-input-wrap !min-h-[36px]">
                <input
                  type="text"
                  value={rcpTransactionRef}
                  onChange={(e) => setRcpTransactionRef(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full bg-transparent border-0 outline-none font-mono text-xs text-[var(--ink)]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Order / Package Summary
            </label>
            <div className="ref-input-wrap !min-h-[36px]">
              <input
                type="text"
                value={rcpKeysSummary}
                onChange={(e) => setRcpKeysSummary(e.target.value)}
                placeholder="e.g. 250 Credits Top-Up / 10x 30D Keys"
                className="w-full bg-transparent border-0 outline-none text-xs text-[var(--ink)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Payment Receipt Screenshot / Proof Image (Optional)
            </label>
            {rcpProofImage ? (
              <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img
                    src={rcpProofImage}
                    alt="Receipt Proof"
                    className="w-12 h-12 object-cover rounded border border-[var(--border-soft)]"
                  />
                  <span className="font-mono text-[11px] text-[var(--success)] font-semibold">
                    ✓ Payment Proof Screenshot Attached
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRcpProofImage("")}
                  className="ref-btn danger !min-h-[26px] !px-2 text-[10px]"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface)] cursor-pointer text-xs text-[var(--muted)]">
                <Upload className="w-4 h-4 text-[var(--accent)]" />
                <span>Upload Payment Screenshot (PNG/JPG)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") setRcpProofImage(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {(role === "owner" || role === "admin") && (
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] cursor-pointer">
              <input
                type="checkbox"
                checked={rcpAutoGrant}
                onChange={(e) => setRcpAutoGrant(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--ink)]">
                Automatically add <strong>+{rcpCreditsGranted} CR</strong> to @{rcpUsername || "account"} upon creating receipt
              </span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setReceiptModalOpen(false)} className="ref-btn">
              Cancel
            </button>
            <button type="submit" disabled={creatingReceipt} className="ref-btn primary font-semibold">
              {creatingReceipt ? "Issuing Receipt..." : "Issue Payment Receipt"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Inspect Official Payment Receipt Voucher */}
      <Modal
        isOpen={Boolean(inspectReceipt)}
        onClose={() => setInspectReceipt(null)}
        title={inspectReceipt ? `Payment Receipt — ${inspectReceipt.receipt_no}` : "Payment Receipt"}
        subtitle="Official cryptographic license & credit settlement voucher"
        icon={<Receipt className="w-5 h-5 text-emerald-500" />}
      >
        {inspectReceipt && (
          <div className="space-y-4 text-xs">
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <span className="text-[10px] text-[var(--muted)] uppercase block">Receipt Number</span>
                  <strong className="text-sm text-[var(--ink)]">{inspectReceipt.receipt_no}</strong>
                </div>
                <span className="ref-badge success uppercase">{inspectReceipt.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-[10px] text-[var(--muted)] uppercase block">Account</span>
                  <strong>@{inspectReceipt.username}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted)] uppercase block">Customer</span>
                  <strong>{inspectReceipt.customer_name || inspectReceipt.username}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted)] uppercase block">Payment Method</span>
                  <strong>{inspectReceipt.payment_method}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted)] uppercase block">Reference</span>
                  <strong>{inspectReceipt.transaction_ref}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted)] uppercase block">Credits Granted</span>
                  <strong className="text-amber-500">+{inspectReceipt.credits_granted} CR</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted)] uppercase block">Date Issued</span>
                  <strong>{new Date(inspectReceipt.created_at).toLocaleString()}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] uppercase block">Summary</span>
                <p className="text-[var(--ink)] font-sans text-xs mt-0.5">{inspectReceipt.keys_summary}</p>
              </div>

              {inspectReceipt.proof_image && (
                <div className="pt-2 border-t border-[var(--line)]">
                  <span className="text-[10px] text-[var(--muted)] uppercase block mb-1.5">
                    Attached Payment Proof Screenshot
                  </span>
                  <img
                    src={inspectReceipt.proof_image}
                    alt="Payment Proof"
                    className="max-h-56 w-auto rounded border border-[var(--border)] bg-[var(--surface-solid)]"
                  />
                </div>
              )}

              <div className="p-3 rounded-lg bg-[var(--primary-gradient)] text-white flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider opacity-80">Total Amount Paid</span>
                <strong className="font-display text-2xl font-normal">
                  {inspectReceipt.amount_paid.toFixed(2)} {inspectReceipt.currency}
                </strong>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => handleCopy(formatReceiptText(inspectReceipt), "Receipt")}
                className="ref-btn font-mono"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Receipt Text</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => printReceiptWindow(inspectReceipt)}
                  className="ref-btn primary font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectReceipt(null)}
                  className="ref-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create Voucher */}
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
            <div className="ref-input-wrap">
              <input
                type="text"
                value={newVoucherCode}
                onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                placeholder="Leave empty for auto-generated VOID-XXXX"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Credits Amount
            </label>
            <div className="ref-input-wrap">
              <input
                type="number"
                min="10"
                max="50000"
                value={newVoucherCredits}
                onChange={(e) => setNewVoucherCredits(Number(e.target.value))}
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Max Redemptions
            </label>
            <div className="ref-input-wrap">
              <input
                type="number"
                min="1"
                max="1000"
                value={newVoucherMaxUses}
                onChange={(e) => setNewVoucherMaxUses(Number(e.target.value))}
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setCreateVoucherModal(false)} className="ref-btn">
              Cancel
            </button>
            <button type="submit" disabled={creatingVoucher} className="ref-btn primary font-semibold">
              {creatingVoucher ? "Generating..." : `Create Voucher (+${newVoucherCredits} CR)`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
