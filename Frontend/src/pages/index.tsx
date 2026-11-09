import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  api,
  KeyRecord,
  OverviewStats,
  OwnerNotificationRecord,
  PaymentReceiptRecord,
  copyToClipboard,
  printReceiptWindow,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { AccountInspectorModal } from "../components/AccountInspectorModal";
import { OwnerDispatchModal } from "../components/OwnerDispatchModal";
import { DashboardView } from "../components/views/DashboardView";
import { KeyManagerView } from "../components/views/KeyManagerView";
import { BatchGeneratorView } from "../components/views/BatchGeneratorView";
import { UsersView } from "../components/views/UsersView";
import { CreditsView } from "../components/views/CreditsView";
import { BansView } from "../components/views/BansView";
import { BroadcastsView } from "../components/views/BroadcastsView";
import { AuditLogsView } from "../components/views/AuditLogsView";
import { ClientSimulatorView } from "../components/views/ClientSimulatorView";
import { SettingsView } from "../components/views/SettingsView";
import {
  Search,
  Key,
  Coins,
  AlertCircle,
  Copy,
  Check,
  Receipt,
  Upload,
  X,
  Printer,
  Send,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, role, credits, isAuthenticated, loading: authLoading, logout, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Owner Key Creation Dispatch Notifications
  const [notifications, setNotifications] = useState<OwnerNotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const lastSeenNotifIdRef = useRef<number | null>(null);

  // Account Inspector Modal state (when clicking on any account)
  const [inspectUserId, setInspectUserId] = useState<number | null>(null);

  // Single Key Generation Modal state + Payment Receipt fields
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDuration, setCreateDuration] = useState(1);
  const [createCustomKey, setCreateCustomKey] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [createMaxResets, setCreateMaxResets] = useState(3);

  // Payment Receipt fields inside Mint License Key modal
  const [customerName, setCustomerName] = useState("");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [proofImage, setProofImage] = useState<string>("");

  const [creating, setCreating] = useState(false);
  const [lastCreatedKey, setLastCreatedKey] = useState<KeyRecord | null>(null);
  const [lastCreatedReceipt, setLastCreatedReceipt] = useState<PaymentReceiptRecord | null>(null);
  const [copiedNewKey, setCopiedNewKey] = useState(false);

  // Search Modal state (⌘ K)
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadNotifications = async (showNewToast = false) => {
    try {
      const data = await api.getNotifications(100);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);

      if (data.notifications.length > 0) {
        const newest = data.notifications[0];
        if (
          showNewToast &&
          lastSeenNotifIdRef.current !== null &&
          newest.id > lastSeenNotifIdRef.current &&
          newest.creator_id !== user?.id
        ) {
          const dur = newest.duration_days === 0 ? "Lifetime" : `${newest.duration_days}D`;
          toast(
            `🔑 @${newest.creator_username} minted ${newest.quantity}x ${dur} Key`,
            "info",
            `Key: ${newest.keys_list[0]} · Cost: ${newest.credit_cost} CR`
          );
        }
        lastSeenNotifIdRef.current = newest.id;
      }
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, keysData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getKeys().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      if (keysData) setKeys(keysData);
      await loadNotifications(false);
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
        loadData();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, authLoading, role]);

  // Poll live key creation feed for Owner/Admin every 8 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      loadNotifications(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [isAuthenticated, user?.id]);

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

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("Image too large", "error", "Please select an image smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProofImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProofPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setProofImage(reader.result);
              toast("Payment screenshot pasted from clipboard", "success");
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAffordSingle) {
      toast("Insufficient Credits", "error", `Need ${currentCost} credits, but you have ${credits}.`);
      return;
    }

    setCreating(true);
    try {
      const receiptPayload =
        customerName.trim() ||
        Number(amountPaid) > 0 ||
        transactionRef.trim() ||
        proofImage
          ? {
              customerName: customerName.trim(),
              amountPaid: Number(amountPaid) || 0,
              currency,
              paymentMethod,
              transactionRef: transactionRef.trim(),
              proofImage,
            }
          : undefined;

      const res = await api.createKey(
        createDuration,
        createNote,
        createCustomKey,
        createMaxResets,
        receiptPayload
      );

      if (res.success && res.key) {
        setLastCreatedKey(res.key);
        setLastCreatedReceipt(res.receipt || null);
        await copyToClipboard(res.key.key_str);
        setCopiedNewKey(true);
        setTimeout(() => setCopiedNewKey(false), 2000);
        toast(
          `Key ${res.key.key_str} created & copied!`,
          "success",
          `Dispatched to Owner telemetry feed (${res.creditCost} CR)`
        );
        setCreateCustomKey("");
        setCreateNote("");
        setCustomerName("");
        setAmountPaid("");
        setTransactionRef("");
        setProofImage("");
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
          (k.created_by_name && k.created_by_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (k.customer_name && k.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] text-[var(--muted)] font-mono text-xs">
        Initializing Void Command Center...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-[var(--ink)]">
      <Head>
        <title>VOID License Hub — Enterprise Licensing &amp; Telemetry</title>
        <meta name="description" content="Hardware-Locked Key Licensing, Deep Analytics & Payment Receipts" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSearchClick={() => setSearchModalOpen(true)}
        onCreateKeyClick={() => {
          setLastCreatedKey(null);
          setLastCreatedReceipt(null);
          setCreateModalOpen(true);
        }}
        onOpenNotifications={() => setDispatchModalOpen(true)}
        onInspectSelf={() => user?.id && setInspectUserId(user.id)}
        unreadNotifications={unreadCount}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "dashboard" && (
          <DashboardView
            stats={stats}
            loading={loading}
            onRefresh={loadData}
            onOpenCreateKey={() => {
              setLastCreatedKey(null);
              setLastCreatedReceipt(null);
              setCreateModalOpen(true);
            }}
            onOpenBatch={() => setActiveTab("batch")}
            onNavigateTab={setActiveTab}
            onInspectUser={(uid) => setInspectUserId(uid)}
            notifications={notifications}
            unreadNotifications={unreadCount}
            onOpenNotifications={() => setDispatchModalOpen(true)}
          />
        )}

        {activeTab === "keys" && (
          <KeyManagerView
            keys={keys}
            loading={loading}
            onRefresh={loadData}
            onOpenCreateKey={() => {
              setLastCreatedKey(null);
              setLastCreatedReceipt(null);
              setCreateModalOpen(true);
            }}
            onOpenBatch={() => setActiveTab("batch")}
            onInspectUser={(uid) => setInspectUserId(uid)}
          />
        )}

        {activeTab === "batch" && (
          <BatchGeneratorView
            onSuccess={() => {
              loadData();
            }}
          />
        )}

        {activeTab === "users" && (role === "owner" || role === "admin") && (
          <UsersView onInspectUser={(uid) => setInspectUserId(uid)} />
        )}

        {activeTab === "credits" && <CreditsView />}

        {activeTab === "bans" && (role === "owner" || role === "admin") && (
          <div className="space-y-8">
            <BroadcastsView />
            <BansView />
          </div>
        )}

        {activeTab === "audit" && (role === "owner" || role === "admin") && (
          <div className="space-y-8">
            <ClientSimulatorView />
            <AuditLogsView />
          </div>
        )}

        {activeTab === "settings" && role === "owner" && <SettingsView />}
      </main>

      {/* Clean Enterprise Footer */}
      <footer className="py-3.5 px-6 border-t border-[var(--line)] bg-[var(--surface-solid)] flex flex-col sm:flex-row items-center justify-between text-[10px] tracking-wider uppercase text-[var(--muted)] font-mono">
        <span>VOID LICENSE HUB · ENTERPRISE EDITION v2.6</span>
        <span className="my-1 sm:my-0">1 KEY = 1 DEVICE HARDWARE LOCK · OWNER TELEMETRY ACTIVE</span>
        <span>GATEWAY ONLINE</span>
      </footer>

      {/* Owner Key Creation & Payment Receipt Dispatch Feed Modal */}
      <OwnerDispatchModal
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefresh={() => loadNotifications(false)}
        onInspectUser={(uid) => setInspectUserId(uid)}
        canClear={role === "owner" || role === "admin"}
      />

      {/* Account Deep-Dive Inspector Modal (Opens when clicking any account) */}
      <AccountInspectorModal
        userId={inspectUserId}
        onClose={() => setInspectUserId(null)}
        onDataChanged={loadData}
      />

      {/* Modal: Single Key Creation + Receipt of Payment */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Mint License Key & Payment Receipt"
        subtitle="Generates a hardware-locked Android license key, attaches payment receipt proof, and dispatches full details to Owner"
        eyebrow="LICENSE PROVISIONING"
        icon={<Key className="w-4 h-4" />}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateKey} onPaste={handleProofPaste} className="space-y-5 text-xs">
          {/* Newly Minted Key + Dispatch Summary Banner */}
          {lastCreatedKey && (
            <div className="p-4 rounded-lg border border-[var(--success-border)] bg-[var(--success-fill)] space-y-3 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--success)]">
                      ✓ Minted &amp; Dispatched to Owner
                    </span>
                    {lastCreatedReceipt && (
                      <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-soft)] text-[10px]">
                        Receipt: {lastCreatedReceipt.receipt_no}
                      </span>
                    )}
                  </div>
                  <strong className="text-base text-[var(--ink)] block mt-1 select-all">
                    {lastCreatedKey.key_str}
                  </strong>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await copyToClipboard(lastCreatedKey.key_str);
                      setCopiedNewKey(true);
                      setTimeout(() => setCopiedNewKey(false), 1600);
                      toast("Key copied!", "success");
                    }}
                    className="ref-btn primary !min-h-[30px] !px-3 text-xs"
                  >
                    {copiedNewKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedNewKey ? "Copied" : "Copy Key"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const info = [
                        `VOID LICENSE KEY: ${lastCreatedKey.key_str}`,
                        `Duration: ${lastCreatedKey.duration_days === 0 ? "Lifetime" : lastCreatedKey.duration_days + " Days"}`,
                        `Issued By: @${lastCreatedKey.created_by_name}`,
                        lastCreatedKey.customer_name ? `Customer: ${lastCreatedKey.customer_name}` : null,
                        lastCreatedReceipt ? `Receipt No: ${lastCreatedReceipt.receipt_no}` : null,
                        lastCreatedKey.payment_amount
                          ? `Payment: ${lastCreatedKey.payment_amount} ${lastCreatedKey.payment_currency} (${lastCreatedKey.payment_method})`
                          : null,
                        `Device Policy: 1 Key = 1 Android Device (Locks on 1st Login)`,
                      ]
                        .filter(Boolean)
                        .join("\n");
                      await copyToClipboard(info);
                      toast("Full key & receipt dispatch info copied!", "success");
                    }}
                    className="ref-btn !min-h-[30px] !px-3 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Copy Full Info</span>
                  </button>

                  {lastCreatedReceipt && (
                    <button
                      type="button"
                      onClick={() => printReceiptWindow(lastCreatedReceipt)}
                      className="ref-btn !min-h-[30px] !px-3 text-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Credit Cost & Owner Notification Banner */}
          <div className="p-3 rounded-md bg-[var(--surface-hover)] border border-[var(--border-soft)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Credit Cost:</span>
              <span className="font-mono text-amber-500 font-bold">
                {role === "owner" ? "0 CR (Owner Unlimited)" : `${currentCost} Credits`}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--muted)]">
              {role !== "owner" && <span>Your Balance: {credits} CR</span>}
              <span className="text-[var(--info)]">● Auto-notifies Owner</span>
            </div>
          </div>

          {!canAffordSingle && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-[var(--danger-fill)] border border-[var(--danger-border)] text-[var(--danger)] text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Insufficient credits. You need {currentCost - credits} more credits to mint this tier.</span>
            </div>
          )}

          {/* 1. Validity Duration Tier */}
          <div>
            <label className="ref-label">01 · Validity Duration &amp; Credit Rate</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { days: 1, label: "24 Hours", cost: "10 CR" },
                { days: 3, label: "3 Days", cost: "25 CR" },
                { days: 7, label: "7 Days", cost: "50 CR" },
                { days: 30, label: "30 Days", cost: "180 CR" },
                { days: 90, label: "90 Days", cost: "450 CR" },
                { days: 0, label: "Lifetime", cost: "3000 CR" },
              ].map((d) => {
                const selected = createDuration === d.days;
                return (
                  <button
                    key={d.days}
                    type="button"
                    onClick={() => setCreateDuration(d.days)}
                    className={`ref-btn !h-[38px] !px-3 font-mono text-xs flex items-center justify-between ${
                      selected ? "primary" : ""
                    }`}
                  >
                    <span>{d.label}</span>
                    <span className={`text-[10.5px] ${selected ? "text-white/90" : "text-[var(--muted)]"}`}>
                      {d.cost}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Key Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="ref-label">Custom Key (Optional)</label>
              <div className="ref-input-wrap">
                <input
                  type="text"
                  value={createCustomKey}
                  onChange={(e) => setCreateCustomKey(e.target.value.toUpperCase())}
                  placeholder="Auto VOID-XXXX..."
                  className="font-mono"
                />
              </div>
            </div>

            <div>
              <label className="ref-label">Max HWID Resets</label>
              <div className="ref-input-wrap">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={createMaxResets}
                  onChange={(e) => setCreateMaxResets(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>

            <div>
              <label className="ref-label">Order Memo / Note</label>
              <div className="ref-input-wrap">
                <input
                  type="text"
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                  placeholder="e.g. VIP Discord Buyer"
                />
              </div>
            </div>
          </div>

          {/* 3. Receipt of Payment & Proof of Payment Section */}
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[var(--accent)]" />
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)]">
                  02 · Receipt of Payment &amp; Proof (Sent to Owner)
                </span>
              </div>
              <span className="text-[10.5px] font-mono text-[var(--muted)]">
                Auto-generates Official Receipt
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ref-label">Customer Name / Buyer Handle</label>
                <div className="ref-input-wrap">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. @alex_gamer / Telegram Buyer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
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
                  <label className="ref-label">Currency</label>
                  <div className="ref-input-wrap">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="font-mono"
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="USDT">USDT</option>
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
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="USDT / Crypto">USDT / Crypto</option>
                    <option value="Binance Pay">Binance Pay</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Card / Stripe">Card / Stripe</option>
                    <option value="Cash / Other">Cash / Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="ref-label">Transaction ID / UTR Reference</label>
                <div className="ref-input-wrap">
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UTR 412988310291 / TXHash"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Upload or Paste Payment Screenshot Image */}
            <div>
              <label className="ref-label">
                Payment Receipt Screenshot / Proof Image (Upload or Ctrl+V Paste)
              </label>
              {proofImage ? (
                <div className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={proofImage}
                      alt="Payment Proof Preview"
                      className="w-14 h-14 object-cover rounded border border-[var(--border-soft)] shrink-0"
                    />
                    <div className="min-w-0 font-mono text-[11px]">
                      <strong className="text-[var(--success)] block">
                        ✓ Payment Proof Screenshot Attached
                      </strong>
                      <span className="text-[10px] text-[var(--muted)]">
                        Will be stored with the receipt and sent to Owner
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProofImage("")}
                    className="ref-btn danger !min-h-[28px] !px-2.5 text-[11px] shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 rounded-md border border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors text-xs text-[var(--muted)]">
                  <Upload className="w-4 h-4 text-[var(--accent)]" />
                  <span>
                    Click to upload payment screenshot (PNG/JPG) or press{" "}
                    <kbd className="font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--ink)]">
                      Ctrl+V
                    </kbd>{" "}
                    to paste
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="ref-btn"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={creating || !canAffordSingle}
              className="ref-btn primary"
            >
              <Key className="w-3.5 h-3.5" />
              <span>
                {creating
                  ? "Minting & Dispatching..."
                  : `Generate & Copy Key (${role === "owner" ? "Free" : `${currentCost} CR`})`}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quick Search (⌘ K) */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Quick Key & Receipt Finder"
        subtitle="Search instantly across all active, expired, or bound license keys"
        icon={<Search className="w-4 h-4" />}
      >
        <div className="space-y-4 text-xs">
          <div className="ref-input-wrap">
            <Search className="w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type key string, HWID, creator username, customer name, or note..."
              className="font-mono"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[var(--line)] border border-[var(--border-soft)] rounded-lg">
            {searchResults.length > 0 ? (
              searchResults.slice(0, 12).map((k) => (
                <div
                  key={k.id}
                  className="p-3 flex items-center justify-between gap-2 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div>
                    <button
                      type="button"
                      onClick={async () => {
                        await copyToClipboard(k.key_str);
                        toast("Key copied!", "success", k.key_str);
                      }}
                      className="font-mono font-semibold text-[var(--ink)] hover:text-[var(--accent)] cursor-pointer"
                    >
                      {k.key_str}
                    </button>
                    <span className="block text-[10px] font-mono text-[var(--muted)]">
                      {k.hwid ? `Bound: ${k.hwid}` : "Unbound"} · By @{k.created_by_name}
                      {k.customer_name ? ` · Buyer: ${k.customer_name}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await copyToClipboard(k.key_str);
                        toast("Key copied!", "success", k.key_str);
                      }}
                      className="ref-btn !min-h-[26px] !px-2 text-[10px] font-mono"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <span
                      className={`ref-badge !h-[22px] text-[10px] uppercase font-mono ${
                        k.status === "active"
                          ? "success"
                          : k.status === "expired"
                          ? "danger"
                          : "warning"
                      }`}
                    >
                      {k.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-[var(--muted)] font-mono">
                {searchQuery.trim() ? "No matching keys found." : "Start typing to filter keys..."}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
