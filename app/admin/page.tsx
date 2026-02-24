import type { Metadata } from "next";

import { getCurrencyRates } from "@/lib/server/currency-service";

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

export default function AdminPage() {
  const rates = getCurrencyRates();

  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Admin Modules</h2>
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
        <h2>Currency Rates</h2>
        <p className="tiny">Base Currency: {rates.base}</p>
        <p className="tiny">Updated: {rates.updatedAt}</p>
        <div className="review-list">
          {Object.entries(rates.rates).map(([code, rate]) => (
            <article className="review-item" key={code}>
              <strong>{code}</strong>
              <p className="tiny">1 PKR = {rate} {code}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
