import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Sans, Sora } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SitePagination } from "@/components/layout/site-pagination";
import { AppProviders } from "@/components/providers/app-providers";
import { isClerkEnabledFromKey } from "@/lib/clerk";

import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://equinemates.example"),
  title: {
    default: "Equinemates | Shop Horse, Rider & Pet Products",
    template: "%s | Equinemates",
  },
  description:
    "Equinemates ecommerce platform with multi-currency storefront, wholesale workflows, and admin-ready operations.",
  keywords: [
    "Equinemates",
    "horse products",
    "pet products",
    "rider products",
    "Pakistan ecommerce",
    "wholesale quote platform",
  ],
  icons: {
    icon: "/logo-t.png",
    shortcut: "/logo-t.png",
    apple: "/logo-t.png",
  },
  openGraph: {
    title: "Equinemates",
    description:
      "Modern ecommerce for pet, horse, and rider products with wholesale and admin architecture.",
    url: "https://equinemates.example",
    siteName: "Equinemates",
    locale: "en_PK",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const configuredPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = isClerkEnabledFromKey(configuredPublishableKey);
  // Prevent prerender failures when env keys are missing in build environments.
  const clerkPublishableKey =
    configuredPublishableKey && configuredPublishableKey.trim().length > 0
      ? configuredPublishableKey
      : "pk_test_placeholder_do_not_use_in_production";

  return (
    <html lang="en-PK">
      <body className={`${sora.variable} ${plexSans.variable}`}>
        <ClerkProvider publishableKey={clerkPublishableKey}>
          <AppProviders>
            <div className="site-shell">
              <SiteHeader clerkEnabled={clerkEnabled} />
              <main className="site-main">
                {children}
                <Suspense fallback={null}>
                  <SitePagination />
                </Suspense>
              </main>
              <SiteFooter />
            </div>
          </AppProviders>
        </ClerkProvider>
        <Toaster position="bottom-right" richColors theme="light" />
      </body>
    </html>
  );
}
