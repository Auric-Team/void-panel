import React, { useState, useEffect } from "react";
import { api, AppSettings } from "../../lib/api";
import { useToast } from "../Toast";
import { Settings, Shield, Bell, Send, CheckCircle2, RefreshCw, Cpu, Database } from "lucide-react";

export const SettingsView: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Form states
  const [currentVersion, setCurrentVersion] = useState("2.6.0");
  const [minVersion, setMinVersion] = useState("2.0.0");
  const [downloadUrl, setDownloadUrl] = useState("https://voidmenu.vip/download");
  const [webhookUrl, setWebhookUrl] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setCurrentVersion(data.current_version);
      setMinVersion(data.min_version);
      setDownloadUrl(data.download_url);
      setWebhookUrl(data.discord_webhook_url || "");
    } catch (err: any) {
      toast("Failed to load settings", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        current_version: currentVersion,
        min_version: minVersion,
        download_url: downloadUrl,
        discord_webhook_url: webhookUrl,
      });
      setSettings(updated.settings);
      toast("Platform settings updated successfully", "success");
    } catch (err: any) {
      toast("Failed to save settings", "error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast("Please enter a Discord webhook URL first", "warning");
      return;
    }
    setTestingWebhook(true);
    try {
      // Save first
      await api.updateSettings({ discord_webhook_url: webhookUrl });
      const res = await api.testDiscordWebhook();
      if (res.success) {
        toast("Discord Webhook Verified!", "success", "Check your Discord channel for the alert embed.");
      }
    } catch (err: any) {
      toast("Webhook test failed", "error", err.message);
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)] shadow-sm">
        <div>
          <h2 className="text-lg font-display tracking-tight font-medium flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--accent)]" />
            Platform & Security Configuration
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Manage mod menu version requirements, OTA updates, and Discord event webhooks.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: OTA Version Enforcer */}
        <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-soft)]">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h3 className="font-display text-sm font-medium">OTA Mod Menu Version Control</h3>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Current Released Version
            </label>
            <input
              type="text"
              required
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Minimum Supported Version (Force Update Gate)
            </label>
            <input
              type="text"
              required
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono"
            />
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Game clients running a build below this version will be rejected with an update prompt.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Direct Download / APK Update URL
            </label>
            <input
              type="url"
              required
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono"
            />
          </div>
        </div>

        {/* Right: Discord Webhooks & Security Status */}
        <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-soft)]">
              <Bell className="w-4 h-4 text-indigo-400" />
              <h3 className="font-display text-sm font-medium">Discord Live Event Webhook</h3>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
                Webhook Endpoint URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono"
              />
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Dispatches live embed notifications for new device bindings, anti-tamper triggers, and blacklist hits.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-[var(--border-soft)] hover:bg-[var(--surface)] text-[var(--ink)] transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>{testingWebhook ? "Sending..." : "Send Test Webhook Embed"}</span>
            </button>
          </div>

          {/* Cryptographic Architecture Card */}
          <div className="p-3.5 rounded border border-[var(--border-soft)] bg-[var(--surface)] text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Cryptographic Salt:</span>
              <span className="text-emerald-500 font-bold">VOID_SECURE_SALT_2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Database Journal:</span>
              <span className="text-sky-400">SQLite WAL Mode (High Concurrency)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Socket Security:</span>
              <span className="text-amber-500">SHA-256 HMAC Payload Verification</span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-medium rounded-md bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] shadow-md transition-all"
          >
            {saving ? "Saving Configuration..." : "Save Platform Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};
