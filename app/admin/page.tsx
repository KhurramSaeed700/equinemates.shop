import type { Metadata } from "next";
import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiGift,
  FiPackage,
  FiShoppingBag,
  FiTag,
  FiTruck,
  FiUsers,
} from "react-icons/fi";

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

const adminModules: { icon: IconType; label: string }[] = [
  { icon: FiPackage, label: "Products" },
  { icon: FiShoppingBag, label: "Orders" },
  { icon: FiUsers, label: "Users" },
  { icon: FiTruck, label: "Wholesale" },
  { icon: FiBarChart2, label: "Reports" },
  { icon: FiGift, label: "Promotions" },
  { icon: FiTag, label: "Currency Rates" },
];

export default async function AdminPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return (
      <section className="panel">
        <h2>Admin Access Required</h2>
        <p>You are not authorized to visit this page.</p>
        <p className="tiny">
          {adminAccess.reason ||
            "Sign in with the admin account to access the admin panel."}
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
        </div>
        <div className="admin-page-header-meta">
          <article className="admin-page-stat">
            <span>Products</span>
            <strong>{productSummaries.length}</strong>
          </article>
          <article className="admin-page-stat">
            <span>Top Categories</span>
            <strong>{categoryOptions.length}</strong>
          </article>
        </div>
      </section>

      <div className="admin-page-layout">
        <aside className="admin-side-rail">
          <section className="panel admin-rail-panel">
            <h2>Modules</h2>
            <div aria-label="Admin modules" className="admin-module-list" role="list">
              {adminModules.map(({ icon: Icon, label }) => (
                <article
                  aria-label={label}
                  className="admin-module-card"
                  key={label}
                  role="listitem"
                  title={label}
                >
                  <span className="admin-module-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="admin-module-copy">
                    <strong>{label}</strong>
                  </span>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="panel admin-workspace-panel">
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
        </section>
      </div>
    </div>
  );
}
