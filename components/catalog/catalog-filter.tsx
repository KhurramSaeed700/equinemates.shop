"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo } from "react";

import { CATEGORY_OPTIONS } from "@/lib/catalog";

export function CatalogFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = useMemo(
    () => ({
      query: searchParams.get("q") ?? "",
      category: searchParams.get("category") ?? "",
      min: searchParams.get("min") ?? "",
      max: searchParams.get("max") ?? "",
    }),
    [searchParams],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const q = String(formData.get("q") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const min = String(formData.get("min") ?? "").trim();
    const max = String(formData.get("max") ?? "").trim();

    if (q) {
      params.set("q", q);
    }
    if (category) {
      params.set("category", category);
    }
    if (min) {
      params.set("min", min);
    }
    if (max) {
      params.set("max", max);
    }

    router.push(`/search?${params.toString()}`);
  };

  return (
    <form className="panel filter-form" onSubmit={onSubmit}>
      <label>
        Name / SKU
        <input defaultValue={current.query} name="q" type="search" />
      </label>
      <label>
        Category
        <select defaultValue={current.category} name="category">
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label>
        Min PKR
        <input defaultValue={current.min} min={0} name="min" type="number" />
      </label>
      <label>
        Max PKR
        <input defaultValue={current.max} min={0} name="max" type="number" />
      </label>
      <button className="btn-secondary" type="submit">
        Apply Filters
      </button>
    </form>
  );
}
