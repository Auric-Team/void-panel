import React, { useState, useEffect } from "react";
import { api, AppSettings } from "../../lib/api";
import { useToast } from "../Toast";
import { Settings, Bell, Send, Cpu } from "lucide-react";

export const SettingsView: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

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
      <div className="ref-panel p-5 flex items-center justify-between">
        <div className="ref-section-head">
          <span className="ref-section-number">01</span>
          <div>
            <h2 className="font-display text-2xl font-normal text-[var(--ink)]">
              Platform &amp; Security Configuration
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Manage mod menu version requirements, OTA update URLs, and Discord event webhooks.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="ref-panel p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h3 className="font-display text-lg font-normal">OTA Mod Menu Version Control</h3>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Current Released Version
            </label>
            <div className="ref-input-wrap">
              <input
                type="text"
                required
                value={currentVersion}
                onChange={(e) => setCurrentVersion(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-xs text-[var(--ink)] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Minimum Supported Version (Force Update Gate)
            </label>
            <div className="ref-input-wrap">
              <input
                type="text"
                required
                value={minVersion}
                onChange={(e) => setMinVersion(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-xs text-[var(--ink)] font-mono"
              />
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Game clients running a build below this version will be rejected with an update prompt.
            </p>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Direct Download / APK Update URL
            </label>
            <div className="ref-input-wrap">
              <input
                type="url"
                required
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-xs text-[var(--ink)] font-mono"
              />
            </div>
          </div>
        </div>

        <div className="ref-panel p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
              <Bell className="w-4 h-4 text-indigo-400" />
              <h3 className="font-display text-lg font-normal">Discord Live Event Webhook</h3>
            </div>

            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Webhook Endpoint URL
              </label>
              <div className="ref-input-wrap">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-transparent border-0 outline-none text-xs text-[var(--ink)] font-mono"
                />
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Dispatches live embed notifications for new device bindings, anti-tamper triggers, and blacklist hits.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              className="ref-btn"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>{testingWebhook ? "Sending..." : "Send Test Webhook Embed"}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Cryptographic Salt:</span>
              <span className="text-emerald-500 font-bold">VOID_SECURE_SALT_2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Database Journal:</span>
              <span className="text-sky-400">SQLite WAL Mode</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Socket Security:</span>
              <span className="text-amber-500">SHA-256 HMAC Payload Verification</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" disabled={saving} className="ref-btn primary !min-h-[40px] !px-6 font-semibold">
            {saving ? "Saving Configuration..." : "Save Platform Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};
