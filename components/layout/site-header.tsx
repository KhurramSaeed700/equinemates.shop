"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { SiteSearch } from "@/components/layout/site-search";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { getNavbarMenus } from "@/lib/catalog";
import {
  CartIcon,
  ChevronDownIcon,
  HeartIcon,
  UserIcon,
} from "@/components/ui/icons";

export function SiteHeader({ clerkEnabled }: { clerkEnabled: boolean }) {
  const TOUCH_NAV_QUERY = "(max-width: 1024px)";
  const { itemCount } = useCart();
  const { productSlugs } = useWishlist();
  const shopMenus = getNavbarMenus();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isCondensed, setIsCondensed] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const lastScrollYRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const condensedRef = useRef(false);
  const toggleAnchorYRef = useRef(0);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
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
        return;
      }
      if (!navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openMenu]);

  useEffect(() => {
    const updateOnScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      // Always show full header near the top.
      if (currentScrollY <= 16) {
        if (condensedRef.current) {
          condensedRef.current = false;
          setIsCondensed(false);
          toggleAnchorYRef.current = currentScrollY;
        }
        lastScrollYRef.current = currentScrollY;
        return;
      }

      // Ignore tiny scroll noise that causes flicker.
      if (Math.abs(delta) < 8) {
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (!condensedRef.current) {
        // Hide only after meaningful downward scroll beyond trigger zone.
        const crossedHideThreshold =
          delta > 0 &&
          currentScrollY > 140 &&
          currentScrollY - toggleAnchorYRef.current > 56;
        if (crossedHideThreshold) {
          condensedRef.current = true;
          setIsCondensed(true);
          setOpenMenu(null);
          toggleAnchorYRef.current = currentScrollY;
        }
      } else {
        // Show only after meaningful upward scroll to avoid rapid toggles.
        const crossedShowThreshold =
          delta < 0 && toggleAnchorYRef.current - currentScrollY > 34;
        if (crossedShowThreshold) {
          condensedRef.current = false;
          setIsCondensed(false);
          toggleAnchorYRef.current = currentScrollY;
        }
      }

      lastScrollYRef.current = currentScrollY;
    };

    const handleScroll = () => {
      if (rafRef.current !== null) {
        return;
      }
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateOnScroll();
      });
    };

    lastScrollYRef.current = window.scrollY;
    toggleAnchorYRef.current = window.scrollY;
    condensedRef.current = false;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <header className={isCondensed ? "site-header site-header-condensed" : "site-header"}>
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

      <nav
        aria-label="Main navigation"
        className="site-nav"
      >
        <div className="container nav-inner" ref={navRef}>
          {shopMenus.map((menu) => (
            <div
              className={
                openMenu === menu.label
                  ? "mega-item mega-item-open"
                  : "mega-item"
              }
              key={menu.label}
              onMouseEnter={() => {
                if (window.matchMedia(TOUCH_NAV_QUERY).matches) {
                  return;
                }
                if (closeTimerRef.current) {
                  clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = null;
                }
                setOpenMenu(menu.label);
              }}
              onMouseLeave={() => {
                if (window.matchMedia(TOUCH_NAV_QUERY).matches) {
                  return;
                }
                if (closeTimerRef.current) {
                  clearTimeout(closeTimerRef.current);
                }
                closeTimerRef.current = window.setTimeout(() => {
                  setOpenMenu((current) =>
                    current === menu.label ? null : current,
                  );
                }, 220);
              }}
            >
              <div className="mega-trigger-row">
                <Link
                  className={
                    openMenu === menu.label
                      ? "nav-link nav-link-active mega-trigger mega-trigger-link"
                      : "nav-link mega-trigger mega-trigger-link"
                  }
                  href={menu.href}
                  onFocus={() => setOpenMenu(menu.label)}
                  onClick={(event) => {
                    if (window.matchMedia(TOUCH_NAV_QUERY).matches) {
                      event.preventDefault();
                      setOpenMenu((current) =>
                        current === menu.label ? null : menu.label,
                      );
                      return;
                    }
                    setOpenMenu(null);
                  }}
                >
                  <span>{menu.label}</span>
                </Link>
                <button
                  aria-expanded={openMenu === menu.label}
                  aria-haspopup="true"
                  aria-label={`Toggle ${menu.label} menu`}
                  className={
                    openMenu === menu.label
                      ? "nav-link nav-link-active mega-trigger mega-trigger-toggle"
                      : "nav-link mega-trigger mega-trigger-toggle"
                  }
                  onFocus={() => setOpenMenu(menu.label)}
                  onClick={() =>
                    setOpenMenu((current) =>
                      current === menu.label ? null : menu.label,
                    )
                  }
                  type="button"
                >
                  <ChevronDownIcon height={13} width={13} />
                </button>
              </div>
              <div
                className="mega-panel"
                onMouseEnter={() => {
                  if (window.matchMedia(TOUCH_NAV_QUERY).matches) {
                    return;
                  }
                  if (closeTimerRef.current) {
                    clearTimeout(closeTimerRef.current);
                    closeTimerRef.current = null;
                  }
                  setOpenMenu(menu.label);
                }}
                onMouseLeave={() => {
                  if (window.matchMedia(TOUCH_NAV_QUERY).matches) {
                    return;
                  }
                  if (closeTimerRef.current) {
                    clearTimeout(closeTimerRef.current);
                  }
                  closeTimerRef.current = window.setTimeout(
                    () => setOpenMenu(null),
                    220,
                  );
                }}
              >
                <Link
                  className="mega-shop-all"
                  href={menu.href}
                  onClick={() => setOpenMenu(null)}
                >
                  Shop All {menu.label}
                </Link>
                {menu.columns.map((column) => (
                  <div key={column.heading} className="mega-column">
                    {column.href ? (
                      <Link
                        className="mega-heading mega-heading-link"
                        href={column.href}
                        onClick={() => setOpenMenu(null)}
                      >
                        {column.heading}
                      </Link>
                    ) : (
                      <strong className="mega-heading">{column.heading}</strong>
                    )}
                    <div className="mega-links">
                      {column.items.map((item) => (
                        <Link
                          href={item.href}
                          key={`${column.heading}-${item.label}`}
                          onClick={() => setOpenMenu(null)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
}
