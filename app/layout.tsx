import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Sans, Sora } from "next/font/google";
import { Toaster } from "sonner";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
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
    icon: "/logo-small.png",
    shortcut: "/logo-small.png",
    apple: "/logo-small.png",
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
  const clerkEnabled = isClerkEnabledFromKey(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  return (
    <html lang="en-PK">
      <body className={`${sora.variable} ${plexSans.variable}`}>
        {clerkEnabled ? (
          <ClerkProvider>
            <AppProviders>
              <div className="site-shell">
                <SiteHeader clerkEnabled />
                <main className="site-main">{children}</main>
                <SiteFooter />
              </div>
            </AppProviders>
          </ClerkProvider>
        ) : (
          <AppProviders>
            <div className="site-shell">
              <SiteHeader clerkEnabled={false} />
              <main className="site-main">{children}</main>
              <SiteFooter />
            </div>
          </AppProviders>
        )}
        <Toaster position="bottom-right" richColors theme="light" />
      </body>
    </html>
  );
}
