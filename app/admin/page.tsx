import type { Metadata } from "next";

import { AdminAccessRetry } from "@/components/admin/admin-access-retry";
import { AdminWorkspaceShell } from "@/components/admin/admin-workspace-shell";
import { AdminProductEditor } from "@/components/forms/admin-product-editor";
import { getAdminAccess } from "@/lib/server/admin-auth";
import {
  getCategoryOptions,
  getCategoryTree,
  getAdminProductSummaries,
  getProductBySlug,
} from "@/lib/server/catalog-products";
import { getCurrencyRates } from "@/lib/server/currency-service";
import { getR2ConfigurationStatus } from "@/lib/server/r2-config";

export const metadata: Metadata = {
  title: "Admin Panel",
  description:
    "Manage products, orders, users, wholesale flows, reports, promotions, and currency rates.",
};

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    product?: string | string[];
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return <AdminAccessRetry message={adminAccess.reason} />;
  }

  const query = await searchParams;
  const requestedProductSlug = Array.isArray(query.product)
    ? query.product[0]
    : query.product;
  const requestedMode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  const initialMode = requestedMode === "duplicate" ? "duplicate" : "edit";
  const [
    productSummaries,
    categoryTree,
    categoryOptions,
    rates,
    r2Configuration,
    initialProduct,
  ] =
    await Promise.all([
      getAdminProductSummaries(),
      getCategoryTree(),
      getCategoryOptions(),
      getCurrencyRates(),
      Promise.resolve(getR2ConfigurationStatus()),
      requestedProductSlug
        ? getProductBySlug(requestedProductSlug)
        : Promise.resolve(undefined),
    ]);

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
          initialMode={initialMode}
          initialProduct={initialProduct ?? null}
          initialProducts={productSummaries}
          ratesFromPkr={rates.rates}
        />
      ) : null}
    </AdminWorkspaceShell>
  );
}
