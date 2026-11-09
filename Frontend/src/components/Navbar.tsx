import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Coins,
  LogOut,
  Sun,
  Moon,
  Plus,
  Bell,
  LayoutDashboard,
  Key,
  Layers,
  Users,
  Receipt,
  ShieldAlert,
  Terminal,
  Settings,
  Shield,
} from "lucide-react";

interface NavbarProps {
  onSearchClick?: () => void;
  onCreateKeyClick?: () => void;
  onOpenNotifications?: () => void;
  onInspectSelf?: () => void;
  unreadNotifications?: number;
  onLogout?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchClick,
  onCreateKeyClick,
  onOpenNotifications,
  onInspectSelf,
  unreadNotifications = 0,
  onLogout,
  activeTab,
  setActiveTab,
}) => {
  const { theme, setTheme } = useTheme();
  const { user, role, credits } = useAuth();

  const roleBadgeClass =
    {
      owner: "warning",
      admin: "info",
      reseller: "success",
    }[role] || "info";

  const getNavTabs = () => {
    if (role === "reseller") {
      return [
        { id: "keys", label: "License Keys", icon: Key },
        { id: "batch", label: "Batch Mint", icon: Layers },
        { id: "credits", label: "Credits & Receipts", icon: Receipt },
        { id: "dashboard", label: "Analytics", icon: LayoutDashboard },
      ];
    }
    if (role === "admin") {
      return [
        { id: "dashboard", label: "Overview", icon: LayoutDashboard },
        { id: "keys", label: "License Keys", icon: Key },
        { id: "batch", label: "Batch Mint", icon: Layers },
        { id: "users", label: "Resellers", icon: Users },
        { id: "credits", label: "Credits & Receipts", icon: Receipt },
        { id: "bans", label: "Security & Broadcasts", icon: ShieldAlert },
        { id: "audit", label: "Audit & Simulator", icon: Terminal },
      ];
    }
    return [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "keys", label: "License Keys", icon: Key },
      { id: "batch", label: "Batch Mint", icon: Layers },
      { id: "users", label: "Accounts", icon: Users },
      { id: "credits", label: "Credits & Receipts", icon: Receipt },
      { id: "bans", label: "Security & Broadcasts", icon: ShieldAlert },
      { id: "audit", label: "Audit & Simulator", icon: Terminal },
      { id: "settings", label: "Settings", icon: Settings },
    ];
  };

  const navTabs = getNavTabs();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface-solid)]/95 backdrop-blur-md text-[var(--ink)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Command Row */}
        <div className="flex items-center justify-between gap-3 h-14">
          {/* Left Brand + Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              onClick={() => setActiveTab(role === "reseller" ? "keys" : "dashboard")}
              className="cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--accent)] text-white flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-base font-bold tracking-tight text-[var(--ink)]">
                  VOID
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border-soft)] text-[var(--muted)]">
                  v2.6
                </span>
              </div>
            </div>

            <span className="h-4 w-[1px] bg-[var(--border)] hidden sm:block" />

            <button
              type="button"
              onClick={onInspectSelf}
              className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-md hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              title="Click to inspect your account keys & receipts"
            >
              <span className={`ref-badge ${roleBadgeClass} !h-[19px] !px-2 uppercase !text-[10px]`}>
                <span className="dot" />
                {role}
              </span>
              <span className="text-xs font-mono font-medium text-[var(--ink)]">
                @{user?.username || "authenticated"}
              </span>
            </button>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2">
            {onCreateKeyClick && (
              <button
                onClick={onCreateKeyClick}
                className="ref-btn primary !min-h-[32px] !px-3 text-xs"
                title="Mint a new license key with optional payment receipt"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Mint Key</span>
              </button>
            )}

            {/* Owner / Key Creation Dispatch Feed Button */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="ref-btn !min-h-[32px] !px-2.5 text-xs relative"
                title="Owner Key Creation & Payment Receipt Dispatch Feed"
              >
                <Bell className="w-3.5 h-3.5 text-[var(--ink)]" />
                <span className="hidden md:inline font-mono text-[11px]">Key Feed</span>
                {unreadNotifications > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {/* Credits Balance Capsule */}
            <button
              onClick={() => setActiveTab("credits")}
              title="View Credits, Payment Receipts & Vouchers"
              className="ref-btn !min-h-[32px] !px-3 text-xs font-mono"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">
                {role === "owner" ? "∞ CR" : `${credits.toLocaleString()} CR`}
              </span>
            </button>

            {/* Search Trigger (⌘ K) */}
            {onSearchClick && (
              <button
                onClick={onSearchClick}
                className="ref-btn !min-h-[32px] !px-2.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                title="Quick Key & HWID Search (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5" />
                <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border-soft)]">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Theme Switcher */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="ref-btn !min-h-[32px] !px-2.5 text-xs"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[var(--ink)]" />
              )}
            </button>

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="ref-btn danger !min-h-[32px] !px-2.5 text-xs"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-1.5 border-t border-[var(--line)]">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
