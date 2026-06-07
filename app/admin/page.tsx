import type { Metadata } from "next";

import { AdminWorkspaceShell } from "@/components/admin/admin-workspace-shell";
import { AdminProductEditor } from "@/components/forms/admin-product-editor";
import { getAdminAccess } from "@/lib/server/admin-auth";
import {
  getCategoryOptions,
  getCategoryTree,
  getAdminProductSummaries,
} from "@/lib/server/catalog-products";
import { getCurrencyRates } from "@/lib/server/currency-service";
import { getR2ConfigurationStatus } from "@/lib/server/r2-config";

export const metadata: Metadata = {
  title: "Admin Panel",
  description:
    "Manage products, orders, users, wholesale flows, reports, promotions, and currency rates.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return (
      <section className="panel">
        <h2>Admin Access Required</h2>
        <p>Sign in with an admin account to continue.</p>
      </section>
    );
  }

  const [productSummaries, categoryTree, categoryOptions, rates, r2Configuration] =
    await Promise.all([
      getAdminProductSummaries(),
      getCategoryTree(),
      getCategoryOptions(),
      getCurrencyRates(),
      Promise.resolve(getR2ConfigurationStatus()),
    ]);
  const initialProduct = null;

  return (
    <AdminWorkspaceShell
      activeModule="products"
      stats={[{ label: "Products", value: productSummaries.length }]}
    >
      {!r2Configuration.isConfigured ? (
        <div className="admin-workspace-header">
          <div className="empty-state admin-inline-state">
            <p>R2 is not configured yet.</p>
            <p className="tiny">Missing variables: {r2Configuration.missing.join(", ")}</p>
          </div>
        </div>
      ) : null}

      {r2Configuration.isConfigured ? (
        <AdminProductEditor
          categoryTree={categoryTree}
          categoryOptions={categoryOptions}
          initialProduct={initialProduct}
          initialProducts={productSummaries}
          ratesFromPkr={rates.rates}
        />
      ) : null}
    </AdminWorkspaceShell>
  );
}
