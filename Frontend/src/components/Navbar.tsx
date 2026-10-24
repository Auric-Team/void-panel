import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Search, Coins, Users, Key, Terminal, LogOut, ShieldCheck, Flame, Sun, Moon } from "lucide-react";

interface NavbarProps {
  onSearchClick?: () => void;
  onLogout?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchClick,
  onLogout,
  activeTab,
  setActiveTab,
}) => {
  const { theme, setTheme } = useTheme();
  const { user, role, credits } = useAuth();

  // Role pill styles
  const roleBadgeStyle = {
    owner: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    admin: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    reseller: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  }[role] || "bg-gray-500/10 text-gray-400 border-gray-500/30";

  // Clean, focused navigation tabs tailored strictly for each role
  const getNavTabs = () => {
    if (role === "reseller") {
      return [
        { id: "keys", label: "License Keys" },
        { id: "credits", label: "Credits & Vouchers" },
        { id: "dashboard", label: "Overview" },
      ];
    }
    if (role === "admin") {
      return [
        { id: "dashboard", label: "Overview" },
        { id: "keys", label: "License Keys" },
        { id: "users", label: "Resellers" },
        { id: "credits", label: "Credits & Vouchers" },
        { id: "bans", label: "Device Blacklist" },
      ];
    }
    // Owner
    return [
      { id: "dashboard", label: "Overview" },
      { id: "keys", label: "License Keys" },
      { id: "users", label: "Admins & Resellers" },
      { id: "credits", label: "Credits & Vouchers" },
      { id: "bans", label: "Blacklist & Bans" },
      { id: "settings", label: "System Settings" },
    ];
  };

  const navTabs = getNavTabs();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between flex-wrap gap-4 px-6 py-3 min-h-[64px] bg-[var(--surface-solid)] border-b border-[var(--border-soft)] text-[var(--ink)]">
      {/* Brand & Subtitle & User Role */}
      <div className="flex items-center gap-3">
        <div className="font-display text-2xl tracking-tight font-normal flex items-center gap-2">
          VOID
          <span className="text-[var(--muted)] text-xl font-light">/</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <strong className="block text-xs font-medium tracking-wider uppercase">
              License Panel
            </strong>
            {/* Role Badge */}
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${roleBadgeStyle}`}>
              {role}
            </span>
          </div>
          <small className="block text-[10px] text-[var(--muted)] font-mono">
            @{user?.username || "authenticated"}
          </small>
        </div>
      </div>

      {/* Center Navigation Pill Bar */}
      <nav className="flex items-center gap-1 p-1 border border-[var(--border-soft)] rounded-md bg-[var(--surface)] overflow-x-auto max-w-full">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs rounded transition-all duration-fast ${
                isActive
                  ? "bg-[var(--surface-solid)] text-[var(--ink)] shadow-sm font-semibold border border-[var(--border-soft)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)] font-normal"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Credits Capsule, Search, Theme, Logout */}
      <div className="flex items-center gap-2">
        {/* Credits Balance Pill */}
        <button
          onClick={() => setActiveTab("credits")}
          title="Click to view Credit Balance & Vouchers"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm"
        >
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold">
            {role === "owner" ? "∞ (Owner)" : `${credits.toLocaleString()} Credits`}
          </span>
        </button>

        {/* Search Modal Trigger (⌘ K) */}
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            title="Search keys (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 rounded bg-[var(--surface-solid)] border border-[var(--border-soft)]">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-1.5 text-xs rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-rose-500/30 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
};
