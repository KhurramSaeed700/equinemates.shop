import type { Metadata } from "next";
import Link from "next/link";

import { WholesaleRequestForm } from "@/components/forms/wholesale-request-form";

export const metadata: Metadata = {
  title: "Wholesale / Quotation",
  description: "Bulk order requests, business verification, and custom pricing.",
};

export default function WholesalePage() {
  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Wholesale Services</h2>
        <p>
          Submit bulk order requests with company credentials and file attachments.
          Requests move into admin review for custom pricing and invoice generation.
        </p>
        <ul className="trust-list section-spacing">
          <li>Bulk order intake and business registration capture</li>
          <li>Custom pricing workflow and quote lifecycle management</li>
          <li>Attachment support for purchase specs and tender files</li>
          <li>Admin review queue with status visibility</li>
        </ul>
        <div className="hero-actions">
          <Link className="btn-secondary" href="/wholesale/dashboard">
            Open Wholesale Dashboard
          </Link>
          <Link className="btn-secondary" href="/admin">
            Open Admin Panel
          </Link>
        </div>
      </section>
      <section>
        <h2>Bulk Order Request</h2>
        <WholesaleRequestForm />
      </section>
    </div>
  );
}
