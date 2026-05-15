"use client";

import { useEffect, useMemo, useState } from "react";

import { Product } from "@/lib/types";

type CatalogProductsMode = "direct" | "related";

interface UseCatalogProductsOptions {
  slugs?: string[];
  excludeSlugs?: string[];
  limit?: number;
  mode?: CatalogProductsMode;
  enabled?: boolean;
}

interface CatalogProductsResponse {
  products: Product[];
}

function normalizeList(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function useCatalogProducts({
  slugs = [],
  excludeSlugs = [],
  limit,
  mode = "direct",
  enabled = true,
}: UseCatalogProductsOptions) {
  const normalizedSlugs = useMemo(() => normalizeList(slugs), [slugs]);
  const normalizedExcludeSlugs = useMemo(
    () => normalizeList(excludeSlugs),
    [excludeSlugs],
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [resolvedQueryString, setResolvedQueryString] = useState<string | null>(
    null,
  );
  const queryString = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (
      normalizedSlugs.length === 0 &&
      normalizedExcludeSlugs.length === 0 &&
      typeof limit !== "number"
    ) {
      return null;
    }

    const params = new URLSearchParams();
    if (normalizedSlugs.length > 0) {
      params.set("slugs", normalizedSlugs.join(","));
    }
    if (normalizedExcludeSlugs.length > 0) {
      params.set("exclude", normalizedExcludeSlugs.join(","));
    }
    if (typeof limit === "number") {
      params.set("limit", String(limit));
    }
    if (mode !== "direct") {
      params.set("mode", mode);
    }

    return params.toString();
  }, [enabled, limit, mode, normalizedExcludeSlugs, normalizedSlugs]);

  useEffect(() => {
    if (!queryString) {
      return;
    }

    const controller = new AbortController();

    void fetch(`/api/catalog/products?${queryString}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load catalog products: ${response.status}`,
          );
        }

        const data = (await response.json()) as CatalogProductsResponse;
        setProducts(Array.isArray(data.products) ? data.products : []);
        setResolvedQueryString(queryString);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setProducts([]);
        setResolvedQueryString(queryString);
      });

    return () => {
      controller.abort();
    };
  }, [queryString]);

  return {
    products: resolvedQueryString === queryString ? products : [],
    isLoading: Boolean(queryString) && resolvedQueryString !== queryString,
  };
}
