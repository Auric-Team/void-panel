import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { api, KeyRecord, OverviewStats } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { DashboardView } from "../components/views/DashboardView";
import { KeyManagerView } from "../components/views/KeyManagerView";
import { BatchGeneratorView } from "../components/views/BatchGeneratorView";
import { UsersView } from "../components/views/UsersView";
import { CreditsView } from "../components/views/CreditsView";
import { BansView } from "../components/views/BansView";
import { SettingsView } from "../components/views/SettingsView";
import { Plus, Search, Sparkles, Key, Check, Coins, AlertCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, role, credits, isAuthenticated, loading: authLoading, logout, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Single Key Generation Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDuration, setCreateDuration] = useState(1); // Default: 24h (1 Day) = 10 credits
  const [createCustomKey, setCreateCustomKey] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [createMaxResets, setCreateMaxResets] = useState(3);
  const [creating, setCreating] = useState(false);

  // Search Modal state (⌘ K)
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, keysData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getKeys().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      if (keysData) setKeys(keysData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else {
        // Automatically default Resellers to their License Keys list
        if (role === "reseller" && activeTab === "dashboard") {
          setActiveTab("keys");
        }
        loadData();
      }
    }

    // Setup ⌘ K shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, authLoading, role]);

  // Credit calculation for single key creation
  const getSingleKeyCost = (days: number) => {
    if (days === 1) return 10;
    if (days === 3) return 25;
    if (days === 7) return 50;
    if (days === 30) return 180;
    if (days === 90) return 450;
    if (days === 365) return 1500;
    if (days === 0) return 3000;
    return Math.max(10, Math.round(days * 8));
  };

  const currentCost = getSingleKeyCost(createDuration);
  const canAffordSingle = role === "owner" || credits >= currentCost;

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAffordSingle) {
      toast("Insufficient Credits", "error", `Need ${currentCost} credits, but you have ${credits}.`);
      return;
    }

    setCreating(true);
    try {
      const res = await api.createKey(createDuration, createNote, createCustomKey, createMaxResets);
      if (res.success && res.key) {
        toast(`Key ${res.key.key_str} created successfully! (${res.creditCost} credits)`, "success");
        setCreateModalOpen(false);
        setCreateCustomKey("");
        setCreateNote("");
        refreshProfile();
        loadData();
      }
    } catch (err: any) {
      toast("Failed to create key", "error", err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const searchResults = searchQuery.trim()
    ? keys.filter(
        (k) =>
          k.key_str.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (k.hwid && k.hwid.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (k.note && k.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (k.created_by_name && k.created_by_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] text-[var(--muted)] font-mono text-xs">
        Loading Void System...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <Head>
        <title>VOID License Hub</title>
        <meta name="description" content="Production-Grade Key Licensing System with Credits & RBAC" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Top Clean Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSearchClick={() => setSearchModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "dashboard" && (
          <DashboardView
            stats={stats}
            loading={loading}
            onRefresh={loadData}
            onOpenCreateKey={() => setCreateModalOpen(true)}
            onOpenBatch={() => setActiveTab("batch")}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "keys" && (
          <KeyManagerView
            keys={keys}
            loading={loading}
            onRefresh={loadData}
            onOpenCreateKey={() => setCreateModalOpen(true)}
            onOpenBatch={() => setActiveTab("batch")}
          />
        )}

        {activeTab === "batch" && (
          <BatchGeneratorView
            onSuccess={() => {
              loadData();
              setActiveTab("keys");
            }}
          />
        )}

        {activeTab === "users" && (role === "owner" || role === "admin") && <UsersView />}

        {activeTab === "credits" && <CreditsView />}

        {activeTab === "bans" && (role === "owner" || role === "admin") && <BansView />}

        {activeTab === "settings" && role === "owner" && <SettingsView />}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="py-4 px-6 border-t border-[var(--border-soft)] bg-[var(--surface-solid)] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--muted)] font-mono">
        <span>VOID MOD MENU LICENSING SYSTEM</span>
        <span className="my-1 sm:my-0">1 KEY = 1 DEVICE HARDWARE LOCK</span>
        <span>GATEWAY SYNCHRONIZED</span>
      </footer>

      {/* Modal: Single Key Creation */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Mint License Key"
        subtitle="Generates an authenticated key locked to Android hardware ID on activation"
        icon={<Key className="w-5 h-5 text-[var(--accent)]" />}
      >
        <form onSubmit={handleCreateKey} className="space-y-4 text-xs font-ui">
          {/* Credit Cost Indicator */}
          <div className="p-3 rounded-md bg-[var(--surface)] border border-[var(--border-soft)] flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Credit Cost:</span>
              <span className="font-mono text-amber-500 font-bold">
                {role === "owner" ? "0 (Owner Free)" : `${currentCost} Credits`}
              </span>
            </div>
            {role !== "owner" && (
              <span className="text-[11px] font-mono text-[var(--muted)]">
                Balance: {credits} CR
              </span>
            )}
          </div>

          {!canAffordSingle && (
            <div className="flex items-center gap-1.5 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Insufficient credits. Need {currentCost - credits} more credits.</span>
            </div>
          )}

          {/* Duration choice with Credits preview */}
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Validity Duration & Cost
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
                  onClick={() => setCreateDuration(d.days)}
                  className={`p-2 rounded border text-center transition-all ${
                    createDuration === d.days
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold border-transparent shadow-sm"
                      : "bg-[var(--surface-solid)] text-[var(--ink)] border-[var(--border-soft)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <span className="block text-[11px] font-mono">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom key option */}
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Custom Key String (Optional)
            </label>
            <input
              type="text"
              value={createCustomKey}
              onChange={(e) => setCreateCustomKey(e.target.value.toUpperCase())}
              placeholder="Leave empty for auto-generated VOID-XXXX-XXXX"
              className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Max HWID Resets */}
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Max Allowed Device Resets
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={createMaxResets}
              onChange={(e) => setCreateMaxResets(Number(e.target.value))}
              className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Customer Name / Note (Optional)
            </label>
            <input
              type="text"
              value={createNote}
              onChange={(e) => setCreateNote(e.target.value)}
              placeholder="e.g. VIP Member #45"
              className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !canAffordSingle}
              className="primary-btn px-4 py-2 rounded-md font-semibold disabled:opacity-40"
            >
              {creating ? "Minting..." : `Generate Key (${role === "owner" ? "Owner Free" : `${currentCost} Credits`})`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quick Search (⌘ K) */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Quick Key Finder"
        subtitle="Search instantly across all active, expired, or bound license keys"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)]">
            <Search className="w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type key code, HWID, or customer name..."
              className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-soft)]">
            {searchResults.length > 0 ? (
              searchResults.map((k) => (
                <div
                  key={k.id}
                  className="p-3 hover:bg-[var(--surface-hover)] flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(k.key_str);
                    toast(`Key ${k.key_str} copied!`, "success");
                    setSearchModalOpen(false);
                  }}
                >
                  <div>
                    <span className="font-mono font-bold text-[var(--ink)] block">{k.key_str}</span>
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      {k.duration_days > 0 ? `${k.duration_days} Days` : "Lifetime"} · {k.status} ·{" "}
                      {k.hwid ? `Bound: ${k.hwid.slice(0, 12)}...` : "Unbound"}
                    </span>
                  </div>
                  <button className="px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:bg-[var(--surface)]">
                    Copy
                  </button>
                </div>
              ))
            ) : searchQuery.trim() ? (
              <div className="py-6 text-center text-[var(--muted)]">No matching keys found</div>
            ) : (
              <div className="py-6 text-center text-[var(--muted)] font-mono text-[11px]">
                Start typing to search through all licenses...
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
