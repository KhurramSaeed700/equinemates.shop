import type { Metadata } from "next";

import { listWholesaleQuotes } from "@/lib/server/submissions-service";

export const metadata: Metadata = {
  title: "Wholesale Dashboard",
  description:
    "Track quote history, edit requests, invoices, and procurement messaging.",
};

export default function WholesaleDashboardPage() {
  const quotes = listWholesaleQuotes(12);

  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Quote History</h2>
        <div className="review-list">
          {quotes.map((quote) => (
            <article className="review-item" key={quote.id}>
              <strong>{quote.id}</strong>
              <p className="tiny">{quote.companyName}</p>
              <p className="tiny">
                Requested: {quote.requestedAt} | Status: {quote.status}
              </p>
              <p className="tiny">
                Estimated: PKR {quote.estimatedTotalPkr.toLocaleString("en-PK")}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid-three">
        <section className="panel">
          <h3>Edit Requests</h3>
          <p>
            Buyers can revise quantities, delivery windows, and attached specs before
            final quote approval.
          </p>
        </section>
        <section className="panel">
          <h3>Invoices</h3>
          <p>
            Approved quotes generate invoice records with downloadable summaries and
            payment tracking.
          </p>
        </section>
        <section className="panel">
          <h3>Messaging</h3>
          <p>
            Procurement teams and Equinemates admins communicate through quote-linked
            conversation threads.
          </p>
        </section>
      </div>
    </div>
  );
}
