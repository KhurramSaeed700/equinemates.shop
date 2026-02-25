"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { SiteSearch } from "@/components/layout/site-search";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import {
  CartIcon,
  ChevronDownIcon,
  HeartIcon,
  UserIcon,
} from "@/components/ui/icons";

const shopMenus = [
  {
    label: "Horse",
    href: "/products?category=Horse%20Products",
    items: [
      { label: "Grooming Essentials", href: "/products/stablecore-groom-kit" },
      { label: "Stable Care", href: "/products/allweather-saddle-cover" },
      { label: "Feeding Solutions", href: "/products/smartfeed-pro-dispenser" },
    ],
  },
  {
    label: "Rider",
    href: "/products?category=Rider%20Products",
    items: [
      { label: "Safety Helmets", href: "/products/aerofit-riding-helmet" },
      { label: "Gloves & Apparel", href: "/products/stridegrip-riding-gloves" },
      { label: "Travel Accessories", href: "/products/arena-commute-backpack" },
    ],
  },
  {
    label: "Pet",
    href: "/products?category=Pet%20Products",
    items: [
      { label: "Daily Care", href: "/products/pawshield-care-bundle" },
      { label: "Beds & Comfort", href: "/products/comfortnest-orthopedic-bed" },
      {
        label: "Travel Essentials",
        href: "/products/trailbuddy-hydration-flask",
      },
    ],
  },
];

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Collections", href: "/products" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Catalog Request", href: "/catalog-request" },
  { label: "Sale", href: "/search?tag=best-seller" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader({ clerkEnabled }: { clerkEnabled: boolean }) {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { productSlugs } = useWishlist();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
            {isHydrated && <span className="counter-dot">{productSlugs.length}</span>}
          </Link>
          <Link aria-label="Cart" className="icon-link" href="/cart">
            <CartIcon height={17} width={17} />
            {isHydrated && <span className="counter-dot">{itemCount}</span>}
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
          {quickLinks.slice(0, 1).map((item) => (
            <Link
              className={
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))
                  ? "nav-link nav-link-active"
                  : "nav-link"
              }
              href={item.href}
              key={item.label}
              onClick={() => setOpenMenu(null)}
            >
              {item.label}
            </Link>
          ))}

          {shopMenus.map((menu) => (
            <div
              className={
                openMenu === menu.label
                  ? "mega-item mega-item-open"
                  : "mega-item"
              }
              key={menu.label}
              onMouseEnter={() => setOpenMenu(menu.label)}
              onMouseLeave={() =>
                setOpenMenu((current) =>
                  current === menu.label ? null : current,
                )
              }
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
              <div className="mega-panel">
                <Link href={menu.href} onClick={() => setOpenMenu(null)}>
                  Shop All {menu.label}
                </Link>
                {menu.items.map((item) => (
                  <Link
                    href={item.href}
                    key={item.label}
                    onClick={() => setOpenMenu(null)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {quickLinks.slice(1).map((item) => (
            <Link
              className={
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))
                  ? "nav-link nav-link-active"
                  : "nav-link"
              }
              href={item.href}
              key={item.label}
              onClick={() => setOpenMenu(null)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
