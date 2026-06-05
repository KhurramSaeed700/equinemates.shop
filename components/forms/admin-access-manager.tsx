"use client";

import { FormEvent, useState } from "react";
import { FiPlus, FiShield, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";

import type { AdminAccountRow } from "@/lib/server/admin-directory";

type AdminAccount = Omit<
  AdminAccountRow,
  "lastInviteSentAt" | "acceptedAt" | "createdAt" | "updatedAt"
> & {
  lastInviteSentAt: string | Date | null;
  acceptedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type AdminAccessManagerProps = {
  currentEmail: string | null;
  initialAdmins: AdminAccount[];
};

type AdminsResponse = {
  admins?: AdminAccount[];
  inviteEmailError?: string | null;
  inviteEmailSent?: boolean;
  inviteUrl?: string;
  message?: string;
};

function formatAdminRole(role: AdminAccount["role"]) {
  return role === "SUPER_ADMIN" ? "Super admin" : "Admin";
}

function formatDate(input: string | Date | null) {
  if (!input) {
    return "Not sent yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}

function getInitials(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminAccessManager({
  currentEmail,
  initialAdmins,
}: AdminAccessManagerProps) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRemovalEmail, setPendingRemovalEmail] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [manualInviteUrl, setManualInviteUrl] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();

    if (!nextEmail) {
      toast.error("Enter an admin email address.");
      return;
    }

    setIsSubmitting(true);
    setManualInviteUrl(null);

    try {
      const response = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: nextEmail }),
      });
      const payload = (await response.json()) as AdminsResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not add admin access.");
      }

      if (payload.admins) {
        setAdmins(payload.admins);
      }
      setEmail("");

      if (payload.inviteEmailSent) {
        toast.success(payload.message ?? "Admin invitation sent.");
      } else {
        setManualInviteUrl(payload.inviteUrl ?? null);
        toast.warning(payload.message ?? "Admin added, but email was not sent.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add admin access.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(targetEmail: string) {
    setRemovingEmail(targetEmail);

    try {
      const response = await fetch("/api/super-admin/admins", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail }),
      });
      const payload = (await response.json()) as AdminsResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not remove admin access.");
      }

      if (payload.admins) {
        setAdmins(payload.admins);
      }
      setPendingRemovalEmail(null);
      toast.success(payload.message ?? "Admin access removed.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not remove admin access.",
      );
    } finally {
      setRemovingEmail(null);
    }
  }

  return (
    <div className="super-admin-manager">
      <section className="super-admin-invite-panel">
        <div className="super-admin-section-heading">
          <span aria-hidden="true">
            <FiPlus />
          </span>
          <div>
            <h2>Add Admin</h2>
          </div>
        </div>

        <form className="super-admin-invite-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label sr-only">Admin email</span>
            <input
              className="ui-input"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
          </label>
          <button className="btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Sending..." : "Send invite"}
          </button>
        </form>

        {manualInviteUrl ? (
          <div className="super-admin-manual-invite" role="status">
            <span>Email was not sent. Share this sign-in link manually:</span>
            <code>{manualInviteUrl}</code>
          </div>
        ) : null}
      </section>

      <section className="super-admin-list-panel">
        <div className="super-admin-section-heading">
          <span aria-hidden="true">
            <FiShield />
          </span>
          <div>
            <h2>Admins</h2>
          </div>
        </div>

        <div className="super-admin-list" role="list">
          {admins.map((admin) => {
            const isCurrentUser = currentEmail === admin.email;
            const canRemove = admin.role !== "SUPER_ADMIN";
            const isConfirming = pendingRemovalEmail === admin.email;
            const isRemoving = removingEmail === admin.email;

            return (
              <article className="super-admin-row" key={admin.email} role="listitem">
                <div className="super-admin-person">
                  <span className="super-admin-avatar" aria-hidden="true">
                    {getInitials(admin.email)}
                  </span>
                  <div>
                    <strong>
                      {admin.email}
                      {isCurrentUser ? <span> You</span> : null}
                    </strong>
                    {admin.isSystem ? null : (
                      <small>
                        Invited: {formatDate(admin.lastInviteSentAt)}
                      </small>
                    )}
                  </div>
                </div>

                <div className="super-admin-role-stack">
                  <span
                    className={
                      admin.role === "SUPER_ADMIN"
                        ? "super-admin-role is-super"
                        : "super-admin-role"
                    }
                  >
                    {formatAdminRole(admin.role)}
                  </span>
                </div>

                <div className="super-admin-actions">
                  {canRemove ? (
                    isConfirming ? (
                      <>
                        <button
                          className="btn-secondary compact"
                          disabled={isRemoving}
                          onClick={() => setPendingRemovalEmail(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="super-admin-danger-btn"
                          disabled={isRemoving}
                          onClick={() => handleRemove(admin.email)}
                          type="button"
                        >
                          {isRemoving ? "Removing..." : "Confirm"}
                        </button>
                      </>
                    ) : (
                      <button
                        className="super-admin-remove-btn"
                        onClick={() => setPendingRemovalEmail(admin.email)}
                        type="button"
                      >
                        <FiTrash2 aria-hidden="true" />
                        Remove
                      </button>
                    )
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
