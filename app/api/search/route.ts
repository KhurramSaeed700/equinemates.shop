import { NextResponse } from "next/server";

import { filterProducts, searchSuggestions } from "@/lib/catalog";
import { ProductCategory } from "@/lib/types";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") as ProductCategory | null;
  const min = searchParams.get("min");
  const max = searchParams.get("max");

  const suggestions = searchSuggestions(query);
  const results = filterProducts({
    query,
    category: category ?? undefined,
    minPricePkr: min ? Number(min) : undefined,
    maxPricePkr: max ? Number(max) : undefined,
  });

  return NextResponse.json({
    query,
    total: results.length,
    suggestions: suggestions.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
    })),
    results,
  });
}
