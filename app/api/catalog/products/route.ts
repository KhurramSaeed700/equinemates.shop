import { NextResponse } from "next/server";

import { getCatalogProducts } from "@/lib/server/catalog-products";
import { Product } from "@/lib/types";

const MAX_LIMIT = 100;

function parseList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();
  const items: string[] = [];

  for (const entry of value.split(",")) {
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    items.push(normalized);
  }

  return items;
}

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function appendProduct(
  collection: Product[],
  seen: Set<string>,
  excluded: Set<string>,
  product: Product | undefined,
) {
  if (!product || seen.has(product.slug) || excluded.has(product.slug)) {
    return;
  }

  seen.add(product.slug);
  collection.push(product);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugs = parseList(searchParams.get("slugs"));
  const excluded = new Set(parseList(searchParams.get("exclude")));
  const limit = parseLimit(searchParams.get("limit"));
  const mode = searchParams.get("mode") === "related" ? "related" : "direct";
  const products = await getCatalogProducts();
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const result: Product[] = [];
  const seen = new Set<string>();

  if (mode === "related" && slugs.length > 0) {
    for (const sourceSlug of slugs) {
      excluded.add(sourceSlug);
      const sourceProduct = productsBySlug.get(sourceSlug);
      if (!sourceProduct) {
        continue;
      }

      for (const relatedSlug of sourceProduct.relatedSlugs) {
        appendProduct(result, seen, excluded, productsBySlug.get(relatedSlug));
      }
    }
  } else {
    for (const slug of slugs) {
      appendProduct(result, seen, excluded, productsBySlug.get(slug));
    }
  }

  const shouldAppendFallback =
    slugs.length === 0 || (typeof limit === "number" && result.length < limit);

  if (shouldAppendFallback) {
    for (const product of products) {
      const beforeLength = result.length;
      appendProduct(result, seen, excluded, product);

      if (typeof limit === "number" && result.length > beforeLength) {
        if (result.length >= limit) {
          break;
        }
      }
    }
  }

  return NextResponse.json(
    {
      products: typeof limit === "number" ? result.slice(0, limit) : result,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
