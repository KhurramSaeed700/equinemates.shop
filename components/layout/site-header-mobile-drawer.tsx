"use client";

import Link from "next/link";
import { SignedIn, UserButton } from "@clerk/nextjs";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { FiMoon, FiSun } from "react-icons/fi";

import { useTheme } from "@/components/providers/theme-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { ChevronDownIcon, CloseIcon, HeartIcon } from "@/components/ui/icons";
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
  const { isDark, toggleTheme } = useTheme();
  const { productSlugs } = useWishlist();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const themeLabel = themeMounted
    ? isDark
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle color mode";
  const themeActionText = themeMounted
    ? isDark
      ? "Light mode"
      : "Dark mode"
    : "Color mode";

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
            {clerkEnabled && initialSignedIn ? (
              <div className="mobile-nav-account-slot">
                <SignedIn>
                  <UserButton />
                </SignedIn>
                <span className="mobile-nav-account-text">Account</span>
              </div>
            ) : (
              <Link
                className="mobile-nav-account-link"
                href="/account"
                onClick={() => setMobileNavOpen(false)}
              >
                Sign in
              </Link>
            )}
            <p>Browse categories</p>
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
              <span className="mobile-nav-quick-action-label">Wishlist</span>
              <span
                aria-label={`${productSlugs.length} wishlist items`}
                className="mobile-nav-quick-action-count"
              >
                {productSlugs.length}
              </span>
            </Link>
            <button
              aria-label={themeLabel}
              className="mobile-nav-quick-action"
              onClick={toggleTheme}
              type="button"
            >
              <span className="mobile-nav-quick-action-icon">
                {themeMounted && isDark ? (
                  <FiSun aria-hidden="true" height={16} width={16} />
                ) : (
                  <FiMoon aria-hidden="true" height={16} width={16} />
                )}
              </span>
              <span className="mobile-nav-quick-action-label">
                {themeActionText}
              </span>
            </button>
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
              <div className="mobile-nav-item-row">
                <Link
                  className="mobile-nav-link"
                  href={menu.href}
                  onClick={() => {
                    setMobileNavOpen(false);
                    setOpenMenu(null);
                  }}
                >
                  {menu.label}
                </Link>
                <button
                  aria-expanded={openMenu === menu.label}
                  aria-haspopup="true"
                  aria-label={`Toggle ${menu.label} links`}
                  className="mobile-nav-item-toggle"
                  onClick={() =>
                    setOpenMenu((current) =>
                      current === menu.label ? null : menu.label,
                    )
                  }
                  type="button"
                >
                  <ChevronDownIcon height={14} width={14} />
                </button>
              </div>
              <div className="mobile-submenu">
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
