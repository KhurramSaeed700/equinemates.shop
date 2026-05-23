"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export type CategoryStripItem = {
  href: string;
  label: string;
};

interface CategoryStripProps {
  ariaLabel?: string;
  items: CategoryStripItem[];
}

export function CategoryStrip({
  ariaLabel = "Browse subcategories",
  items,
}: CategoryStripProps) {
  const stripRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [hasScrolledHorizontally, setHasScrolledHorizontally] = useState(false);

  const updateOverflowState = useCallback(() => {
    const strip = stripRef.current;
    const scroller = scrollerRef.current;

    if (!strip || !scroller) {
      return;
    }

    const nextHasOverflow = scroller.scrollWidth > strip.clientWidth + 1;
    setHasOverflow(nextHasOverflow);

    if (!nextHasOverflow) {
      setHasScrolledHorizontally(false);
    }
  }, []);

  useEffect(() => {
    setHasScrolledHorizontally(false);
    updateOverflowState();

    const strip = stripRef.current;
    const scroller = scrollerRef.current;

    if (!strip || !scroller) {
      return;
    }

    const observer = new ResizeObserver(updateOverflowState);
    observer.observe(strip);
    observer.observe(scroller);

    return () => observer.disconnect();
  }, [items, updateOverflowState]);

  if (!items.length) {
    return null;
  }

  const scrollByPage = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      behavior: "smooth",
      left:
        direction === "left"
          ? -Math.min(scroller.clientWidth * 0.75, 520)
          : Math.min(scroller.clientWidth * 0.75, 520),
    });
  };

  return (
    <section
      aria-label={ariaLabel}
      className={hasOverflow ? "category-strip" : "category-strip category-strip-no-arrows"}
      ref={stripRef}
    >
      {hasOverflow ? (
        <button
          aria-label="Scroll subcategories left"
          className="category-strip-arrow category-strip-arrow-left"
          onClick={() => scrollByPage("left")}
          type="button"
        >
          <FiChevronLeft aria-hidden="true" />
        </button>
      ) : null}

      <div
        className="category-strip-track"
        onScroll={(event) => {
          if (event.currentTarget.scrollLeft > 2) {
            setHasScrolledHorizontally(true);
          }
        }}
        ref={scrollerRef}
      >
        {items.map((item) => (
          <Link className="category-strip-link" href={item.href} key={item.href}>
            <span>{item.label}</span>
            <FiChevronRight aria-hidden="true" />
          </Link>
        ))}
      </div>

      {hasOverflow ? (
        <button
          aria-label="Scroll subcategories right"
          className="category-strip-arrow category-strip-arrow-right"
          onClick={() => scrollByPage("right")}
          type="button"
        >
          <FiChevronRight aria-hidden="true" />
        </button>
      ) : null}

      {hasOverflow ? (
        <span
          aria-hidden="true"
          className={
            hasScrolledHorizontally
              ? "category-strip-scroll-hint category-strip-scroll-hint-hidden"
              : "category-strip-scroll-hint"
          }
        >
          Swipe
          <FiChevronRight aria-hidden="true" />
        </span>
      ) : null}
    </section>
  );
}
