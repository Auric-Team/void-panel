import React, { useState, useEffect } from "react";
import { api, AnnouncementRecord, AppSettings } from "../../lib/api";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import { Radio, Plus, Trash2, Power, RefreshCw } from "lucide-react";

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
        nextMode ? "Remote Maintenance Mode ACTIVATED" : "Normal Service RESTORED",
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
      <div className="ref-panel p-6 sm:p-7">
        <div className="ref-section-head">
          <div className="flex items-start gap-4">
            <span className="ref-section-number">01</span>
            <div>
              <div className="ref-eyebrow">Global Gate Control</div>
              <h2 className="text-2xl font-display tracking-tight flex items-center gap-2.5">
                Remote Killswitch & Maintenance Gate
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`ref-badge ${settings?.maintenance_mode ? "danger" : "success"}`}>
              <span className="dot" />
              {settings?.maintenance_mode ? "EMERGENCY LOCKDOWN ACTIVE" : "GATEWAYS ONLINE"}
            </span>
            <button
              onClick={handleToggleMaintenance}
              disabled={updatingMaint}
              className={`ref-btn ${settings?.maintenance_mode ? "primary" : "solid-danger"}`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{settings?.maintenance_mode ? "Deactivate Lockdown" : "Trigger Emergency Lockdown"}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--muted)] mb-4">
          When enabled, all client launches are immediately blocked at the verification gateway with the lockdown notice below.
        </p>

        {/* Maintenance Message Input */}
        <div className="ref-card p-4">
          <label className="ref-label">
            Lockdown Reason / Notice to Game Clients
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="ref-input-wrap flex-1">
              <input
                type="text"
                value={maintMsg}
                onChange={(e) => setMaintMsg(e.target.value)}
                placeholder="e.g. Game patch detected. Anti-cheat offsets updating..."
              />
            </div>
            <button
              onClick={async () => {
                await api.updateSettings({ maintenance_message: maintMsg });
                toast("Lockdown notice updated", "success");
              }}
              className="ref-btn"
            >
              Save Notice
            </button>
          </div>
        </div>
      </div>

      {/* Broadcasts Manager */}
      <div className="ref-panel p-6 sm:p-7">
        <div className="ref-section-head">
          <div className="flex items-start gap-4">
            <span className="ref-section-number">02</span>
            <div>
              <div className="ref-eyebrow">Live Client Messaging</div>
              <h2 className="text-2xl font-display tracking-tight">
                In-Game Announcements & Remote Broadcasts
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="ref-btn">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button onClick={() => setModalOpen(true)} className="ref-btn primary">
              <Plus className="w-3.5 h-3.5" />
              <span>New Broadcast</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="ref-card p-8 text-center text-xs text-[var(--muted)]">
              No broadcasts created yet. Publish an announcement to broadcast to all connected clients.
            </div>
          ) : (
            announcements.map((a) => {
              const isActive = Boolean(a.is_active);
              return (
                <div
                  key={a.id}
                  className="ref-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`ref-badge ${
                          a.severity === "critical"
                            ? "danger"
                            : a.severity === "warning"
                            ? "warning"
                            : "info"
                        }`}
                      >
                        <span className="dot" />
                        {a.severity.toUpperCase()}
                      </span>
                      <strong className="text-sm font-semibold text-[var(--ink)]">
                        {a.title}
                      </strong>
                      <span className={`ref-badge ${isActive ? "success" : ""}`}>
                        <span className="dot" />
                        {isActive ? "Broadcasting" : "Paused"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">{a.content}</p>
                    <span className="block text-[10px] font-mono text-[var(--muted)]">
                      Published {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleActive(a.id)}
                      className={`ref-btn !py-1.5 !px-3 ${isActive ? "" : "primary"}`}
                    >
                      {isActive ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="ref-btn danger !py-1.5 !px-2.5"
                      title="Delete Broadcast"
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
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Publish Live In-Game Broadcast"
        eyebrow="Client Telemetry Feed"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="ref-label">Broadcast Title</label>
            <div className="ref-input-wrap">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Maintenance Notice / Feature Update"
              />
            </div>
          </div>

          <div>
            <label className="ref-label">Severity Level</label>
            <div className="ref-input-wrap">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="font-mono"
              >
                <option value="info">Info (Standard announcement banner)</option>
                <option value="warning">Warning (Amber priority alert)</option>
                <option value="critical">Critical (Red urgent notification)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="ref-label">Announcement Body</label>
            <div className="ref-input-wrap !h-auto py-2">
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Detailed message displayed on the player's screen upon mod menu connection..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
            <button type="button" onClick={() => setModalOpen(false)} className="ref-btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="ref-btn primary">
              <Radio className="w-3.5 h-3.5" />
              <span>{submitting ? "Publishing..." : "Broadcast to Clients"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
