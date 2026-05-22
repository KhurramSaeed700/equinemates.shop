import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { IBM_Plex_Sans, Sora } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { NewsletterPopup } from "@/components/marketing/newsletter-popup";
import { AppProviders } from "@/components/providers/app-providers";
import { isClerkEnabledFromKey } from "@/lib/clerk";
import { getNavbarMenus } from "@/lib/server/catalog-products";

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

const themeInitScript = `
  (() => {
    try {
      const storedTheme = window.localStorage.getItem("equinemates-theme");
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const theme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : systemTheme;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

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
    "US ecommerce",
    "EU ecommerce",
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
    locale: "en_US",
    type: "website",
  },
};

export default async function RootLayout({
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
  const [initialSignedIn, shopMenus] = await Promise.all([
    clerkEnabled ? auth().then((session) => Boolean(session.userId)) : false,
    getNavbarMenus(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${sora.variable} ${plexSans.variable}`}>
        <ClerkProvider publishableKey={clerkPublishableKey}>
          <AppProviders>
            <div className="site-shell">
              <SiteHeader
                clerkEnabled={clerkEnabled}
                initialSignedIn={initialSignedIn}
                shopMenus={shopMenus}
              />
              <main className="site-main">
                {children}
              </main>
              <SiteFooter />
              <NewsletterPopup />
            </div>
          </AppProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}
