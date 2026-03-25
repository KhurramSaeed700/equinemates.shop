import type { Metadata } from "next";

import { AdminProductEditor } from "@/components/forms/admin-product-editor";
import {
  CATEGORY_OPTIONS,
  getAdminProductSummaries,
  getProductBySlug,
} from "@/lib/catalog";
import { getAdminAccess } from "@/lib/server/admin-auth";
import { getCurrencyRates } from "@/lib/server/currency-service";
import { getR2ConfigurationStatus } from "@/lib/server/r2";

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
        <p>{adminAccess.reason}</p>
        <p className="tiny">
          R2 uploads on this page are protected with Clerk and the `ADMIN_EMAILS`
          allowlist.
        </p>
      </section>
    );
  }

  const productSummaries = getAdminProductSummaries();
  const initialProduct = productSummaries.length
    ? getProductBySlug(productSummaries[0].slug) ?? null
    : null;
  const [rates, r2Configuration] = await Promise.all([
    getCurrencyRates(),
    Promise.resolve(getR2ConfigurationStatus()),
  ]);

  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Admin Modules</h2>
        <p className="tiny">
          Signed in as {adminAccess.primaryEmail ?? "admin user"}.
        </p>
        <div className="grid-three">
          {adminModules.map((module) => (
            <article className="review-item" key={module}>
              <strong>{module}</strong>
              <p className="tiny">
                Operational module scaffold ready for role-based access integration.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Product Editor</h2>
        <p className="tiny">
          Upload product images directly into the current draft and save the product
          without copy-pasting URLs.
        </p>
        <p className="tiny">Prefix: {r2Configuration.uploadPrefix}</p>
        <p className="tiny">Max upload size: {r2Configuration.maxUploadMb} MB</p>
        {r2Configuration.isConfigured ? (
          <AdminProductEditor
            categoryOptions={CATEGORY_OPTIONS}
            initialProduct={initialProduct}
            initialProducts={productSummaries}
          />
        ) : (
          <div className="empty-state">
            <p>R2 is not configured yet.</p>
            <p className="tiny">
              Missing variables: {r2Configuration.missing.join(", ")}
            </p>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Currency Rates</h2>
        <p className="tiny">Rate Feed: {rates.provider}</p>
        <p className="tiny">Updated: {rates.updatedAt}</p>
        <div className="review-list">
          {Object.entries(rates.rates).map(([code, rate]) => (
            <article className="review-item" key={code}>
              <strong>{code}</strong>
              <p className="tiny">Indexed rate: {rate}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Storage Notes</h2>
        <p className="tiny">
          Public base URL: {r2Configuration.publicBaseUrl || "Not configured"}
        </p>
        <p className="tiny">
          This implementation uploads through a Next.js server route, so keep the file
          limit modest on Vercel. If you later need larger files, switch to presigned
          direct browser uploads.
        </p>
        <p className="tiny">
          Product edits made here currently update the in-memory catalog only. They
          will reset on a server restart until products are stored in the database.
        </p>
      </section>
    </div>
  );
}
