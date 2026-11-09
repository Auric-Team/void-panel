import React, { useState, useEffect } from "react";
import { api, UserPublicProfile, UserRole, printReceiptWindow } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import {
  Users,
  UserPlus,
  Coins,
  Ban,
  CheckCircle2,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  AlertCircle,
  Key,
  Receipt,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";

interface UsersViewProps {
  onInspectUser?: (userId: number) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ onInspectUser }) => {
  const { user: currentUser, role, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Bulk user selection
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<"resellers" | "non_owner">("resellers");
  const [deletingAll, setDeletingAll] = useState(false);

  // Create User Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("reseller");
  const [initialCredits, setInitialCredits] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  // Credit Transfer + Payment Receipt Option Modal state
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserPublicProfile | null>(null);
  const [grantAmount, setGrantAmount] = useState(100);
  const [grantNote, setGrantNote] = useState("");
  const [issueReceiptWithTransfer, setIssueReceiptWithTransfer] = useState(true);
  const [receiptAmountPaid, setReceiptAmountPaid] = useState(10);
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState("UPI / USDT");

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
      const assignedRole = role === "admin" ? "reseller" : newRole;
      const res = await api.createUser(newUsername.trim(), newPassword, assignedRole, initialCredits);
      if (res.success) {
        toast(
          `Account @${res.user.username} created!`,
          "success",
          `Role: ${res.user.role.toUpperCase()} with ${initialCredits} CR allotted.`
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
      if (issueReceiptWithTransfer) {
        const recRes = await api.createReceipt({
          userId: targetUser.id,
          username: targetUser.username,
          customerName: `@${targetUser.username}`,
          amountPaid: receiptAmountPaid,
          currency: "USD",
          creditsGranted: grantAmount,
          keysSummary: `${grantAmount} Reseller Credits Settlement (${Math.floor(grantAmount / 10)}x 24H Keys Equivalent)`,
          paymentMethod: receiptPaymentMethod,
          status: "paid",
          note: grantNote || "Credit Transfer & Payment Receipt",
          autoGrantCredits: true,
        });
        if (recRes.success && recRes.receipt) {
          toast(
            `Transferred ${grantAmount} CR & Issued Receipt ${recRes.receipt.receipt_no}`,
            "success"
          );
          printReceiptWindow(recRes.receipt);
        }
      } else {
        const res = await api.grantCredits(targetUser.id, grantAmount, grantNote);
        if (res.success) {
          toast(`Transferred ${grantAmount} credits to @${targetUser.username}`, "success");
        }
      }
      setCreditModalOpen(false);
      setGrantAmount(100);
      setGrantNote("");
      setTargetUser(null);
      loadUsers();
      refreshProfile();
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
        toast(`Password updated for @${resetTargetUser.username}`, "success");
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

  const handleConfirmDeleteAllResellers = async () => {
    setDeletingAll(true);
    try {
      const action = deleteScope === "non_owner" ? "delete_all_subordinates" : "delete_all_resellers";
      const res = await api.bulkUsersAction(action);
      if (res.success) {
        toast(res.message, "warning");
        setSelectedUserIds(new Set());
        setDeleteAllModalOpen(false);
        loadUsers();
      }
    } catch (err: any) {
      toast("Bulk delete failed", "error", err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleBulkSelectedAction = async (action: "delete" | "suspend" | "activate") => {
    if (selectedUserIds.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selectedUserIds.size} selected account(s)?`)) return;
    try {
      const res = await api.bulkUsersAction(action, Array.from(selectedUserIds));
      if (res.success) {
        toast(res.message, "success");
        setSelectedUserIds(new Set());
        loadUsers();
      }
    } catch (err: any) {
      toast("Bulk action failed", "error", err.message);
    }
  };

  const toggleSelectUser = (id: number) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };

  const manageableUsers = users.filter(
    (u) =>
      u.id !== currentUser?.id &&
      ((role === "owner" && u.role !== "owner") || (role === "admin" && u.role === "reseller"))
  );

  const resellerCount = users.filter((u) => u.role === "reseller").length;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="ref-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="ref-section-head">
          <span className="ref-section-number">01</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-normal text-[var(--ink)]">
                {role === "owner" ? "Accounts & Reseller Hierarchy" : "Reseller Hierarchy"}
              </h2>
              <span className="ref-badge font-mono text-[10px]">{users.length} Accounts</span>
              <span className="ref-badge success font-mono text-[10px]">{resellerCount} Resellers</span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Click on any account row to inspect how many keys they generated, duration breakdown, credit ledger, and payment receipts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setNewRole("reseller");
              setCreateModalOpen(true);
            }}
            className="ref-btn primary font-semibold"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{role === "owner" ? "Create Admin / Reseller" : "Create Reseller"}</span>
          </button>

          <button
            onClick={() => {
              setDeleteScope("resellers");
              setDeleteAllModalOpen(true);
            }}
            disabled={resellerCount === 0}
            className="ref-btn danger font-medium"
            title="Delete all resellers at once"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All Resellers</span>
          </button>
        </div>
      </div>

      {/* Bulk Selected Accounts Toolbar */}
      {selectedUserIds.size > 0 && (
        <div className="ref-panel p-3.5 border-[var(--accent)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
            <span>
              <strong>{selectedUserIds.size}</strong> account(s) selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkSelectedAction("activate")}
              className="ref-btn !min-h-[28px] !px-2.5 text-[11px] text-emerald-500"
            >
              Bulk Activate
            </button>
            <button
              onClick={() => handleBulkSelectedAction("suspend")}
              className="ref-btn !min-h-[28px] !px-2.5 text-[11px] text-amber-500"
            >
              Bulk Suspend
            </button>
            <button
              onClick={() => handleBulkSelectedAction("delete")}
              className="ref-btn danger !min-h-[28px] !px-2.5 text-[11px]"
            >
              <Trash2 className="w-3 h-3" /> Delete Selected ({selectedUserIds.size})
            </button>
            <button
              onClick={() => setSelectedUserIds(new Set())}
              className="px-2 py-1 text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="ref-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface)] text-[var(--muted)] border-b border-[var(--line)] font-mono text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      manageableUsers.length > 0 &&
                      selectedUserIds.size === manageableUsers.length
                    }
                    onChange={() => {
                      if (selectedUserIds.size === manageableUsers.length) {
                        setSelectedUserIds(new Set());
                      } else {
                        setSelectedUserIds(new Set(manageableUsers.map((u) => u.id)));
                      }
                    }}
                    className="rounded accent-[var(--accent)] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Account (Click to Inspect)</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Keys Generated &amp; Activity</th>
                <th className="px-4 py-3 font-medium">Credit Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] font-ui">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const canManage =
                  !isSelf &&
                  ((role === "owner" && u.role !== "owner") ||
                    (role === "admin" && u.role === "reseller"));
                const isSelected = selectedUserIds.has(u.id);

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isSelected ? "bg-[var(--selection)]" : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <td className="px-3 py-3.5">
                      {canManage ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(u.id)}
                          className="rounded accent-[var(--accent)] cursor-pointer"
                        />
                      ) : null}
                    </td>

                    {/* Clickable Account Handle */}
                    <td className="px-4 py-3.5 font-medium">
                      <button
                        type="button"
                        onClick={() => onInspectUser?.(u.id)}
                        className="flex items-center gap-2 text-left group cursor-pointer"
                        title={`Click to view how many keys @${u.username} generated & full analytics`}
                      >
                        <span className="font-mono text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--accent)] underline decoration-dotted underline-offset-4">
                          @{u.username}
                        </span>
                        {isSelf && (
                          <span className="ref-badge !h-[18px] !px-1.5 text-[9px] font-mono">
                            YOU
                          </span>
                        )}
                      </button>
                      <small className="block text-[10px] text-[var(--muted)] font-mono">
                        Last login: {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                      </small>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`ref-badge !h-[22px] text-[10px] font-mono uppercase font-semibold ${
                          u.role === "owner"
                            ? "warning"
                            : u.role === "admin"
                            ? "info"
                            : "success"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Keys Generated Column (Click to open deep analytics) */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => onInspectUser?.(u.id)}
                        className="text-left group cursor-pointer"
                        title="Click to inspect all keys generated by this account"
                      >
                        <div className="flex items-center gap-1.5 font-mono">
                          <Key className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <strong className="text-xs text-[var(--ink)] group-hover:text-[var(--accent)]">
                            {u.keys_generated ?? 0} Keys Generated
                          </strong>
                        </div>
                        <div className="text-[10px] font-mono text-[var(--muted)] mt-0.5">
                          <span className="text-emerald-500">{u.active_keys ?? 0} active</span> ·{" "}
                          <span className="text-sky-400">{u.bound_keys ?? 0} bound</span> ·{" "}
                          <span className="text-amber-500">{u.credits_spent ?? 0} CR spent</span>
                        </div>
                      </button>
                    </td>

                    {/* Credit Balance */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono font-semibold">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span className={u.role === "owner" ? "text-amber-500" : "text-[var(--ink)]"}>
                          {u.role === "owner" ? "Unlimited (∞)" : `${u.credits.toLocaleString()} CR`}
                        </span>
                      </div>
                      {(u.receipts_count ?? 0) > 0 && (
                        <small className="block text-[10px] font-mono text-[var(--muted)]">
                          {u.receipts_count} payment receipt(s)
                        </small>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`ref-badge !h-[22px] text-[10px] font-mono uppercase ${
                          u.status === "active" ? "success" : "danger"
                        }`}
                      >
                        <i className="w-1.5 h-1.5 rounded-full bg-current" />
                        {u.status}
                      </span>
                    </td>

                    {/* Created By */}
                    <td className="px-4 py-3.5 text-[var(--muted)] font-mono text-[11px]">
                      @{u.creator_name || "System"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect Account Keys Button */}
                        <button
                          type="button"
                          onClick={() => onInspectUser?.(u.id)}
                          title="Inspect keys generated, breakdown & receipts"
                          className="ref-btn !min-h-[28px] !px-2.5 text-[11px] font-mono"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Keys ({u.keys_generated ?? 0})</span>
                        </button>

                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetUser(u);
                                setGrantAmount(100);
                                setReceiptAmountPaid(10);
                                setCreditModalOpen(true);
                              }}
                              title="Transfer Credits & Issue Payment Receipt"
                              className="ref-btn !min-h-[28px] !px-2.5 text-[11px]"
                            >
                              <Send className="w-3 h-3 text-amber-500" />
                              <span>+CR / Receipt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setResetTargetUser(u);
                                setResetPasswordVal("");
                                setResetModalOpen(true);
                              }}
                              title="Reset Password"
                              className="ref-btn !min-h-[28px] !px-2 text-[11px]"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              title={u.status === "active" ? "Suspend account" : "Activate account"}
                              className="ref-btn !min-h-[28px] !px-2"
                            >
                              {u.status === "active" ? (
                                <Ban className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              title="Delete account"
                              className="ref-btn danger !min-h-[28px] !px-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Delete All Resellers at Once */}
      <Modal
        isOpen={deleteAllModalOpen}
        onClose={() => setDeleteAllModalOpen(false)}
        title="Delete All Resellers At Once"
        subtitle="Permanently remove subordinate accounts from the licensing hierarchy"
        icon={<AlertTriangle className="w-5 h-5 text-[var(--danger)]" />}
      >
        <div className="space-y-4 text-xs font-ui">
          <div className="space-y-2">
            <label
              onClick={() => setDeleteScope("resellers")}
              className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 ${
                deleteScope === "resellers"
                  ? "border-[var(--danger)] bg-[var(--danger-fill)]"
                  : "border-[var(--border-soft)] bg-[var(--surface)]"
              }`}
            >
              <input
                type="radio"
                checked={deleteScope === "resellers"}
                onChange={() => setDeleteScope("resellers")}
                className="mt-0.5 accent-[var(--danger)]"
              />
              <div>
                <strong className="block font-mono text-xs text-[var(--ink)]">
                  Delete All Reseller Accounts ({resellerCount} resellers)
                </strong>
                <span className="text-[11px] text-[var(--muted)]">
                  Removes all reseller logins and revokes their active sessions at once.
                </span>
              </div>
            </label>

            {role === "owner" && (
              <label
                onClick={() => setDeleteScope("non_owner")}
                className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 ${
                  deleteScope === "non_owner"
                    ? "border-[var(--danger)] bg-[var(--danger-fill)]"
                    : "border-[var(--border-soft)] bg-[var(--surface)]"
                }`}
              >
                <input
                  type="radio"
                  checked={deleteScope === "non_owner"}
                  onChange={() => setDeleteScope("non_owner")}
                  className="mt-0.5 accent-[var(--danger)]"
                />
                <div>
                  <strong className="block font-mono text-xs text-[var(--ink)]">
                    Delete All Admins &amp; Resellers ({users.filter((u) => u.role !== "owner").length} accounts)
                  </strong>
                  <span className="text-[11px] text-[var(--muted)]">
                    Removes every subordinate account while preserving the Master Owner account.
                </span>
                </div>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setDeleteAllModalOpen(false)} className="ref-btn">
              Cancel
            </button>
            <button
              onClick={handleConfirmDeleteAllResellers}
              disabled={deletingAll}
              className="ref-btn solid-danger font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deletingAll ? "Deleting..." : "Confirm Bulk Delete"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 1: Create User */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={role === "owner" ? "Create Admin or Reseller Account" : "Create New Reseller"}
        subtitle="Provision credentials and initial credit balance"
        icon={<UserPlus className="w-5 h-5 text-[var(--accent)]" />}
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-ui">
          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Account Username
            </label>
            <div className="ref-input-wrap">
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. reseller_alpha"
                autoComplete="off"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Password
            </label>
            <div className="ref-input-wrap">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                autoComplete="new-password"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {role === "owner" && (
            <div>
              <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                Hierarchy Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-mono outline-none"
              >
                <option value="reseller">Reseller (Mints keys using credits)</option>
                <option value="admin">Admin (Manages resellers &amp; credits)</option>
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[var(--muted)] font-mono uppercase text-[10px]">
                Initial Credit Allotment
              </label>
              {role === "admin" && (
                <span className="text-[10px] text-amber-500 font-mono">
                  Your Balance: {currentUser?.credits || 0} CR
                </span>
              )}
            </div>
            <div className="ref-input-wrap">
              <input
                type="number"
                min={0}
                max={role === "admin" ? currentUser?.credits || 0 : 100000}
                value={initialCredits}
                onChange={(e) => setInitialCredits(Number(e.target.value))}
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="ref-btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="ref-btn primary font-semibold">
              {submitting ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Transfer Credits + Automatic Payment Receipt Option */}
      <Modal
        isOpen={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        title={`Transfer Credits to @${targetUser?.username}`}
        subtitle="Allocate reseller credits and optionally generate an official Payment Receipt"
        icon={<Coins className="w-5 h-5 text-amber-500" />}
      >
        <form onSubmit={handleGrantCredits} className="space-y-4 text-xs font-ui">
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border-soft)] space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Recipient:</span>
              <strong>@{targetUser?.username}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Current Balance:</span>
              <strong className="text-amber-500">{targetUser?.credits} CR</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Total Keys Generated:</span>
              <strong>{targetUser?.keys_generated ?? 0} Keys</strong>
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Credits to Transfer
            </label>
            <div className="ref-input-wrap">
              <input
                type="number"
                min={1}
                required
                value={grantAmount}
                onChange={(e) => setGrantAmount(Number(e.target.value))}
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[50, 100, 250, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setGrantAmount(amt);
                    setReceiptAmountPaid(Math.round(amt * 0.1));
                  }}
                  className="ref-btn !min-h-[26px] !px-2 text-[10px] font-mono"
                >
                  +{amt} CR
                </button>
              ))}
            </div>
          </div>

          {/* Toggle to generate Payment Receipt */}
          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] cursor-pointer">
            <input
              type="checkbox"
              checked={issueReceiptWithTransfer}
              onChange={(e) => setIssueReceiptWithTransfer(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <div>
              <strong className="block text-xs text-[var(--ink)] flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                Generate &amp; Print Official Payment Receipt
              </strong>
              <span className="text-[10.5px] text-[var(--muted)]">
                Creates a formal receipt voucher (VOID-RCP-...) and opens the printable receipt view
              </span>
            </div>
          </label>

          {issueReceiptWithTransfer && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)]">
              <div>
                <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                  Amount Paid (USD)
                </label>
                <div className="ref-input-wrap !min-h-[34px]">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={receiptAmountPaid}
                    onChange={(e) => setReceiptAmountPaid(Number(e.target.value))}
                    className="w-full bg-transparent border-0 outline-none font-mono text-xs text-[var(--ink)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
                  Payment Method
                </label>
                <div className="ref-input-wrap !min-h-[34px]">
                  <input
                    type="text"
                    value={receiptPaymentMethod}
                    onChange={(e) => setReceiptPaymentMethod(e.target.value)}
                    placeholder="UPI / USDT / PayPal"
                    className="w-full bg-transparent border-0 outline-none font-mono text-xs text-[var(--ink)]"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[var(--muted)] mb-1 font-mono uppercase text-[10px]">
              Memo / Note
            </label>
            <div className="ref-input-wrap">
              <input
                type="text"
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
                placeholder="e.g. Reseller credit pack settlement"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreditModalOpen(false)} className="ref-btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="ref-btn primary font-semibold">
              {submitting
                ? "Processing..."
                : issueReceiptWithTransfer
                ? "Transfer Credits & Issue Receipt"
                : "Confirm Credit Transfer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Reset Password */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Password for @${resetTargetUser?.username}`}
        icon={<KeyRound className="w-5 h-5 text-sky-400" />}
      >
        <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-ui">
          <div className="ref-input-wrap">
            <input
              type={showResetPassword ? "text" : "password"}
              required
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              autoComplete="new-password"
              className="w-full bg-transparent border-0 outline-none text-[var(--ink)] font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowResetPassword(!showResetPassword)}
              className="text-[var(--muted)] hover:text-[var(--ink)]"
            >
              {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setResetModalOpen(false)} className="ref-btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="ref-btn primary font-semibold">
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
