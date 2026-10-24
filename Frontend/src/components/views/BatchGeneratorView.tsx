import React, { useState, useEffect } from "react";
import { api, KeyRecord } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Sparkles, Copy, Download, RefreshCw, Coins, AlertCircle } from "lucide-react";
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
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<KeyRecord[]>([]);

  // Credit calculation
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAfford) {
      toast("Insufficient Credits", "error", `You need ${totalCost} credits, but have ${credits}.`);
      return;
    }

    setGenerating(true);
    try {
      const res = await api.createBatchKeys(count, durationDays, prefix, note);
      if (res.success && res.keys) {
        setGeneratedKeys(res.keys);
        toast(`Minted ${res.count} keys! (${totalCost} credits)`, "success");
        refreshProfile();
        onSuccess();
      }
    } catch (err: any) {
      toast("Batch generation failed", "error", err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyAll = () => {
    if (generatedKeys.length === 0) return;
    const txt = generatedKeys.map((k) => k.key_str).join("\n");
    navigator.clipboard.writeText(txt);
    toast("All batch keys copied to clipboard!", "success");
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
      <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] flex items-center justify-center text-amber-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="font-display text-xl font-normal">
            Batch Key Generator
          </h2>
        </div>
        <p className="text-xs text-[var(--muted)] mb-5">
          Mint multiple synchronized keys simultaneously for VIP customers or resellers.
        </p>

        {/* Credit Cost Estimate Capsule */}
        <div className="p-3.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] mb-5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Unit Rate ({durationDays === 1 ? "24 Hours" : `${durationDays} Days`}):</span>
            <span className="font-mono font-medium">{unitCost} Credits / Key</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Quantity:</span>
            <span className="font-mono font-medium">{count} Keys</span>
          </div>
          <div className="border-t border-[var(--line)] pt-2 flex items-center justify-between">
            <span className="font-medium text-[var(--ink)]">Total Required Credits:</span>
            <span className="font-mono font-bold text-amber-500 text-sm">
              {role === "owner" ? "0 (Owner Free)" : `${totalCost} Credits`}
            </span>
          </div>
          {role !== "owner" && (
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span>Your Current Balance:</span>
              <span className={`font-mono font-medium ${credits >= totalCost ? "text-emerald-500" : "text-rose-500"}`}>
                {credits} Credits
              </span>
            </div>
          )}
          {!canAfford && (
            <div className="flex items-center gap-1.5 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Insufficient credits. Need {totalCost - credits} more credits.</span>
            </div>
          )}
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 text-xs font-ui">
          {/* Prefix */}
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Key Prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="e.g. VOID, RESELL, VIP"
              className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono font-medium focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>

          {/* Quantity Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[var(--muted)] font-mono uppercase text-[10px]">
                Quantity of Keys
              </label>
              <span className="font-mono font-bold text-[var(--ink)] text-sm">
                {count} keys
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-[var(--track)] cursor-pointer accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1 font-mono">
              <span>1</span>
              <span>25</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Subscription Duration & Rate
            </label>
            <div className="grid grid-cols-3 gap-2">
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
                  className={`p-2 rounded border text-center transition-all ${
                    durationDays === d.days
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold border-transparent shadow-sm"
                      : "bg-[var(--surface-solid)] text-[var(--ink)] border-[var(--border-soft)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <span className="block text-[11px] font-mono">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campaign Note */}
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Campaign / Customer Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Reseller Batch Alpha"
              className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={generating || !canAfford}
              className="w-full py-2.5 px-4 rounded-md font-medium text-xs flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] shadow-md disabled:opacity-40 transition-all"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Minting Keys...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Mint {count} Keys Now ({role === "owner" ? "Owner Free" : `${totalCost} Credits`})
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Output & Batch Actions */}
      <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-normal">
              Generated Batch Output
            </h3>
            {generatedKeys.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {generatedKeys.length} Ready
              </span>
            )}
          </div>

          {generatedKeys.length > 0 ? (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-[var(--surface)] border border-[var(--border-soft)] max-h-[380px] overflow-y-auto font-mono text-xs space-y-1.5 select-all">
                {generatedKeys.map((k, idx) => (
                  <div key={k.id} className="flex items-center justify-between py-1 border-b border-[var(--line)] last:border-0">
                    <span className="text-[var(--ink)] font-medium">{k.key_str}</span>
                    <span className="text-[10px] text-[var(--muted)] font-sans">
                      {k.duration_days > 0 ? `${k.duration_days}D` : "Lifetime"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs rounded border border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy All
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs rounded border border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .TXT
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-[var(--muted)]">
              Configure parameters on the left to mint a synchronized batch of keys.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
