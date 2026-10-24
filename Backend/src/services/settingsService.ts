import { db } from "../db/database.js";
import type { AppSettings } from "../types/index.js";

export const SettingsService = {
  getSettings(): AppSettings {
    const rows = db.query("SELECT key, value FROM settings").all() as { key: string; value: string }[];
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    return {
      current_version: map.get("current_version") || "2.6.0",
      min_version: map.get("min_version") || "2.0.0",
      download_url: map.get("download_url") || "https://voidmenu.vip/download",
      maintenance_mode: map.get("maintenance_mode") === "true",
      maintenance_message: map.get("maintenance_message") || "Void servers are undergoing maintenance.",
      discord_webhook_url: map.get("discord_webhook_url") || "",
    };
  },

  updateSettings(updates: Partial<AppSettings>): AppSettings {
    for (const [key, val] of Object.entries(updates)) {
      db.run(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
        [key, String(val), String(val)]
      );
    }
    return this.getSettings();
  },

  async sendDiscordWebhook(
    title: string,
    description: string,
    color = 0x4373ff,
    fields: { name: string; value: string; inline?: boolean }[] = []
  ): Promise<void> {
    const settings = this.getSettings();
    if (!settings.discord_webhook_url || !settings.discord_webhook_url.startsWith("http")) return;

    try {
      await fetch(settings.discord_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "VOID Security Bot",
          avatar_url: "https://voidmenu.vip/avatar.png",
          embeds: [
            {
              title,
              description,
              color,
              fields,
              footer: { text: "VOID Licensing Engine · Zero Latency" },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (err) {
      console.error("[WEBHOOK ERROR]", err);
    }
  },
};
