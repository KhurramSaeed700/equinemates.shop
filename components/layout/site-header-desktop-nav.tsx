"use client";

import Link from "next/link";
import { Dispatch, RefObject, SetStateAction } from "react";

import { ChevronDownIcon } from "@/components/ui/icons";
import { NavMenu } from "@/lib/catalog";

interface SiteHeaderDesktopNavProps {
  shopMenus: NavMenu[];
  openMenu: string | null;
  setOpenMenu: Dispatch<SetStateAction<string | null>>;
  navRef: RefObject<HTMLDivElement | null>;
  closeTimerRef: RefObject<number | null>;
  touchNavQuery: string;
}

export function SiteHeaderDesktopNav({
  shopMenus,
  openMenu,
  setOpenMenu,
  navRef,
  closeTimerRef,
  touchNavQuery,
}: SiteHeaderDesktopNavProps) {
  return (
    <nav aria-label="Main navigation" className="site-nav">
      <div className="container nav-inner" ref={navRef}>
        {shopMenus.map((menu) => (
          <div
            className={
              openMenu === menu.label ? "mega-item mega-item-open" : "mega-item"
            }
            key={menu.label}
            onMouseEnter={() => {
              if (window.matchMedia(touchNavQuery).matches) {
                return;
              }
              if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
              }
              setOpenMenu(menu.label);
            }}
            onMouseLeave={() => {
              if (window.matchMedia(touchNavQuery).matches) {
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
                  if (
                    window.matchMedia(touchNavQuery).matches &&
                    openMenu !== menu.label
                  ) {
                    event.preventDefault();
                    setOpenMenu(menu.label);
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
                if (window.matchMedia(touchNavQuery).matches) {
                  return;
                }
                if (closeTimerRef.current) {
                  clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = null;
                }
                setOpenMenu(menu.label);
              }}
              onMouseLeave={() => {
                if (window.matchMedia(touchNavQuery).matches) {
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
  );
}
