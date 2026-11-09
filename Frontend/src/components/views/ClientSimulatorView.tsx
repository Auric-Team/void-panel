import React, { useState } from "react";
import { api, copyToClipboard } from "../../lib/api";
import { Play, Copy, Check, Terminal } from "lucide-react";
import { useToast } from "../Toast";

// Pure-JS SHA-256 implementation so simulation works over HTTP LAN (192.168.x.x) where crypto.subtle is unavailable
function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = "";
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += "\x80";
  while ((ascii.length % 64) - 56) ascii += "\x00";
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? 0 : "") + b.toString(16);
    }
  }
  return result;
}

export const ClientSimulatorView: React.FC = () => {
  const { toast } = useToast();
  const [testKey, setTestKey] = useState("VOID-LIFETIME-PREMIUM-2026");
  const [testHwid, setTestHwid] = useState("HWID-ANDROID-TEST-1234");
  const [salt] = useState("VOID_SECURE_SALT_2026");
  const [simulating, setSimulating] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const [lastRequest, setLastRequest] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    const ts = Date.now();
    const payloadToHash = testKey.trim() + testHwid.trim() + String(ts) + salt;
    const hash = sha256Pure(payloadToHash);

    const requestPayload = {
      key: testKey.trim(),
      hwid: testHwid.trim(),
      timestamp: ts,
      hash,
    };
    setLastRequest(requestPayload);

    try {
      const res = await api.simulateVerify(
        requestPayload.key,
        requestPayload.hwid,
        requestPayload.timestamp,
        requestPayload.hash
      );
      setLastResponse(res);
      if (res.status === "authenticated") {
        toast("Simulation: Key AUTHENTICATED!", "success", res.message);
      } else if (res.status === "mismatch") {
        toast("Simulation: HWID MISMATCH!", "warning", res.message);
      } else {
        toast(`Simulation: ${res.status?.toUpperCase()}`, "error", res.message);
      }
    } catch (err: any) {
      setLastResponse({ error: err.message });
      toast("Simulation failed", "error", err.message);
    } finally {
      setSimulating(false);
    }
  };

  const copyCode = async (code: string, label: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 1500);
      toast("Payload copied to clipboard!", "success");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ref-panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-500" />
            <h3 className="font-display text-xl font-normal">
              Mod Menu Handshake Simulator
            </h3>
          </div>

          <form onSubmit={handleSimulate} className="space-y-4 text-xs">
            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Target License Key
              </label>
              <div className="ref-input-wrap">
                <input
                  type="text"
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  placeholder="Paste key to test"
                  className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Device Hardware Fingerprint (HWID)
              </label>
              <div className="ref-input-wrap">
                <input
                  type="text"
                  value={testHwid}
                  onChange={(e) => setTestHwid(e.target.value)}
                  placeholder="HWID-XXXX"
                  className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="ref-btn primary w-full !min-h-[40px] font-semibold"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{simulating ? "Verifying..." : "Execute Verification Handshake"}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-[var(--line)] flex gap-2">
            <button
              type="button"
              onClick={() =>
                setTestHwid("HWID-" + Math.random().toString(36).substring(2, 10).toUpperCase())
              }
              className="ref-btn !min-h-[30px] text-[11px]"
            >
              Randomize HWID
            </button>
            <button
              type="button"
              onClick={() => setTestKey("VOID-LIFETIME-PREMIUM-2026")}
              className="ref-btn !min-h-[30px] text-[11px]"
            >
              Set Master Key
            </button>
          </div>
        </div>

        <div className="ref-panel p-6 space-y-4">
          <h3 className="font-display text-xl font-normal">
            Raw Network Handshake Inspector
          </h3>

          {lastResponse && (
            <div
              className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${
                lastResponse.status === "authenticated"
                  ? "success-badge"
                  : lastResponse.status === "mismatch"
                  ? "warning-badge"
                  : "danger-badge"
              }`}
            >
              <strong className="uppercase">STATUS: {lastResponse.status}</strong>
              <span>{lastResponse.message}</span>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-[var(--muted)] uppercase mb-1">
              <span>Outgoing POST /api/verify Body</span>
              {lastRequest && (
                <button
                  onClick={() => copyCode(JSON.stringify(lastRequest, null, 2), "req")}
                  className="ref-btn !min-h-[22px] !px-2 text-[10px]"
                >
                  {copiedLabel === "req" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{" "}
                  Copy
                </button>
              )}
            </div>
            <pre className="p-3 rounded-lg bg-[var(--surface-solid)] border border-[var(--border-soft)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto max-h-[140px]">
              {lastRequest ? JSON.stringify(lastRequest, null, 2) : "// Awaiting verification execution..."}
            </pre>
          </div>

          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-[var(--muted)] uppercase mb-1">
              <span>Incoming Server Response</span>
              {lastResponse && (
                <button
                  onClick={() => copyCode(JSON.stringify(lastResponse, null, 2), "res")}
                  className="ref-btn !min-h-[22px] !px-2 text-[10px]"
                >
                  {copiedLabel === "res" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{" "}
                  Copy
                </button>
              )}
            </div>
            <pre className="p-3 rounded-lg bg-[var(--surface-solid)] border border-[var(--border-soft)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto max-h-[140px]">
              {lastResponse ? JSON.stringify(lastResponse, null, 2) : "// Server response will be displayed here..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
