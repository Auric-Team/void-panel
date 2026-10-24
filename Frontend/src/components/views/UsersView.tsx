import React, { useState, useEffect } from "react";
import { api, UserPublicProfile, UserRole } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import {
  Users,
  UserPlus,
  Coins,
  Shield,
  Ban,
  CheckCircle2,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  AlertCircle,
} from "lucide-react";

export const UsersView: React.FC = () => {
  const { user: currentUser, role, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Create User Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("reseller");
  const [initialCredits, setInitialCredits] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  // Credit Transfer Modal state
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserPublicProfile | null>(null);
  const [grantAmount, setGrantAmount] = useState(50);
  const [grantNote, setGrantNote] = useState("");

  // Password Reset Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserPublicProfile | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      toast("Failed to load users", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      toast("Validation Error", "error", "Username and password are required.");
      return;
    }
    if (newPassword.length < 6) {
      toast("Validation Error", "error", "Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      // Role enforcement: Admin can only create Resellers
      const assignedRole = role === "admin" ? "reseller" : newRole;
      const res = await api.createUser(newUsername.trim(), newPassword, assignedRole, initialCredits);
      if (res.success) {
        toast(
          `User @${res.user.username} created successfully!`,
          "success",
          `Role: ${res.user.role.toUpperCase()} with ${initialCredits} credits allotted.`
        );
        setCreateModalOpen(false);
        setNewUsername("");
        setNewPassword("");
        setInitialCredits(100);
        loadUsers();
        refreshProfile();
      }
    } catch (err: any) {
      toast("User creation failed", "error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (grantAmount <= 0) {
      toast("Validation Error", "error", "Credit amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.grantCredits(targetUser.id, grantAmount, grantNote);
      if (res.success) {
        toast(`Transferred ${grantAmount} credits to @${targetUser.username}`, "success");
        setCreditModalOpen(false);
        setGrantAmount(50);
        setGrantNote("");
        setTargetUser(null);
        loadUsers();
        refreshProfile();
      }
    } catch (err: any) {
      toast("Credit transfer failed", "error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      toast("Validation Error", "error", "Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.resetUserPassword(resetTargetUser.id, resetPasswordVal);
      if (res.success) {
        toast(
          `Password updated for @${resetTargetUser.username}`,
          "success",
          "Their active sessions were cleared. They must log in with the new password."
        );
        setResetModalOpen(false);
        setResetPasswordVal("");
        setResetTargetUser(null);
      }
    } catch (err: any) {
      toast("Password reset failed", "error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserPublicProfile) => {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    try {
      await api.updateUserStatus(user.id, nextStatus);
      toast(`User @${user.username} is now ${nextStatus}`, "info");
      loadUsers();
    } catch (err: any) {
      toast("Failed to update status", "error", err.message);
    }
  };

  const handleDeleteUser = async (user: UserPublicProfile) => {
    if (!confirm(`Are you sure you want to permanently delete user @${user.username}?`)) return;
    try {
      await api.deleteUser(user.id);
      toast(`User @${user.username} deleted permanently`, "success");
      loadUsers();
    } catch (err: any) {
      toast("Failed to delete user", "error", err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)] shadow-sm">
        <div>
          <h2 className="text-lg font-display tracking-tight font-medium flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--accent)]" />
            <span>{role === "owner" ? "Admins & Resellers Management" : "Reseller Hierarchy"}</span>
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {role === "owner"
              ? "Master user management: create Admins & Resellers, assign credentials, transfer credits, and manage passwords."
              : "Manage subordinate Resellers: create logins, set passwords, and transfer your credits directly."}
          </p>
        </div>
        <button
          onClick={() => {
            setNewRole("reseller");
            setCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] shadow-sm transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{role === "owner" ? "Create Admin / Reseller" : "Add New Reseller"}</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface)] text-[var(--muted)] border-b border-[var(--border-soft)] font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Credit Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium">Last Active</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)] font-ui">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const canManage =
                  (role === "owner" && u.role !== "owner") ||
                  (role === "admin" && u.role === "reseller");

                return (
                  <tr key={u.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-[var(--ink)]">@{u.username}</span>
                        {isSelf && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface)] text-[var(--muted)] border border-[var(--border-soft)] font-mono">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${
                          u.role === "owner"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            : u.role === "admin"
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {u.role === "owner" ? "👑 Owner" : u.role === "admin" ? "🛡️ Admin" : "⚡ Reseller"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono font-medium">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span className={u.role === "owner" ? "text-amber-500" : "text-[var(--ink)]"}>
                          {u.role === "owner" ? "Unlimited (∞)" : `${u.credits} CR`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono rounded-full border ${
                          u.status === "active"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] font-mono text-[11px]">
                      {u.creator_name ? `@${u.creator_name}` : "Genesis Root"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] font-mono text-[11px]">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Transfer Credits Button */}
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setCreditModalOpen(true);
                            }}
                            title="Transfer Credits to this User"
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)] hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3 text-amber-500" />
                            <span>Transfer CR</span>
                          </button>

                          {/* Reset Password Button */}
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setResetPasswordVal("");
                              setResetModalOpen(true);
                            }}
                            title="Set / Reset User Password"
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-[var(--border-soft)] bg-[var(--surface)] text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/40 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Password</span>
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={u.status === "active" ? "Suspend user" : "Activate user"}
                            className="p-1 rounded text-[var(--muted)] hover:text-amber-500 hover:bg-[var(--surface)] transition-colors cursor-pointer"
                          >
                            {u.status === "active" ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Delete user"
                            className="p-1 rounded text-[var(--muted)] hover:text-rose-500 hover:bg-[var(--surface)] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--muted)] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create User */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={role === "owner" ? "Create Subordinate Account (Admin / Reseller)" : "Create New Reseller"}
        icon={<UserPlus className="w-5 h-5 text-[var(--accent)]" />}
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-ui">
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Username
            </label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. reseller_void_01"
              autoComplete="off"
              className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] font-mono"
            />
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Password
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)]">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Set user login password (min 6 chars)"
                autoComplete="new-password"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {role === "owner" ? (
            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Account Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] font-mono"
              >
                <option value="reseller">Reseller (Generates keys with credits)</option>
                <option value="admin">Admin (Can create resellers & manage credits)</option>
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-[11px] text-[var(--muted)] font-mono">
              Account Role: <span className="text-emerald-400 font-semibold uppercase">Reseller</span> (Fixed for Admins)
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[var(--muted)] font-mono uppercase text-[10px]">
                Initial Credit Allotment
              </label>
              {role === "admin" && (
                <span className="text-[10px] text-amber-500 font-mono">
                  Your Available Balance: {currentUser?.credits || 0} CR
                </span>
              )}
            </div>
            <input
              type="number"
              min={0}
              max={role === "admin" ? currentUser?.credits || 0 : 50000}
              value={initialCredits}
              onChange={(e) => setInitialCredits(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] font-mono"
            />
            <p className="text-[10px] text-[var(--muted)] mt-1 font-mono">
              Rule: 24h key = 10 CR. 100 CR = 10 daily keys.
              {role === "admin" && " (Credits will be deducted from your Admin balance)"}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3.5 py-1.5 text-xs rounded-md border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs rounded-md bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] font-medium transition-all disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Transfer Credits */}
      <Modal
        isOpen={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        title={`Transfer Credits to @${targetUser?.username}`}
        icon={<Coins className="w-5 h-5 text-amber-500" />}
      >
        <form onSubmit={handleGrantCredits} className="space-y-4 text-xs font-ui">
          <div className="p-3 rounded-md bg-[var(--surface)] border border-[var(--border-soft)] text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Target Recipient:</span>
              <span className="font-mono font-medium text-[var(--ink)]">@{targetUser?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Recipient Current Balance:</span>
              <span className="font-mono font-semibold text-amber-500">{targetUser?.credits} Credits</span>
            </div>
            {role === "admin" && (
              <div className="flex justify-between pt-1 border-t border-[var(--border-soft)]">
                <span className="text-[var(--muted)]">Your Available Pool:</span>
                <span className="font-mono font-semibold text-indigo-400">{currentUser?.credits} Credits</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Credits to Transfer
            </label>
            <input
              type="number"
              min={1}
              max={role === "admin" ? currentUser?.credits || 0 : 100000}
              required
              value={grantAmount}
              onChange={(e) => setGrantAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] font-mono"
            />
            <div className="flex gap-2 mt-2">
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setGrantAmount(amt)}
                  className="px-2 py-1 text-[10px] font-mono rounded border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)] hover:border-amber-500/40"
                >
                  +{amt} CR
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Transfer Memo / Reason
            </label>
            <input
              type="text"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="e.g. Weekly reseller quota refill"
              className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => setCreditModalOpen(false)}
              className="px-3.5 py-1.5 text-xs rounded-md border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs rounded-md bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] font-medium transition-all disabled:opacity-50"
            >
              {submitting ? "Transferring..." : "Confirm Credit Transfer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Set / Reset User Password */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Set / Reset Password for @${resetTargetUser?.username}`}
        icon={<KeyRound className="w-5 h-5 text-sky-400" />}
      >
        <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-ui">
          <div className="p-3 rounded-md bg-[var(--surface)] border border-[var(--border-soft)] text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Target User:</span>
              <span className="font-mono font-medium text-[var(--ink)]">@{resetTargetUser?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Role:</span>
              <span className="font-mono uppercase font-semibold text-emerald-400">{resetTargetUser?.role}</span>
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              New Password
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)]">
              <input
                type={showResetPassword ? "text" : "password"}
                required
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                placeholder="Enter new strong password (min 6 chars)"
                autoComplete="new-password"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[11px] font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
            <span>
              Saving this will immediately invalidate their current active sessions and require them to log in with this new password.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-3.5 py-1.5 text-xs rounded-md border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs rounded-md bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-bright)] font-medium transition-all disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
