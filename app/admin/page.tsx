import type { Metadata } from "next";

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

const adminModules = [
  "Products",
  "Orders",
  "Users",
  "Wholesale",
  "Reports",
  "Promotions",
  "Currency Rates",
];

export default async function AdminPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return (
      <section className="panel">
        <h2>Admin Access Required</h2>
        <p>You are not authorized to visit this page.</p>
        <p className="tiny">
          Sign in with the admin account to access the admin panel.
        </p>
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
    <div className="admin-page-shell">
      <section className="admin-page-header">
        <div className="admin-page-header-copy">
          <p className="section-eyebrow">Catalog Operations</p>
          <h1>Admin Workspace</h1>
          <p>
            Manage products, images, categories, and pricing from one wider workspace
            designed for real catalog entry instead of squeezed dashboard cards.
          </p>
        </div>
        <div className="admin-page-header-meta">
          <article className="admin-page-stat">
            <span>Signed In</span>
            <strong>{adminAccess.primaryEmail ?? "admin user"}</strong>
          </article>
          <article className="admin-page-stat">
            <span>Products</span>
            <strong>{productSummaries.length}</strong>
          </article>
          <article className="admin-page-stat">
            <span>Top Categories</span>
            <strong>{categoryOptions.length}</strong>
          </article>
          <article className="admin-page-stat">
            <span>R2 Status</span>
            <strong>{r2Configuration.isConfigured ? "Connected" : "Needs Setup"}</strong>
          </article>
        </div>
      </section>

      <div className="admin-page-layout">
        <aside className="admin-side-rail">
          <section className="panel admin-rail-panel">
            <h2>Modules</h2>
            <div className="admin-module-list">
              {adminModules.map((module) => (
                <article className="admin-module-card" key={module}>
                  <strong>{module}</strong>
                  <p className="tiny">Ready for operational workflows and role-based expansion.</p>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="panel admin-workspace-panel">
          <div className="admin-workspace-header">
            <div>
              <h2>Product Editor</h2>
              <p className="tiny">
                Use the full workspace to create products, assign category paths, upload to
                R2, and arrange storefront images without fighting a narrow layout.
              </p>
            </div>
            {!r2Configuration.isConfigured ? (
              <div className="empty-state admin-inline-state">
                <p>R2 is not configured yet.</p>
                <p className="tiny">Missing variables: {r2Configuration.missing.join(", ")}</p>
              </div>
            ) : null}
          </div>

          {r2Configuration.isConfigured ? (
            <AdminProductEditor
              categoryTree={categoryTree}
              categoryOptions={categoryOptions}
              initialProduct={initialProduct}
              initialProducts={productSummaries}
              ratesFromPkr={rates.rates}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
