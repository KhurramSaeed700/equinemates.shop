import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryStrip, type CategoryStripItem } from "@/components/catalog/category-strip";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SitePagination } from "@/components/layout/site-pagination";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeading } from "@/components/ui/section-heading";
import { buildCategoryPathHref } from "@/lib/catalog";
import { clampPage, parsePageParam, parsePerPageParam } from "@/lib/pagination";
import {
  filterProducts,
  getCategoryTree,
  type CategoryTreeNode,
} from "@/lib/server/catalog-products";
import { ProductCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

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

function findCategoryNode(
  nodes: CategoryTreeNode[],
  path: string[],
): CategoryTreeNode | null {
  let currentNodes = nodes;
  let currentNode: CategoryTreeNode | null = null;

  for (const segment of path) {
    currentNode =
      currentNodes.find((node) => node.name.toLowerCase() === segment.toLowerCase()) ??
      null;

    if (!currentNode) {
      return null;
    }

    currentNodes = currentNode.children;
  }

  return currentNode;
}

function getSubcategoryItems({
  category,
  categoryNodes,
  tree,
}: {
  category: ProductCategory | undefined;
  categoryNodes: string[];
  tree: CategoryTreeNode[];
}): CategoryStripItem[] {
  const activePath = categoryNodes.length ? categoryNodes : category ? [category] : [];

  if (!activePath.length) {
    return [];
  }

  const activeNode = findCategoryNode(tree, activePath);

  return (
    activeNode?.children.map((child) => ({
      href: buildCategoryPathHref(child.path),
      label: child.name,
    })) ?? []
  );
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const category = params.category as ProductCategory | undefined;
  const categoryPath = params.path;
  const categoryNodes = categoryPath ? categoryPath.split(" > ") : [];
  const [products, categoryTree] = await Promise.all([
    filterProducts({
      category,
      categoryPath,
    }),
    getCategoryTree(),
  ]);
  const subcategoryItems = getSubcategoryItems({
    category,
    categoryNodes,
    tree: categoryTree,
  });
  const perPage = parsePerPageParam(params.perPage);
  const totalPages = Math.max(1, Math.ceil(products.length / perPage));
  const currentPage = clampPage(parsePageParam(params.page), totalPages);
  const start = (currentPage - 1) * perPage;
  const pagedProducts = products.slice(start, start + perPage);
  const breadcrumbItems =
    category && categoryNodes.length > 0
      ? [
          { href: "/products", label: "Products" },
          ...categoryNodes.map((node, index) => ({
            href:
              index < categoryNodes.length - 1
                ? index === 0
                  ? `/products?category=${encodeURIComponent(category)}`
                  : buildCategoryPathHref(categoryNodes.slice(0, index + 1))
                : undefined,
            label: node,
          })),
        ]
      : null;

  return (
    <>
      {breadcrumbItems ? <Breadcrumb items={breadcrumbItems} /> : null}
      <SectionHeading
        title={categoryPath ? categoryPath.split(" > ").at(-1) ?? categoryPath : category ? `${category}` : "All Products"}
      />
      <CategoryStrip
        ariaLabel={`Browse ${categoryPath ?? category ?? "catalog"} subcategories`}
        items={subcategoryItems}
      />
      <section className="section-spacing products-grid-mobile-two">
        <ProductGrid products={pagedProducts} showAuthHint />
      </section>
      <Suspense fallback={null}>
        <SitePagination totalItems={products.length} />
      </Suspense>
    </>
  );
}
