"use client";

import Link from "next/link";
import { Dispatch, RefObject, SetStateAction, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ChevronDownIcon, CloseIcon } from "@/components/ui/icons";
import { NavMenu } from "@/lib/catalog";

interface SiteHeaderMobileDrawerProps {
  shopMenus: NavMenu[];
  openMenu: string | null;
  setOpenMenu: Dispatch<SetStateAction<string | null>>;
  mobileNavOpen: boolean;
  setMobileNavOpen: Dispatch<SetStateAction<boolean>>;
  mobileNavRef: RefObject<HTMLDivElement | null>;
}

export function SiteHeaderMobileDrawer({
  shopMenus,
  openMenu,
  setOpenMenu,
  mobileNavOpen,
  setMobileNavOpen,
  mobileNavRef,
}: SiteHeaderMobileDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
          <p>Browse categories</p>
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
                <Link
                  className="mobile-submenu-shopall"
                  href={menu.href}
                  onClick={() => {
                    setMobileNavOpen(false);
                    setOpenMenu(null);
                  }}
                >
                  Shop All {menu.label}
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
