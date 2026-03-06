"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { SiteHeaderDesktopNav } from "@/components/layout/site-header-desktop-nav";
import { SiteHeaderMobileDrawer } from "@/components/layout/site-header-mobile-drawer";
import { SiteSearch } from "@/components/layout/site-search";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { getNavbarMenus } from "@/lib/catalog";
import {
  CartIcon,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  UserIcon,
} from "@/components/ui/icons";

export function SiteHeader({ clerkEnabled }: { clerkEnabled: boolean }) {
  const TOUCH_NAV_QUERY = "(max-width: 680px)";
  const { itemCount } = useCart();
  const { productSlugs } = useWishlist();
  const shopMenus = getNavbarMenus();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileNavOpen(false);
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!navRef.current) {
        if (!mobileNavRef.current) {
          return;
        }
      }
      const target = event.target as Node;
      const insideDesktopNav = navRef.current?.contains(target) ?? false;
      const insideMobileNav = mobileNavRef.current?.contains(target) ?? false;
      if (!insideDesktopNav && !insideMobileNav) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const media = window.matchMedia(TOUCH_NAV_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        setMobileNavOpen(false);
        setOpenMenu(null);
      }
    };
    media.addEventListener("change", handleViewportChange);
    return () => {
      media.removeEventListener("change", handleViewportChange);
    };
  }, []);

  return (
    <header
      className={
        mobileNavOpen ? "site-header site-header-nav-open" : "site-header"
      }
    >
      <div className="announcement-bar">
        <p>
          Free Pakistan shipping on qualifying orders. Wholesale support
          available Monday to Saturday.
        </p>
      </div>

      <div className="header-utility container">
        <div className="header-utility-left">
          <SiteSearch />
        </div>

        <div className="header-logo-wrap">
          <Link aria-label="Go to homepage" className="brand-mark" href="/">
            <Image
              alt="Equinemates"
              className="brand-mark-image"
              height={52}
              priority
              src="/logo-t.png"
              width={240}
            />
          </Link>
        </div>

        <div className="header-utility-right">
          {clerkEnabled ? (
            <SignedOut>
              <SignInButton>
                <button
                  className="utility-link utility-auth-link"
                  type="button"
                >
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          ) : null}
          <Link aria-label="My account" className="icon-link" href="/account">
            <UserIcon height={17} width={17} />
          </Link>
          <Link aria-label="Wishlist" className="icon-link" href="/wishlist">
            <HeartIcon height={17} width={17} />
            <span className="counter-dot">{productSlugs.length}</span>
          </Link>
          <Link aria-label="Cart" className="icon-link" href="/cart">
            <CartIcon height={17} width={17} />
            <span className="counter-dot">{itemCount}</span>
          </Link>
          <button
            aria-controls="mobile-site-nav"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            className="icon-link mobile-nav-toggle"
            onClick={() => setMobileNavOpen((current) => !current)}
            type="button"
          >
            {mobileNavOpen ? <CloseIcon height={18} width={18} /> : <MenuIcon height={18} width={18} />}
          </button>
          <CurrencySwitcher />
          {clerkEnabled ? (
            <SignedIn>
              <div className="clerk-user-wrap">
                <UserButton />
              </div>
            </SignedIn>
          ) : null}
        </div>
      </div>

      <SiteHeaderMobileDrawer
        mobileNavOpen={mobileNavOpen}
        mobileNavRef={mobileNavRef}
        openMenu={openMenu}
        setMobileNavOpen={setMobileNavOpen}
        setOpenMenu={setOpenMenu}
        shopMenus={shopMenus}
      />

      <SiteHeaderDesktopNav
        closeTimerRef={closeTimerRef}
        navRef={navRef}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        shopMenus={shopMenus}
        touchNavQuery={TOUCH_NAV_QUERY}
      />
    </header>
  );
}
