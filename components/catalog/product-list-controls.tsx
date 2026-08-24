"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiX } from "react-icons/fi";

import { NativeSelect } from "@/components/ui/native-select";

export type ProductSortOption =
  | "featured"
  | "name-asc"
  | "name-desc"
  | "sku-asc"
  | "sku-desc"
  | "price-asc"
  | "price-desc";

export type ProductVariantFilterOption = {
  label: string;
  value: string;
};

const SORT_OPTIONS: Array<{ label: string; value: ProductSortOption }> = [
  { label: "Featured", value: "featured" },
  { label: "Name A-Z", value: "name-asc" },
  { label: "Name Z-A", value: "name-desc" },
  { label: "SKU ascending", value: "sku-asc" },
  { label: "SKU descending", value: "sku-desc" },
  { label: "Price low to high", value: "price-asc" },
  { label: "Price high to low", value: "price-desc" },
];

export function ProductListControls({
  mode = "filters",
  optionFilters,
}: {
  mode?: "filters" | "sort";
  optionFilters: ProductVariantFilterOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = useMemo(
    () => ({
      availability: searchParams.get("availability") ?? "",
      option: searchParams.get("option") ?? "",
      sort: (searchParams.get("sort") ?? "featured") as ProductSortOption,
    }),
    [searchParams],
  );

  const pushParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value && !(key === "sort" && value === "featured")) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }

    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const hasActiveFilters = Boolean(current.availability || current.option);

  return (
    <div
      className={`catalog-list-controls catalog-list-controls-${mode}`}
      aria-label={mode === "sort" ? "Product sorting" : "Product filters"}
    >
      {mode === "sort" ? (
        <label className="catalog-control catalog-sort-control">
          <span>Sort by</span>
          <NativeSelect
            aria-label="Sort products"
            onChange={(event) => pushParams({ sort: event.currentTarget.value })}
            value={current.sort}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </label>
      ) : (
        <>
          <label className="catalog-control">
            <span>Availability</span>
            <NativeSelect
              aria-label="Filter by availability"
              onChange={(event) =>
                pushParams({ availability: event.currentTarget.value })
              }
              value={current.availability}
            >
              <option value="">All products</option>
              <option value="in-stock">In stock</option>
              <option value="out-of-stock">Out of stock</option>
            </NativeSelect>
          </label>
          <label className="catalog-control">
            <span>Product option</span>
            <NativeSelect
              aria-label="Filter by product option"
              disabled={!optionFilters.length}
              onChange={(event) => pushParams({ option: event.currentTarget.value })}
              value={current.option}
            >
              <option value="">
                {optionFilters.length ? "All options" : "No options"}
              </option>
              {optionFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          {hasActiveFilters ? (
            <button
              aria-label="Clear filters"
              className="btn-secondary catalog-filter-clear"
              onClick={() => pushParams({ availability: "", option: "" })}
              type="button"
            >
              <FiX aria-hidden="true" />
              Clear filters
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
