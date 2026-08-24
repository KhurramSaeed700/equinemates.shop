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

const languageInitScript = `
  (() => {
    try {
      const supported = ["en", "de", "fr", "es", "ar", "ur"];
      const storedLanguage = window.localStorage.getItem("equinemates-language");
      const isAdminRoute = window.location.pathname === "/admin" ||
        window.location.pathname.startsWith("/admin/") ||
        window.location.pathname === "/super-admin" ||
        window.location.pathname.startsWith("/super-admin/");
      const language = isAdminRoute
        ? "en"
        : supported.includes(storedLanguage) ? storedLanguage : "en";
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ar" || language === "ur" ? "rtl" : "ltr";
    } catch {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
  })();
`;

const accessibilityInitScript = `
  (() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("equinemates-accessibility-v1") || "{}");
      const root = document.documentElement;
      root.dataset.a11yFont = saved.fontSize === "large" ? "large" : "normal";
      root.dataset.a11yMotor = String(Boolean(saved.motor));
      root.dataset.a11yColorBlind = String(Boolean(saved.colorBlind));
      root.dataset.a11yVision = String(Boolean(saved.vision));
      root.dataset.a11yCognitive = String(Boolean(saved.cognitive));
      root.dataset.a11yEpileptic = String(Boolean(saved.epilepticSafe));
      root.dataset.a11yAdhd = String(Boolean(saved.adhdFriendly));
      root.dataset.a11yContrast = String([0, 1, 2].includes(saved.contrast) ? saved.contrast : 0);
      root.dataset.a11ySaturation = String([0, 1, 2].includes(saved.saturation) ? saved.saturation : 0);
      root.dataset.a11yLinks = String(Boolean(saved.highlightLinks));
    } catch {}
  })();
`;

const clerkAppearance = {
  variables: {
    borderRadius: "0.85rem",
    colorBackground: "var(--surface)",
    colorDanger: "#b42318",
    colorInputBackground: "var(--bg-elevated)",
    colorInputText: "var(--ink)",
    colorNeutral: "var(--line)",
    colorPrimary: "var(--accent)",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--ink-soft)",
    fontFamily: "var(--font-plex-sans), Segoe UI, sans-serif",
  },
  elements: {
    cardBox:
      "border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]",
    card: "bg-[var(--surface)] text-[var(--ink)]",
    headerTitle: "text-[var(--ink)]",
    headerSubtitle: "text-[var(--ink-soft)]",
    socialButtonsBlockButton:
      "border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)] hover:bg-[color-mix(in_oklab,var(--surface),var(--accent)_7%)]",
    socialButtonsBlockButtonText: "text-[var(--ink)]",
    dividerLine: "bg-[var(--line)]",
    dividerText: "text-[var(--ink-soft)]",
    formFieldLabel: "text-[var(--ink)]",
    formFieldInput:
      "border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)] placeholder:text-[var(--ink-soft)]",
    formButtonPrimary:
      "bg-[var(--accent)] text-[var(--surface)] shadow-none hover:bg-[var(--accent-strong)]",
    footer: "border-t border-[var(--line)] bg-[var(--bg-elevated)]",
    footerAction: "text-[var(--ink-soft)]",
    footerActionText: "text-[var(--ink-soft)]",
    footerActionLink: "text-[var(--accent-strong)]",
    footerPagesLink: "text-[var(--ink-soft)]",
    identityPreviewText: "text-[var(--ink)]",
    identityPreviewEditButton: "text-[var(--accent-strong)]",
    formResendCodeLink: "text-[var(--accent-strong)]",
    footerPoweredBy: "text-[var(--ink-soft)]",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL("https://equinemates.com"),
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
    url: "https://equinemates.com",
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
        <script dangerouslySetInnerHTML={{ __html: languageInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: accessibilityInitScript }} />
      </head>
      <body className={`${sora.variable} ${plexSans.variable}`}>
        <ClerkProvider
          appearance={clerkAppearance}
          publishableKey={clerkPublishableKey}
        >
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
