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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--canvas)] text-[var(--ink)] relative">
      {/* Theme Toggler top right */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-solid)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors shadow-sm"
        title="Toggle Theme"
      >
        {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      {/* Main Login Card */}
      <div className="w-full max-w-md p-8 rounded-xl border border-[var(--border)] bg-[var(--surface-gradient)] shadow-2xl relative backdrop-blur-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-[10px] tracking-[4px] uppercase font-mono text-[var(--muted)] mb-1">
            ACCESS CONTROL GATEWAY
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
            VOID LICENSE HUB
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1.5 font-ui">
            Enter your account credentials to access the console
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-ui">
          <div>
            <label className="block text-[var(--muted)] mb-1.5 font-mono uppercase text-[10px] tracking-wider">
              Username
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
              <User className="w-4 h-4 text-[var(--muted)] shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs placeholder:text-[var(--muted)]/60"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1.5 font-mono uppercase text-[10px] tracking-wider">
              Password
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
              <Lock className="w-4 h-4 text-[var(--muted)] shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs placeholder:text-[var(--muted)]/60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
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
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-xs bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] shadow-md transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Void Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--border-soft)] text-center text-[11px] text-[var(--muted)] font-mono">
          <span>Protected by Void AES-256 HMAC & Secure Session Protocol</span>
        </div>
      </div>
    </div>
  );
}
