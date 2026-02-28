"use client";

import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { AppProviders } from "@/components/providers/app-providers";

export default function NotFoundPage() {
  return (
    <ClerkProvider>
      <AppProviders>
        <section className="panel">
          <h2>Page not found</h2>
          <p>The requested route does not exist in this environment.</p>
          <Link className="btn-primary" href="/">
            Return Home
          </Link>
        </section>
      </AppProviders>
    </ClerkProvider>
  );
}
