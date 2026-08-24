"use client";

import Link from "next/link";
import { SignedIn, UserButton, useUser } from "@clerk/nextjs";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import {
  CartIcon,
  ChevronDownIcon,
  CloseIcon,
  HeartIcon,
} from "@/components/ui/icons";
import type { NavMenu } from "@/lib/catalog";

interface SiteHeaderMobileDrawerProps {
  clerkEnabled: boolean;
  initialSignedIn: boolean;
  shopMenus: NavMenu[];
  openMenu: string | null;
  setOpenMenu: Dispatch<SetStateAction<string | null>>;
  mobileNavOpen: boolean;
  setMobileNavOpen: Dispatch<SetStateAction<boolean>>;
  mobileNavRef: RefObject<HTMLDivElement | null>;
}

export function SiteHeaderMobileDrawer({
  clerkEnabled,
  initialSignedIn,
  shopMenus,
  openMenu,
  setOpenMenu,
  mobileNavOpen,
  setMobileNavOpen,
  mobileNavRef,
}: SiteHeaderMobileDrawerProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { t } = useLanguage();
  const { itemCount } = useCart();
  const { productSlugs } = useWishlist();
  const { isLoaded, isSignedIn } = useUser();

  if (!isMounted) {
    return null;
  }

  const userSignedIn = clerkEnabled
    ? isLoaded
      ? Boolean(isSignedIn)
      : initialSignedIn
    : false;

  return createPortal(
    <div
      className={
        mobileNavOpen
          ? "mobile-nav-overlay mobile-nav-overlay-open"
          : "mobile-nav-overlay"
      }
      onClick={() => setMobileNavOpen(false)}
    >
      <aside
        aria-label="Mobile navigation"
        className="mobile-nav-drawer"
        id="mobile-site-nav"
        onClick={(event) => event.stopPropagation()}
        ref={mobileNavRef}
      >
        <div className="mobile-nav-drawer-head">
          <div className="mobile-nav-drawer-head-main">
            {userSignedIn ? (
              <div className="mobile-nav-account-slot">
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            ) : (
              <Link
                className="mobile-nav-account-link"
                href="/account"
                onClick={() => setMobileNavOpen(false)}
              >
                {t("signIn")}
              </Link>
            )}
          </div>
          <button
            aria-label="Close navigation menu"
            className="icon-link mobile-nav-close"
            onClick={() => setMobileNavOpen(false)}
            type="button"
          >
            <CloseIcon height={18} width={18} />
          </button>
        </div>
        <div className="mobile-nav-list">
          <div className="mobile-nav-quick-actions">
            <Link
              className="mobile-nav-quick-action"
              href="/wishlist"
              onClick={() => {
                setMobileNavOpen(false);
                setOpenMenu(null);
              }}
            >
              <span className="mobile-nav-quick-action-icon">
                <HeartIcon aria-hidden="true" height={16} width={16} />
              </span>
              <span className="mobile-nav-quick-action-label">{t("wishlist")}</span>
              <span
                aria-label={`${productSlugs.length} wishlist items`}
                className="mobile-nav-quick-action-count"
              >
                {productSlugs.length}
              </span>
            </Link>
            <Link
              className="mobile-nav-quick-action"
              href="/cart"
              onClick={() => {
                setMobileNavOpen(false);
                setOpenMenu(null);
              }}
            >
              <span className="mobile-nav-quick-action-icon">
                <CartIcon aria-hidden="true" height={16} width={16} />
              </span>
              <span className="mobile-nav-quick-action-label">{t("cart")}</span>
              <span
                aria-label={`${itemCount} cart items`}
                className="mobile-nav-quick-action-count"
              >
                {itemCount}
              </span>
            </Link>
          </div>
          {shopMenus.map((menu) => (
            <div
              className={
                openMenu === menu.label
                  ? "mobile-nav-item mobile-nav-item-open"
                  : "mobile-nav-item"
              }
              key={`mobile-${menu.label}`}
            >
              <button
                aria-expanded={openMenu === menu.label}
                aria-haspopup="true"
                className="mobile-nav-item-row mobile-nav-item-trigger"
                onClick={() =>
                  setOpenMenu((current) =>
                    current === menu.label ? null : menu.label,
                  )
                }
                type="button"
              >
                <span className="mobile-nav-link">
                  {menu.label}
                </span>
                <span
                  aria-hidden="true"
                  className="mobile-nav-item-toggle"
                >
                  <ChevronDownIcon height={14} width={14} />
                </span>
              </button>
              <div className="mobile-submenu">
                <Link
                  className="mobile-submenu-heading mobile-submenu-shop-all"
                  href={menu.href}
                  onClick={() => {
                    setMobileNavOpen(false);
                    setOpenMenu(null);
                  }}
                >
                  {t("shopAll")} {menu.label}
                </Link>
                {menu.columns.map((column) => (
                  <div
                    className="mobile-submenu-group"
                    key={`mobile-${column.heading}`}
                  >
                    {column.href ? (
                      <Link
                        className="mobile-submenu-heading"
                        href={column.href}
                        onClick={() => {
                          setMobileNavOpen(false);
                          setOpenMenu(null);
                        }}
                      >
                        {column.heading}
                      </Link>
                    ) : (
                      <strong className="mobile-submenu-heading">
                        {column.heading}
                      </strong>
                    )}
                    <div className="mobile-submenu-links">
                      {column.items.map((item) => (
                        <Link
                          className="mobile-submenu-link"
                          href={item.href}
                          key={`mobile-${column.heading}-${item.label}`}
                          onClick={() => {
                            setMobileNavOpen(false);
                            setOpenMenu(null);
                          }}
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
      </aside>
    </div>,
    document.body,
  );
}
