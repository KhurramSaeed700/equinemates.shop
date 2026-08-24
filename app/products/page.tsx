import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryStrip, type CategoryStripItem } from "@/components/catalog/category-strip";
import {
  ProductListControls,
  type ProductSortOption,
  type ProductVariantFilterOption,
} from "@/components/catalog/product-list-controls";
import { ProductGrid } from "@/components/catalog/product-grid";
import { RecentlyViewedSection } from "@/components/catalog/recently-viewed";
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
import { Product, ProductCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Equinemates catalog with category segmentation, SKU search, and filters.",
};

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    availability?: string;
    option?: string;
    path?: string;
    page?: string;
    perPage?: string;
    q?: string;
    sort?: string;
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
  products,
  tree,
}: {
  category: ProductCategory | undefined;
  categoryNodes: string[];
  products: Product[];
  tree: CategoryTreeNode[];
}): CategoryStripItem[] {
  const activePath = categoryNodes.length ? categoryNodes : category ? [category] : [];

  const getProductCount = (path: string[]) =>
    products.filter((product) =>
      path.every(
        (segment, index) =>
          product.categoryPath[index]?.toLowerCase() === segment.toLowerCase(),
      ),
    ).length;

  if (!activePath.length) {
    return tree.map((node) => ({
      count: getProductCount(node.path),
      href: buildCategoryPathHref(node.path),
      label: node.name,
    }));
  }

  const activeNode = findCategoryNode(tree, activePath);

  return (
    activeNode?.children.map((child) => ({
      count: getProductCount(child.path),
      href: buildCategoryPathHref(child.path),
      label: child.name,
    })) ?? []
  );
}

function getSkuSortValue(sku: string): [string, number, string] {
  const match = sku.match(/^(.*?)(\d+)(\D*)$/);

  if (!match) {
    return [sku.toLowerCase(), Number.MAX_SAFE_INTEGER, ""];
  }

  return [match[1].toLowerCase(), Number(match[2]), match[3].toLowerCase()];
}

function compareSku(leftSku: string, rightSku: string): number {
  const left = getSkuSortValue(leftSku);
  const right = getSkuSortValue(rightSku);

  return (
    left[0].localeCompare(right[0]) ||
    left[1] - right[1] ||
    left[2].localeCompare(right[2])
  );
}

function sortProducts(products: Product[], sort: string | undefined): Product[] {
  const sortOption = (sort ?? "featured") as ProductSortOption;
  const sortedProducts = [...products];

  switch (sortOption) {
    case "name-asc":
      return sortedProducts.sort((left, right) => left.name.localeCompare(right.name));
    case "name-desc":
      return sortedProducts.sort((left, right) => right.name.localeCompare(left.name));
    case "sku-asc":
      return sortedProducts.sort((left, right) => compareSku(left.sku, right.sku));
    case "sku-desc":
      return sortedProducts.sort((left, right) => compareSku(right.sku, left.sku));
    case "price-asc":
      return sortedProducts.sort((left, right) => left.basePricePkr - right.basePricePkr);
    case "price-desc":
      return sortedProducts.sort((left, right) => right.basePricePkr - left.basePricePkr);
    default:
      return sortedProducts;
  }
}

function getOptionFilterValue(label: string, option: string): string {
  return `${label.trim().toLowerCase()}::${option.trim().toLowerCase()}`;
}

function getVariantFilterOptions(products: Product[]): ProductVariantFilterOption[] {
  const options = new Map<string, ProductVariantFilterOption>();

  for (const product of products) {
    for (const variant of product.variants) {
      for (const option of variant.options) {
        const value = getOptionFilterValue(variant.label, option);
        if (!options.has(value)) {
          options.set(value, {
            label: `${variant.label}: ${option}`,
            value,
          });
        }
      }
    }
  }

  return Array.from(options.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function filterByVariantOption(products: Product[], optionFilter: string | undefined): Product[] {
  if (!optionFilter) {
    return products;
  }

  return products.filter((product) =>
    product.variants.some((variant) =>
      variant.options.some(
        (option) => getOptionFilterValue(variant.label, option) === optionFilter,
      ),
    ),
  );
}

function filterByAvailability(
  products: Product[],
  availability: string | undefined,
): Product[] {
  if (availability === "in-stock") {
    return products.filter((product) => product.stock > 0);
  }

  if (availability === "out-of-stock") {
    return products.filter((product) => product.stock <= 0);
  }

  return products;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const category = params.category as ProductCategory | undefined;
  const categoryPath = params.path;
  const categoryNodes = categoryPath ? categoryPath.split(" > ") : [];
  const [products, categoryTree] = await Promise.all([
    filterProducts({
      query: params.q,
      category,
      categoryPath,
    }),
    getCategoryTree(),
  ]);
  const optionFilterItems = getVariantFilterOptions(products);
  const optionFilteredProducts = filterByVariantOption(products, params.option);
  const filteredProducts = filterByAvailability(
    optionFilteredProducts,
    params.availability,
  );
  const sortedProducts = sortProducts(filteredProducts, params.sort);
  const subcategoryItems = getSubcategoryItems({
    category,
    categoryNodes,
    products,
    tree: categoryTree,
  });
  const categoryStripLabel = categoryPath || category
    ? `Browse ${categoryPath ?? category} subcategories`
    : "Browse catalog categories";
  const perPage = parsePerPageParam(params.perPage);
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / perPage));
  const currentPage = clampPage(parsePageParam(params.page), totalPages);
  const start = (currentPage - 1) * perPage;
  const pagedProducts = sortedProducts.slice(start, start + perPage);
  const end = Math.min(start + perPage, sortedProducts.length);
  const activeCatalogName = categoryPath
    ? categoryPath.split(" > ").at(-1) ?? categoryPath
    : category ?? "All Products";
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
    <div className="products-catalog-layout">
      <div className="products-catalog-heading">
        {breadcrumbItems ? <Breadcrumb items={breadcrumbItems} /> : null}
        <div className="products-catalog-title-row">
          <SectionHeading title={activeCatalogName} />
          <span>{sortedProducts.length} results</span>
        </div>
        <div className="products-catalog-intro">
          <strong>Purpose-built essentials for horses, riders, pets, and stables.</strong>
          <span>
            Compare dependable products, available variations, live stock, and pricing in one place.
          </span>
        </div>
      </div>
      <aside
        aria-label="Catalog navigation and filters"
        className="products-catalog-sidebar"
      >
        <p className="products-catalog-result-count">
          Showing {sortedProducts.length} of {products.length}{" "}
          {products.length === 1 ? "product" : "products"}
        </p>
        {subcategoryItems.length > 0 ? (
          <div className="products-catalog-sidebar-group">
            <p className="products-catalog-sidebar-label">Categories</p>
            <CategoryStrip
              ariaLabel={categoryStripLabel}
              items={subcategoryItems}
            />
          </div>
        ) : null}
        <div className="products-catalog-sidebar-group">
          <p className="products-catalog-sidebar-label">Filter options</p>
          <ProductListControls mode="filters" optionFilters={optionFilterItems} />
        </div>
        <RecentlyViewedSection
          activeMediaQuery="(min-width: 821px)"
          className="products-catalog-recents products-catalog-recents-desktop"
          limit={3}
          showWhenEmpty
          variant="catalog"
        />
      </aside>
      <section className="section-spacing products-grid-mobile-two products-catalog-main">
        <div className="products-catalog-toolbar">
          <p>
            {sortedProducts.length
              ? `${start + 1}-${end} of ${sortedProducts.length}`
              : "0 results"}
          </p>
          <ProductListControls mode="sort" optionFilters={optionFilterItems} />
        </div>
        <ProductGrid products={pagedProducts} showAuthHint />
      </section>
      <div className="products-catalog-pagination">
        <Suspense fallback={null}>
          <SitePagination totalItems={sortedProducts.length} />
        </Suspense>
      </div>
      <RecentlyViewedSection
        activeMediaQuery="(max-width: 820px)"
        className="products-catalog-recents products-catalog-recents-mobile"
        limit={4}
        variant="catalog"
      />
      <section className="products-catalog-guide">
        <div>
          <p className="products-catalog-guide-eyebrow">Equinemates buying guide</p>
          <h2>Choose equipment with confidence</h2>
          <p>
            Use category and product-option filters to narrow the catalog, then compare stock, variation, rating, and pricing details before opening a listing.
          </p>
        </div>
        <div className="products-catalog-faq">
          <details>
            <summary>How do I find the right product variation?</summary>
            <p>Filter by available product options, then open the listing to review every size, finish, or configuration.</p>
          </details>
          <details>
            <summary>How can I tell whether an item is available?</summary>
            <p>Use the availability filter to show products that are currently in stock or review out-of-stock listings separately.</p>
          </details>
          <details>
            <summary>Can I compare prices in another currency?</summary>
            <p>Use the settings icon in the header to switch currency; displayed catalog prices update automatically.</p>
          </details>
        </div>
      </section>
    </div>
  );
}
