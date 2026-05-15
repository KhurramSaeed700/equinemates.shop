import { NextResponse } from "next/server";

import { filterProducts, searchSuggestions } from "@/lib/server/catalog-products";
import { ProductCategory } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") as ProductCategory | null;
  const min = searchParams.get("min");
  const max = searchParams.get("max");
  const mode = searchParams.get("mode");

  const suggestions = await searchSuggestions(query);

  if (mode === "suggestions") {
    return NextResponse.json({
      query,
      suggestions: suggestions.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        sku: product.sku,
        image: product.images[0],
      })),
    });
  }

  const results = await filterProducts({
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
      image: product.images[0],
    })),
    results,
  });
}
