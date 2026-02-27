import type { Metadata } from "next";

import { ProductGrid } from "@/components/catalog/product-grid";
import { SectionHeading } from "@/components/ui/section-heading";
import { filterProducts } from "@/lib/catalog";
import { ProductCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Equinemates catalog with category segmentation, SKU search, and filters.",
};

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const category = params.category as ProductCategory | undefined;
  const products = filterProducts({
    category,
  });

  return (
    <>
      <SectionHeading
        eyebrow="Catalog"
        title={category ? `${category}` : "All Products"}
        description="Every product includes SKU, variants, multi-currency pricing, wishlist, reviews, and related products."
      />
      <section className="section-spacing">
        <ProductGrid products={products} />
      </section>
    </>
  );
}
