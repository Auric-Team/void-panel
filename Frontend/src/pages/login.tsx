import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Lock, User, ShieldCheck, Sun, Moon, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast("Input Required", "error", "Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      if (data.success) {
        toast(`Authenticated as ${data.user.role.toUpperCase()} (@${data.user.username})`, "success");
        router.push("/");
      }
    } catch (err: any) {
      toast("Authentication Failed", "error", err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-[var(--ink)] relative">
      {/* Theme Toggler top right */}
      <button
        type="button"
        onClick={toggleTheme}
        className="ref-btn absolute top-6 right-6 !px-3"
        title="Switch Light / Dark Palette"
      >
        {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        <span className="text-[11px] font-mono uppercase">{theme === "light" ? "Dark" : "Light"}</span>
      </button>

      {/* Editorial Specimen Login Card */}
      <div className="w-full max-w-md p-8 sm:p-10 rounded-[11px] border border-[var(--border)] bg-[var(--panel-gradient)] shadow-[var(--shadow)] relative backdrop-blur-md">
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <span className="ref-eyebrow">00 / ACCESS CONTROL</span>
            <span className="ref-badge success font-mono text-[10px]">
              <i className="w-1.5 h-1.5 rounded-full bg-current" />
              GATEWAY ONLINE
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-[var(--ink)] leading-none">
            Void Panel
          </h1>
          <p className="text-[10px] tracking-[5px] uppercase text-[var(--muted)] mt-2 font-mono">
            WHITE &amp; BLACK EDITION
          </p>
          <div className="ref-short-rule my-3.5" />
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Authenticate with your Owner, Admin, or Reseller credentials to manage hardware-locked keys, credits, and payment receipts.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-ui">
          <div>
            <label className="block text-[var(--muted)] mb-1.5 font-mono uppercase text-[10px] tracking-wider">
              Account Handle
            </label>
            <div className="ref-input-wrap">
              <User className="w-4 h-4 text-[var(--muted)] shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="owner / admin / reseller"
                autoComplete="username"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs placeholder:text-[var(--muted)]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1.5 font-mono uppercase text-[10px] tracking-wider">
              Passkey
            </label>
            <div className="ref-input-wrap">
              <Lock className="w-4 h-4 text-[var(--muted)] shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs placeholder:text-[var(--muted)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="ref-btn primary w-full !min-h-[42px] font-semibold text-xs justify-between !px-5"
            >
              <span>{loading ? "Verifying Session..." : "Enter Licensing Console"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-7 pt-4 border-t border-[var(--line)] flex items-center justify-between text-[10px] tracking-[2px] uppercase text-[var(--muted)] font-mono">
          <span>SHA-256 HMAC</span>
          <span>1 KEY = 1 DEVICE</span>
        </div>
      </div>
    </div>
  );
}
