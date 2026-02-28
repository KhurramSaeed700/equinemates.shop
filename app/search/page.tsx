import type { Metadata } from "next";

import { CatalogFilter } from "@/components/catalog/catalog-filter";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SectionHeading } from "@/components/ui/section-heading";
import { filterProducts } from "@/lib/catalog";
import { clampPage, parsePageParam, parsePerPageParam } from "@/lib/pagination";
import { ProductCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search Equinemates products by name and SKU with category and price filters.",
};

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    min?: string;
    max?: string;
    tag?: string;
    page?: string;
    perPage?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const products = filterProducts({
    query: params.q,
    category: params.category as ProductCategory | undefined,
    minPricePkr: params.min ? Number(params.min) : undefined,
    maxPricePkr: params.max ? Number(params.max) : undefined,
    tag: params.tag,
  });
  const perPage = parsePerPageParam(params.perPage);
  const totalPages = Math.max(1, Math.ceil(products.length / perPage));
  const currentPage = clampPage(parsePageParam(params.page), totalPages);
  const start = (currentPage - 1) * perPage;
  const pagedProducts = products.slice(start, start + perPage);

  return (
    <>
      <SectionHeading
        eyebrow="Search"
        title={params.q ? `Results for "${params.q}"` : "Search the catalog"}
        description="Name and SKU search with category and price filtering."
      />
      <CatalogFilter />
      <section className="section-spacing">
        <ProductGrid products={pagedProducts} emptyLabel="No products matched this search." />
      </section>
    </>
  );
}
