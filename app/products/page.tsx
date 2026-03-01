import type { Metadata } from "next";

import { ProductGrid } from "@/components/catalog/product-grid";
import { SectionHeading } from "@/components/ui/section-heading";
import { filterProducts } from "@/lib/catalog";
import { clampPage, parsePageParam, parsePerPageParam } from "@/lib/pagination";
import { ProductCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Equinemates catalog with category segmentation, SKU search, and filters.",
};

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    path?: string;
    page?: string;
    perPage?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const category = params.category as ProductCategory | undefined;
  const categoryPath = params.path;
  const products = filterProducts({
    category,
    categoryPath,
  });
  const perPage = parsePerPageParam(params.perPage);
  const totalPages = Math.max(1, Math.ceil(products.length / perPage));
  const currentPage = clampPage(parsePageParam(params.page), totalPages);
  const start = (currentPage - 1) * perPage;
  const pagedProducts = products.slice(start, start + perPage);

  return (
    <>
      <SectionHeading
        eyebrow="Catalog"
        title={categoryPath ? categoryPath.split(" > ").at(-1) ?? categoryPath : category ? `${category}` : "All Products"}
        description="Every product includes SKU, variants, multi-currency pricing, wishlist, reviews, and related products."
      />
      <section className="section-spacing">
        <ProductGrid products={pagedProducts} />
      </section>
    </>
  );
}
