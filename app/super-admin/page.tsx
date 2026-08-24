import type { Metadata } from "next";
import Link from "next/link";

import { AdminAccessRetry } from "@/components/admin/admin-access-retry";
import { AdminAccessManager } from "@/components/forms/admin-access-manager";
import { getAdminAccess } from "@/lib/server/admin-auth";
import {
  type AdminAccountRow,
  listAdminAccounts,
} from "@/lib/server/admin-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Super Admin",
  description: "Manage Equinemates admin access.",
};

function serializeAdmin(admin: AdminAccountRow) {
  return {
    ...admin,
    lastInviteSentAt: admin.lastInviteSentAt?.toISOString() ?? null,
    acceptedAt: admin.acceptedAt?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  };
}

export default async function SuperAdminPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return (
      <div className="super-admin-auth-panel">
        <AdminAccessRetry message={adminAccess.reason} />
      </div>
    );
  }

  if (!adminAccess.isSuperAdmin) {
    return (
      <section className="panel super-admin-auth-panel">
        <h2>Super Admin Access Required</h2>
        <p>This page is only available to the super admin.</p>
      </section>
    );
  }

  const admins = await listAdminAccounts();

  return (
    <div className="admin-page-shell super-admin-page-shell">
      <section className="admin-page-header super-admin-header">
        <div className="admin-page-header-copy">
          <h1>Super Admin Dashboard</h1>
        </div>
        <div className="super-admin-header-actions">
          <Link className="btn-secondary" href="/admin">
            Admin Workspace
          </Link>
        </div>
      </section>

      <AdminAccessManager
        currentEmail={adminAccess.primaryEmail}
        initialAdmins={admins.map(serializeAdmin)}
      />
    </div>
  );
}
