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
  const { itemCount } = useCart();
  const { productSlugs } = useWishlist();
  const shopMenus = getNavbarMenus();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!navRef.current) {
        return;
      }
      if (!navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  return (
    <header className="site-header">
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
          <Link className="utility-link" href="/contact">
            Help
          </Link>
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

      <nav aria-label="Main navigation" className="site-nav">
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
                if (closeTimerRef.current) {
                  clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = null;
                }
                setOpenMenu(menu.label);
              }}
              onMouseLeave={() => {
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
              <button
                aria-expanded={openMenu === menu.label}
                aria-haspopup="true"
                className={
                  openMenu === menu.label
                    ? "nav-link nav-link-active mega-trigger"
                    : "nav-link mega-trigger"
                }
                onFocus={() => setOpenMenu(menu.label)}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === menu.label ? null : menu.label,
                  )
                }
                type="button"
              >
                <span>{menu.label}</span>
                <ChevronDownIcon height={13} width={13} />
              </button>
              <div
                className="mega-panel"
                onMouseEnter={() => {
                  if (closeTimerRef.current) {
                    clearTimeout(closeTimerRef.current);
                    closeTimerRef.current = null;
                  }
                  setOpenMenu(menu.label);
                }}
                onMouseLeave={() => {
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
