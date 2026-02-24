import type { Metadata } from "next";
import Link from "next/link";

import { CatalogRequestForm } from "@/components/forms/catalog-request-form";

export const metadata: Metadata = {
  title: "Catalog Request",
  description: "Download or request printed Equinemates catalog.",
};

export default function CatalogRequestPage() {
  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Catalog Access</h2>
        <p>
          Download the latest digital catalog instantly or request printed copies for
          showroom and procurement teams.
        </p>
        <div className="action-row section-spacing">
          <Link className="btn-primary" href="/equinemates-catalog.pdf">
            Download Catalog (PDF)
          </Link>
          <Link className="btn-secondary" href="/wholesale">
            Need bulk pricing?
          </Link>
        </div>
        <ul className="trust-list section-spacing">
          <li>Business/wholesale routing for procurement teams</li>
          <li>Company information capture for account onboarding</li>
          <li>Email delivery workflow connected with request IDs</li>
        </ul>
      </section>
      <section>
        <h2>Request Printed Catalog</h2>
        <CatalogRequestForm />
      </section>
    </div>
  );
}
