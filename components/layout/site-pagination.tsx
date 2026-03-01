"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { filterProducts } from "@/lib/catalog";
import {
  clampPage,
  ITEMS_PER_PAGE,
  parsePageParam,
  parsePerPageParam,
  PER_PAGE_OPTIONS,
} from "@/lib/pagination";
import { ProductCategory } from "@/lib/types";

function getVisiblePages(current: number, total: number) {
  const base = new Set<number>([1, total, current - 1, current, current + 1]);
  return Array.from(base)
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
}

export function SitePagination() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isListingPage = pathname === "/products" || pathname === "/search";
  const perPage = parsePerPageParam(searchParams.get("perPage") ?? undefined);
  const shouldRender = isListingPage;

  const totalItems = useMemo(() => {
    if (pathname === "/products") {
      const category = searchParams.get("category") as ProductCategory | null;
      const categoryPath = searchParams.get("path");
      return filterProducts({
        category: category ?? undefined,
        categoryPath: categoryPath ?? undefined,
      }).length;
    }

    if (pathname === "/search") {
      const min = searchParams.get("min");
      const max = searchParams.get("max");
      const category = searchParams.get("category") as ProductCategory | null;
      return filterProducts({
        query: searchParams.get("q") ?? undefined,
        category: category ?? undefined,
        minPricePkr: min ? Number(min) : undefined,
        maxPricePkr: max ? Number(max) : undefined,
        tag: searchParams.get("tag") ?? undefined,
      }).length;
    }

    return 0;
  }, [pathname, searchParams]);

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = clampPage(parsePageParam(searchParams.get("page") ?? undefined), totalPages);
  const visible = getVisiblePages(currentPage, totalPages);

  const pageHref = (page: number) => {
    if (!isListingPage) {
      return pathname;
    }

    const next = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(page));
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const handlePerPageChange = (value: string) => {
    if (!isListingPage) {
      return;
    }

    const next = new URLSearchParams(searchParams.toString());
    const nextPerPage = parsePerPageParam(value);

    if (nextPerPage === ITEMS_PER_PAGE) {
      next.delete("perPage");
    } else {
      next.set("perPage", String(nextPerPage));
    }

    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="section-spacing">
      {isListingPage ? (
        <div className="mb-3 flex justify-end">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            Show
            <select
              value={String(perPage)}
              onChange={(event) => handlePerPageChange(event.target.value)}
              className="h-9 border border-[var(--line)] bg-white px-2 text-sm text-[var(--ink)]"
            >
              {PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            {previousPage ? (
              <PaginationPrevious href={pageHref(previousPage)}>Prev</PaginationPrevious>
            ) : (
              <span className="inline-flex h-9 min-w-9 items-center justify-center border border-[var(--line)] px-3 text-sm text-[var(--ink-soft)]">
                Prev
              </span>
            )}
          </PaginationItem>

          {visible.map((index, order) => {
            const prevIndex = order > 0 ? visible[order - 1] : null;

            return (
              <PaginationItem key={index}>
                {prevIndex !== null && index - prevIndex > 1 ? (
                  <PaginationEllipsis />
                ) : null}
                <PaginationLink href={pageHref(index)} isActive={index === currentPage}>
                  {index}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            {nextPage ? (
              <PaginationNext href={pageHref(nextPage)}>Next</PaginationNext>
            ) : (
              <span className="inline-flex h-9 min-w-9 items-center justify-center border border-[var(--line)] px-3 text-sm text-[var(--ink-soft)]">
                Next
              </span>
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
