import React, { useState, useEffect } from "react";
import { api, AnnouncementRecord, AppSettings } from "../../lib/api";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import { Radio, AlertOctagon, Plus, Trash2, Power, Bell, CheckCircle2, ShieldAlert } from "lucide-react";

export const BroadcastsView: React.FC = () => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);

  // New Announcement Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("info");
  const [submitting, setSubmitting] = useState(false);

  // Maintenance Killswitch editing state
  const [maintMsg, setMaintMsg] = useState("");
  const [updatingMaint, setUpdatingMaint] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [anns, sets] = await Promise.all([
        api.getAnnouncements(),
        api.getSettings(),
      ]);
      setAnnouncements(anns);
      setSettings(sets);
      setMaintMsg(sets.maintenance_message);
    } catch (err: any) {
      toast("Failed to load broadcast telemetry", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleMaintenance = async () => {
    if (!settings) return;
    const nextMode = !settings.maintenance_mode;
    setUpdatingMaint(true);
    try {
      const res = await api.updateSettings({
        maintenance_mode: nextMode,
        maintenance_message: maintMsg,
      });
      setSettings(res.settings);
      toast(
        nextMode ? "🚨 Remote Maintenance Mode ACTIVATED" : "✅ Normal Service RESTORED",
        nextMode ? "error" : "success",
        nextMode ? "All non-owner client launches are blocked." : "Clients can now authenticate normally."
      );
    } catch (err: any) {
      toast("Failed to toggle maintenance mode", "error", err.message);
    } finally {
      setUpdatingMaint(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createAnnouncement(title, content, severity);
      if (res.success) {
        toast("In-Game Broadcast published!", "success", "Active mod menus will receive this announcement.");
        setModalOpen(false);
        setTitle("");
        setContent("");
        loadData();
      }
    } catch (err: any) {
      toast("Failed to publish broadcast", "error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await api.toggleAnnouncement(id);
      loadData();
    } catch (err: any) {
      toast("Failed to toggle status", "error", err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this broadcast?")) return;
    try {
      await api.deleteAnnouncement(id);
      toast("Announcement deleted", "info");
      loadData();
    } catch (err: any) {
      toast("Failed to delete announcement", "error", err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Remote Maintenance Mode Kill Switch Card */}
      <div
        className={`p-5 rounded-lg border transition-all shadow-sm ${
          settings?.maintenance_mode
            ? "border-rose-500/50 bg-rose-500/10 text-[var(--ink)]"
            : "border-[var(--border-soft)] bg-[var(--surface-solid)]"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                settings?.maintenance_mode ? "bg-rose-500 text-white" : "bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              <Power className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-medium">Remote Killswitch & Maintenance Gate</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    settings?.maintenance_mode
                      ? "bg-rose-600 text-white border-rose-500"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {settings?.maintenance_mode ? "EMERGENCY LOCKDOWN ACTIVE" : "GATEWAYS ONLINE"}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                When enabled, all client launches are instantly blocked with the emergency message below.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleMaintenance}
            disabled={updatingMaint}
            className={`px-4 py-2 text-xs font-semibold rounded-md shadow transition-all ${
              settings?.maintenance_mode
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
          >
            {settings?.maintenance_mode ? "Deactivate Lockdown" : "Trigger Emergency Lockdown"}
          </button>
        </div>

        {/* Maintenance Message Input */}
        <div className="mt-4 pt-3 border-t border-[var(--line)]">
          <label className="block text-[10px] uppercase font-mono text-[var(--muted)] mb-1">
            Lockdown Reason / Notice to Game Clients:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={maintMsg}
              onChange={(e) => setMaintMsg(e.target.value)}
              placeholder="e.g. Game patch detected. Anti-cheat offsets updating..."
              className="flex-1 px-3 py-1.5 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={async () => {
                await api.updateSettings({ maintenance_message: maintMsg });
                toast("Lockdown notice updated", "success");
              }}
              className="px-3 py-1.5 text-xs rounded border border-[var(--border-soft)] hover:bg-[var(--surface)] text-[var(--ink)]"
            >
              Save Message
            </button>
          </div>
        </div>
      </div>

      {/* Broadcasts Manager Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)] shadow-sm">
        <div>
          <h2 className="text-lg font-display tracking-tight font-medium flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-500" />
            In-Game Announcements & Remote Broadcasts
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Push real-time banners and notifications directly to players in the mod menu client.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] overflow-hidden shadow-sm">
        <div className="divide-y divide-[var(--line)]">
          {announcements.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--muted)]">
              No broadcasts created yet. Publish an announcement to broadcast to all clients.
            </div>
          ) : (
            announcements.map((a) => {
              const isActive = Boolean(a.is_active);
              return (
                <div key={a.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          a.severity === "critical"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : a.severity === "warning"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                        }`}
                      >
                        {a.severity}
                      </span>
                      <strong className="text-xs font-semibold text-[var(--ink)]">
                        {a.title}
                      </strong>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full border ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {isActive ? "Broadcasting" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {a.content}
                    </p>
                    <span className="block text-[10px] font-mono text-[var(--muted)]">
                      Published {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleActive(a.id)}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                        isActive
                          ? "border-[var(--border-soft)] hover:bg-[var(--surface)] text-[var(--muted)]"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded border border-[var(--border-soft)] hover:bg-rose-500/10 hover:text-rose-500 text-[var(--muted)] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Broadcast Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Publish Live In-Game Broadcast">
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Broadcast Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maintenance Notice / Feature Update"
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Severity Level
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="info">Info (Standard announcement banner)</option>
              <option value="warning">Warning (Yellow priority alert)</option>
              <option value="critical">Critical (Red urgent notification)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 font-mono uppercase text-[10px]">
              Announcement Body
            </label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detailed message displayed on the player's screen upon mod menu connection..."
              className="w-full px-3 py-2 text-xs rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-1.5 text-xs rounded border border-[var(--border-soft)] hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs rounded bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)]"
            >
              {submitting ? "Publishing..." : "Broadcast to Clients"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
