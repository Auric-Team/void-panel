import React, { useState } from "react";
import { api } from "../../lib/api";
import { Play, Copy, CheckCircle2, AlertTriangle, Terminal, Code2 } from "lucide-react";
import { useToast } from "../Toast";

// Client-side SHA-256 implementation matching C++ ComputeSHA256
async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const ClientSimulatorView: React.FC = () => {
  const { toast } = useToast();
  const [testKey, setTestKey] = useState("VOID-LIFETIME-PREMIUM-2026");
  const [testHwid, setTestHwid] = useState("HWID-ANDROID-TEST-1234");
  const [salt] = useState("VOID_SECURE_SALT_2026");
  const [simulating, setSimulating] = useState(false);

  // Results
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    const ts = Date.now();
    const payloadToHash = testKey.trim() + testHwid.trim() + String(ts) + salt;
    const hash = await sha256(payloadToHash);

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
      } else if (res.status === "expired") {
        toast("Simulation: Key EXPIRED!", "error", res.message);
      } else {
        toast("Simulation: Key INVALID!", "error", res.message);
      }
    } catch (err: any) {
      setLastResponse({ error: err.message });
      toast("Simulation failed", "error", err.message);
    } finally {
      setSimulating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast("Snippet copied to clipboard!", "success");
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)]">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-5 h-5 text-emerald-500" />
          <h2 className="font-display text-xl font-normal">
            Mod Menu Client Simulator & Gateway Inspector
          </h2>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Emulates the C++ <code className="font-mono">KeySystem::VerifyKey()</code> socket handshake over port 20067 with cryptographic SHA256 integrity check.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Form */}
        <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm space-y-4">
          <h3 className="font-display text-lg font-normal mb-1">
            Simulate Client Device
          </h3>

          <form onSubmit={handleSimulate} className="space-y-4 text-xs">
            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Target License Key
              </label>
              <input
                type="text"
                value={testKey}
                onChange={(e) => setTestKey(e.target.value)}
                placeholder="Paste key to test"
                className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono font-medium focus:outline-none focus:border-[var(--focus)]"
                required
              />
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Device Hardware Fingerprint (HWID)
              </label>
              <input
                type="text"
                value={testHwid}
                onChange={(e) => setTestHwid(e.target.value)}
                placeholder="HWID-XXXX"
                className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--focus)]"
                required
              />
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Shared Salt
              </label>
              <input
                type="text"
                value={salt}
                readOnly
                className="w-full p-2.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] text-[var(--muted)] font-mono select-none"
              />
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="primary-btn w-full py-2.5 rounded-md font-medium text-xs flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {simulating ? "Verifying..." : "Execute Verification Handshake"}
            </button>
          </form>

          {/* Quick HWID Generator helpers */}
          <div className="pt-3 border-t border-[var(--border-soft)] flex gap-2">
            <button
              type="button"
              onClick={() => setTestHwid("HWID-" + Math.random().toString(36).substring(2, 10).toUpperCase())}
              className="px-3 py-1.5 rounded border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] text-[11px]"
            >
              Generate Random HWID
            </button>
            <button
              type="button"
              onClick={() => setTestKey("VOID-LIFETIME-PREMIUM-2026")}
              className="px-3 py-1.5 rounded border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] text-[11px]"
            >
              Set Master Key
            </button>
          </div>
        </div>

        {/* Right Output Inspector */}
        <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm space-y-4">
          <h3 className="font-display text-lg font-normal mb-1">
            Raw Network Handshake Inspector
          </h3>

          {/* Response Pill */}
          {lastResponse && (
            <div
              className={`p-3 rounded-md border flex items-center justify-between text-xs font-mono ${
                lastResponse.status === "authenticated"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : lastResponse.status === "mismatch"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-current" />
                <strong className="uppercase">STATUS: {lastResponse.status}</strong>
              </div>
              <span>{lastResponse.message}</span>
            </div>
          )}

          {/* JSON Payload Inspector */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-[var(--muted)] uppercase mb-1">
              <span>Outgoing POST /api/verify Body</span>
              {lastRequest && (
                <button
                  onClick={() => copyCode(JSON.stringify(lastRequest, null, 2))}
                  className="hover:text-[var(--ink)] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              )}
            </div>
            <pre className="p-3 rounded bg-[var(--surface-solid)] border border-[var(--border-soft)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto max-h-[140px]">
              {lastRequest ? JSON.stringify(lastRequest, null, 2) : "// Awaiting verification execution..."}
            </pre>
          </div>

          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-[var(--muted)] uppercase mb-1">
              <span>Incoming Server Response</span>
              {lastResponse && (
                <button
                  onClick={() => copyCode(JSON.stringify(lastResponse, null, 2))}
                  className="hover:text-[var(--ink)] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              )}
            </div>
            <pre className="p-3 rounded bg-[var(--surface-solid)] border border-[var(--border-soft)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto max-h-[140px]">
              {lastResponse ? JSON.stringify(lastResponse, null, 2) : "// Server response will be displayed here..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
