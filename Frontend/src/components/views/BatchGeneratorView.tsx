import React, { useState } from "react";
import {
  api,
  KeyRecord,
  PaymentReceiptRecord,
  copyToClipboard,
  printReceiptWindow,
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  Sparkles,
  Copy,
  Check,
  Download,
  RefreshCw,
  AlertCircle,
  Receipt,
  Upload,
  X,
  Printer,
} from "lucide-react";
import { useToast } from "../Toast";

interface BatchGeneratorViewProps {
  onSuccess: () => void;
}

export const BatchGeneratorView: React.FC<BatchGeneratorViewProps> = ({ onSuccess }) => {
  const { role, credits, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState("VOID");
  const [durationDays, setDurationDays] = useState(1);
  const [note, setNote] = useState("");

  // Payment Receipt fields for Batch Minting
  const [customerName, setCustomerName] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [proofImage, setProofImage] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<KeyRecord[]>([]);
  const [generatedReceipt, setGeneratedReceipt] = useState<PaymentReceiptRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const getUnitCost = (days: number) => {
    if (days === 1) return 10;
    if (days === 3) return 25;
    if (days === 7) return 50;
    if (days === 30) return 180;
    if (days === 90) return 450;
    if (days === 365) return 1500;
    if (days === 0) return 3000;
    return Math.max(10, Math.round(days * 8));
  };

  const unitCost = getUnitCost(durationDays);
  const totalCost = unitCost * count;
  const canAfford = role === "owner" || credits >= totalCost;

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("Image too large", "error", "Please select an image smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProofImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAfford) {
      toast("Insufficient Credits", "error", `You need ${totalCost} credits, but have ${credits}.`);
      return;
    }

    setGenerating(true);
    try {
      const receiptPayload =
        customerName.trim() || Number(amountPaid) > 0 || transactionRef.trim() || proofImage
          ? {
              customerName: customerName.trim(),
              amountPaid: Number(amountPaid) || 0,
              currency,
              paymentMethod,
              transactionRef: transactionRef.trim(),
              proofImage,
            }
          : undefined;

      const res = await api.createBatchKeys(count, durationDays, prefix, note, receiptPayload);
      if (res.success && res.keys) {
        setGeneratedKeys(res.keys);
        setGeneratedReceipt(res.receipt || null);
        toast(
          `Minted ${res.count} keys & dispatched to Owner!`,
          "success",
          `Cost: ${role === "owner" ? 0 : totalCost} credits`
        );
        refreshProfile();
        onSuccess();
      }
    } catch (err: any) {
      toast("Batch generation failed", "error", err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyAll = async () => {
    if (generatedKeys.length === 0) return;
    const txt = generatedKeys.map((k) => k.key_str).join("\n");
    const ok = await copyToClipboard(txt);
    if (ok) {
      setCopiedKey("ALL");
      setTimeout(() => setCopiedKey(null), 1600);
      toast(`All ${generatedKeys.length} batch keys copied to clipboard!`, "success");
    } else {
      toast("Failed to copy batch keys", "error");
    }
  };

  const handleCopySingle = async (keyStr: string) => {
    const ok = await copyToClipboard(keyStr);
    if (ok) {
      setCopiedKey(keyStr);
      setTimeout(() => setCopiedKey(null), 1500);
      toast(`Key ${keyStr} copied!`, "success");
    }
  };

  const handleDownloadTxt = () => {
    if (generatedKeys.length === 0) return;
    const txt = generatedKeys.map((k) => k.key_str).join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `void_batch_${prefix}_${generatedKeys.length}keys.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Batch keys downloaded as TXT", "info");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Form: Configuration */}
      <div className="ref-panel p-6">
        <div className="ref-section-head">
          <div className="flex items-start gap-3">
            <span className="ref-section-number">01</span>
            <div>
              <div className="ref-eyebrow">Bulk Provisioning</div>
              <h2>Batch Key Generator &amp; Payment Receipt</h2>
            </div>
          </div>
          <span className="ref-badge info text-[10px]">Auto-Dispatches to Owner</span>
        </div>

        {/* Credit Cost Estimate Capsule */}
        <div className="p-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] mb-5 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">
              Unit Rate ({durationDays === 0 ? "Lifetime" : durationDays === 1 ? "24 Hours" : `${durationDays} Days`}):
            </span>
            <span className="font-semibold">{unitCost} CR / Key</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Quantity:</span>
            <span className="font-semibold">{count} Keys</span>
          </div>
          <div className="border-t border-[var(--line)] pt-2 flex items-center justify-between">
            <span className="font-medium text-[var(--ink)]">Total Required Credits:</span>
            <span className="font-bold text-amber-500 text-sm">
              {role === "owner" ? "0 (Owner Free)" : `${totalCost} Credits`}
            </span>
          </div>
          {role !== "owner" && (
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span>Your Balance:</span>
              <span className={credits >= totalCost ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                {credits} Credits
              </span>
            </div>
          )}
          {!canAfford && (
            <div className="flex items-center gap-1.5 p-2 rounded bg-[var(--danger-fill)] border border-[var(--danger-border)] text-[var(--danger)] text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Insufficient credits. Need {totalCost - credits} more credits.</span>
            </div>
          )}
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="ref-label">Key Prefix</label>
              <div className="ref-input-wrap">
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. VOID, RESELL, VIP"
                  className="font-mono font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="ref-label">Batch Memo / Note</label>
              <div className="ref-input-wrap">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Reseller Batch Alpha"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="ref-label !mb-0">Quantity of Keys</label>
              <span className="font-mono font-bold text-[var(--ink)] text-sm">{count} keys</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full cursor-pointer accent-[var(--accent)]"
            />
          </div>

          <div>
            <label className="ref-label">Subscription Duration &amp; Rate</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { days: 1, label: "24 Hours (10 CR)" },
                { days: 3, label: "3 Days (25 CR)" },
                { days: 7, label: "7 Days (50 CR)" },
                { days: 30, label: "30 Days (180 CR)" },
                { days: 90, label: "90 Days (450 CR)" },
                { days: 0, label: "Lifetime (3000 CR)" },
              ].map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDurationDays(d.days)}
                  className={`ref-btn !px-2 font-mono text-[11px] ${
                    durationDays === d.days ? "primary" : ""
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Receipt of Payment Section */}
          <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">
                Receipt of Payment &amp; Proof (Optional · Sent to Owner)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="ref-label">Buyer / Reseller Name</label>
                <div className="ref-input-wrap">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. @batch_buyer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className="col-span-2">
                  <label className="ref-label">Amount Paid</label>
                  <div className="ref-input-wrap">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="ref-label">Curr</label>
                  <div className="ref-input-wrap !px-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="font-mono"
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="USDT">USDT</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="ref-label">Payment Method</label>
                <div className="ref-input-wrap">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="font-mono"
                  >
                    <option value="UPI">UPI / GPay</option>
                    <option value="USDT / Crypto">USDT / Crypto</option>
                    <option value="Binance Pay">Binance Pay</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="ref-label">Transaction ID / UTR</label>
                <div className="ref-input-wrap">
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="UTR / TXHash"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {proofImage ? (
              <div className="p-2 rounded border border-[var(--border)] bg-[var(--surface-solid)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img
                    src={proofImage}
                    alt="Payment Proof"
                    className="w-10 h-10 object-cover rounded border border-[var(--border-soft)]"
                  />
                  <span className="font-mono text-[11px] text-[var(--success)] font-semibold">
                    ✓ Payment Proof Screenshot Attached
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setProofImage("")}
                  className="ref-btn danger !min-h-[26px] !px-2 text-[10px]"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-2.5 rounded border border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-solid)] cursor-pointer text-[11px] text-[var(--muted)]">
                <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Upload Payment Screenshot (PNG/JPG)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={generating || !canAfford}
              className="ref-btn primary w-full !min-h-[40px]"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Minting &amp; Dispatching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Mint {count} Keys &amp; Dispatch to Owner ({role === "owner" ? "Owner Free" : `${totalCost} CR`})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Output & 1-Click Copy / Download */}
      <div className="ref-panel p-6 flex flex-col justify-between">
        <div>
          <div className="ref-section-head">
            <div className="flex items-start gap-3">
              <span className="ref-section-number">02</span>
              <div>
                <div className="ref-eyebrow">Minted Output</div>
                <h2>Generated Batch Keys</h2>
              </div>
            </div>
            {generatedKeys.length > 0 && (
              <span className="ref-badge success font-mono text-[10px]">
                {generatedKeys.length} Minted
              </span>
            )}
          </div>

          {generatedKeys.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="ref-btn primary flex-1"
                >
                  {copiedKey === "ALL" ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied All ({generatedKeys.length}) Keys!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All ({generatedKeys.length}) Keys</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="ref-btn flex-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .TXT</span>
                </button>
                {generatedReceipt && (
                  <button
                    type="button"
                    onClick={() => printReceiptWindow(generatedReceipt)}
                    className="ref-btn"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                )}
              </div>

              <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)] max-h-[420px] overflow-y-auto font-mono text-xs divide-y divide-[var(--line)]">
                {generatedKeys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between py-2 px-1 hover:bg-[var(--surface-hover)] rounded"
                  >
                    <span className="text-[var(--ink)] font-bold">{k.key_str}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--muted)]">
                        {k.duration_days > 0 ? `${k.duration_days}D` : "Lifetime"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySingle(k.key_str)}
                        className="ref-btn !min-h-[22px] !px-2 text-[10px]"
                      >
                        {copiedKey === k.key_str ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-[var(--muted)] font-mono">
              Configure parameters on the left and click "Mint Keys" to generate a batch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
