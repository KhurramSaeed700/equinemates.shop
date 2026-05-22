import { randomUUID } from "node:crypto";

import {
  buildCategoryPathHref,
  type AdminProductInput,
  type AdminProductSummary,
  type NavMenu,
} from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { Product, ProductCategory, SearchFilters } from "@/lib/types";

export interface CategoryTreeNode {
  name: string;
  path: string[];
  children: CategoryTreeNode[];
}

export interface FeaturedCategorySummary {
  id: string;
  name: string;
  description: string;
  href: string;
}

type StoredCategoryRow = {
  id: string;
  name: string;
  slug: string;
  level: number;
  path: string;
  parentId: string | null;
};

type PersistedProductRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: string;
  categoryPath: string[] | null;
  shortDescription: string;
  longDescription: string;
  basePriceUsd: unknown;
  basePricePkr: unknown;
  compareAtPricePkr: unknown | null;
  rating: unknown;
  reviewCount: number;
  tags: string[] | null;
  isBestSeller: boolean;
  isNewArrival: boolean;
  relatedSlugs: string[] | null;
  stock: number;
  careInstructions: string | null;
  shippingInfo: string | null;
  isActive: boolean;
  images: string[] | null;
  variants: unknown;
};

type PersistedProductMatch = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  relatedSlugs: string[] | null;
  shippingInfo: string | null;
};

type ProductSkuMatch = {
  id: string;
  slug: string;
  sku: string;
  name: string;
};

type ProductDeleteMatch = {
  id: string;
  slug: string;
  sku: string;
  name: string;
};

function normalizeSlug(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/\/+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProductName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

function toCategoryPath(value: string[] | null, fallbackName: string): string[] {
  const nodes = (value ?? []).map((segment) => segment.trim()).filter(Boolean);
  return nodes.length ? nodes : [fallbackName];
}

function toProductVariants(value: unknown): Product["variants"] {
  return Array.isArray(value) ? (value as Product["variants"]) : [];
}

function isLeaf(node: CategoryTreeNode): boolean {
  return node.children.length === 0;
}

function collectLeafPaths(node: CategoryTreeNode, path: string[]): string[][] {
  if (isLeaf(node)) {
    return [path];
  }

  const paths: string[][] = [];
  for (const child of node.children) {
    paths.push(...collectLeafPaths(child, [...path, child.name]));
  }
  return paths;
}

let productIsActiveColumnReady: boolean | null = null;
const databaseTableExistsCache = new Map<string, boolean>();
const productColumnExistsCache = new Map<string, boolean>();

async function ensureProductIsActiveColumn(): Promise<boolean> {
  if (productIsActiveColumnReady !== null) {
    return productIsActiveColumnReady;
  }

  try {
    await prisma.$executeRaw`
      ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true
    `;
    productIsActiveColumnReady = true;
  } catch (error) {
    productIsActiveColumnReady = false;
    console.error("Could not ensure Product.isActive column exists.", error);
  }

  return productIsActiveColumnReady;
}

async function databaseTableExists(tableName: string): Promise<boolean> {
  const cached = databaseTableExistsCache.get(tableName);
  if (typeof cached === "boolean") {
    return cached;
  }

  const quotedTableName = `"${tableName.replace(/"/g, '""')}"`;

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT to_regclass(${quotedTableName}) IS NOT NULL AS "exists"
    `;
    const exists = Boolean(rows[0]?.exists);
    databaseTableExistsCache.set(tableName, exists);
    return exists;
  } catch (error) {
    console.error(`Could not check whether ${tableName} exists.`, error);
    databaseTableExistsCache.set(tableName, false);
    return false;
  }
}

async function productColumnExists(columnName: string): Promise<boolean> {
  const cached = productColumnExistsCache.get(columnName);
  if (typeof cached === "boolean") {
    return cached;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Product'
          AND column_name = ${columnName}
      ) AS "exists"
    `;
    const exists = Boolean(rows[0]?.exists);
    productColumnExistsCache.set(columnName, exists);
    return exists;
  } catch (error) {
    console.error(`Could not check whether Product.${columnName} exists.`, error);
    productColumnExistsCache.set(columnName, false);
    return false;
  }
}

async function getPersistedProductRows(): Promise<PersistedProductRow[]> {
  const hasIsActiveColumn = await ensureProductIsActiveColumn();
  const hasImagesColumn = await productColumnExists("images");

  if (hasImagesColumn && !hasIsActiveColumn) {
    return prisma.$queryRaw<PersistedProductRow[]>`
      SELECT
        p.*,
        true AS "isActive",
        COALESCE(
          NULLIF(
            (
              SELECT array_agg(pi.url ORDER BY pi.position)
              FROM "ProductImage" pi
              WHERE pi."productId" = p.id
            ),
            ARRAY[]::text[]
          ),
          p.images,
          ARRAY[]::text[]
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pv.id,
                'label', pv.label,
                'options', pv.options
              )
              ORDER BY pv."createdAt"
            )
            FROM "ProductVariant" pv
            WHERE pv."productId" = p.id
          ),
          '[]'::json
        ) AS variants
      FROM "Product" p
      ORDER BY p.name ASC
    `;
  }

  if (hasImagesColumn) {
    return prisma.$queryRaw<PersistedProductRow[]>`
      SELECT
        p.*,
        COALESCE(
          NULLIF(
            (
              SELECT array_agg(pi.url ORDER BY pi.position)
              FROM "ProductImage" pi
              WHERE pi."productId" = p.id
            ),
            ARRAY[]::text[]
          ),
          p.images,
          ARRAY[]::text[]
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pv.id,
                'label', pv.label,
                'options', pv.options
              )
              ORDER BY pv."createdAt"
            )
            FROM "ProductVariant" pv
            WHERE pv."productId" = p.id
          ),
          '[]'::json
        ) AS variants
      FROM "Product" p
      WHERE p."isActive" = true
      ORDER BY p.name ASC
    `;
  }

  if (!hasIsActiveColumn) {
    return prisma.$queryRaw<PersistedProductRow[]>`
      SELECT
        p.*,
        true AS "isActive",
        COALESCE(
          (
            SELECT array_agg(pi.url ORDER BY pi.position)
            FROM "ProductImage" pi
            WHERE pi."productId" = p.id
          ),
          ARRAY[]::text[]
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pv.id,
                'label', pv.label,
                'options', pv.options
              )
              ORDER BY pv."createdAt"
            )
            FROM "ProductVariant" pv
            WHERE pv."productId" = p.id
          ),
          '[]'::json
        ) AS variants
      FROM "Product" p
      ORDER BY p.name ASC
    `;
  }

  return prisma.$queryRaw<PersistedProductRow[]>`
    SELECT
      p.*,
      COALESCE(
        (
          SELECT array_agg(pi.url ORDER BY pi.position)
          FROM "ProductImage" pi
          WHERE pi."productId" = p.id
        ),
        ARRAY[]::text[]
      ) AS images,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'label', pv.label,
              'options', pv.options
            )
            ORDER BY pv."createdAt"
          )
          FROM "ProductVariant" pv
          WHERE pv."productId" = p.id
        ),
        '[]'::json
      ) AS variants
    FROM "Product" p
    WHERE p."isActive" = true
    ORDER BY p.name ASC
  `;
}

async function getPersistedProductRowById(
  productId: string,
): Promise<PersistedProductRow | null> {
  const hasImagesColumn = await productColumnExists("images");

  if (hasImagesColumn) {
    const rows = await prisma.$queryRaw<PersistedProductRow[]>`
      SELECT
        p.*,
        COALESCE(
          NULLIF(
            (
              SELECT array_agg(pi.url ORDER BY pi.position)
              FROM "ProductImage" pi
              WHERE pi."productId" = p.id
            ),
            ARRAY[]::text[]
          ),
          p.images,
          ARRAY[]::text[]
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pv.id,
                'label', pv.label,
                'options', pv.options
              )
              ORDER BY pv."createdAt"
            )
            FROM "ProductVariant" pv
            WHERE pv."productId" = p.id
          ),
          '[]'::json
        ) AS variants
      FROM "Product" p
      WHERE p.id = ${productId}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  const rows = await prisma.$queryRaw<PersistedProductRow[]>`
    SELECT
      p.*,
      COALESCE(
        (
          SELECT array_agg(pi.url ORDER BY pi.position)
          FROM "ProductImage" pi
          WHERE pi."productId" = p.id
        ),
        ARRAY[]::text[]
      ) AS images,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'label', pv.label,
              'options', pv.options
            )
            ORDER BY pv."createdAt"
          )
          FROM "ProductVariant" pv
          WHERE pv."productId" = p.id
        ),
        '[]'::json
      ) AS variants
    FROM "Product" p
    WHERE p.id = ${productId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

function dbProductToProduct(product: PersistedProductRow): Product {
  const categoryPath = toCategoryPath(product.categoryPath, product.category);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    category: (categoryPath[0] ?? product.category) as ProductCategory,
    categoryPath,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    basePriceUsd: Number(product.basePriceUsd),
    basePricePkr: Number(product.basePricePkr),
    compareAtPricePkr:
      product.compareAtPricePkr === null
        ? undefined
        : Number(product.compareAtPricePkr),
    images: product.images ?? [],
    variants: toProductVariants(product.variants),
    rating: Number(product.rating),
    reviewCount: product.reviewCount,
    reviews: [],
    tags: product.tags ?? [],
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    relatedSlugs: product.relatedSlugs ?? [],
    stock: product.stock,
    careInstructions: product.careInstructions ?? undefined,
    shippingInfo: product.shippingInfo ?? undefined,
  };
}

function buildCategoryTree(rows: StoredCategoryRow[]): CategoryTreeNode[] {
  const nodesById = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const row of rows) {
    nodesById.set(row.id, {
      name: row.name,
      path: row.path.split(" > ").map((segment) => segment.trim()).filter(Boolean),
      children: [],
    });
  }

  for (const row of rows) {
    const node = nodesById.get(row.id);
    if (!node) {
      continue;
    }

    if (row.parentId) {
      const parent = nodesById.get(row.parentId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  const sortNodes = (items: CategoryTreeNode[]) => {
    items.sort((left, right) => left.name.localeCompare(right.name));
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

function deriveCategoryRowsFromProducts(products: Product[]): StoredCategoryRow[] {
  const rowsById = new Map<string, StoredCategoryRow>();

  for (const product of products) {
    for (let index = 0; index < product.categoryPath.length; index += 1) {
      const pathSegments = product.categoryPath.slice(0, index + 1);
      const id = normalizeSlug(pathSegments.join("-"));
      if (rowsById.has(id)) {
        continue;
      }

      rowsById.set(id, {
        id,
        name: pathSegments[index],
        slug: id,
        level: index,
        path: pathSegments.join(" > "),
        parentId:
          index > 0 ? normalizeSlug(pathSegments.slice(0, -1).join("-")) : null,
      });
    }
  }

  return Array.from(rowsById.values()).sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}

async function getStoredCategoryRows(): Promise<StoredCategoryRow[]> {
  try {
    return await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        level: true,
        path: true,
        parentId: true,
      },
      orderBy: [{ level: "asc" }, { path: "asc" }],
    });
  } catch (error) {
    console.error("Could not load stored categories from Neon.", error);
    return [];
  }
}

async function getCatalogProductsOrEmpty(): Promise<Product[]> {
  try {
    const rows = await getPersistedProductRows();
    return rows.map(dbProductToProduct);
  } catch (error) {
    console.error("Could not load persisted products from Neon.", error);
    return [];
  }
}

async function getRelatedSlugsForCategory(
  productSlug: string,
  category: ProductCategory,
): Promise<string[]> {
  const hasIsActiveColumn = await ensureProductIsActiveColumn();

  if (!hasIsActiveColumn) {
    const rows = await prisma.$queryRaw<Array<{ slug: string }>>`
      SELECT slug
      FROM "Product"
      WHERE category = ${category}
        AND slug <> ${productSlug}
      ORDER BY name ASC
      LIMIT 4
    `;

    return rows.map((row) => row.slug);
  }

  const rows = await prisma.$queryRaw<Array<{ slug: string }>>`
    SELECT slug
    FROM "Product"
    WHERE category = ${category}
      AND slug <> ${productSlug}
      AND "isActive" = true
    ORDER BY name ASC
    LIMIT 4
  `;

  return rows.map((row) => row.slug);
}

async function findPersistedProductMatch({
  normalizedOriginalSlug,
  normalizedSlug,
  normalizedSku,
}: {
  normalizedOriginalSlug: string | null;
  normalizedSlug: string;
  normalizedSku: string;
}): Promise<PersistedProductMatch | null> {
  const rows = await prisma.$queryRaw<PersistedProductMatch[]>`
    SELECT id, slug, sku, name, "relatedSlugs", "shippingInfo"
    FROM "Product"
    WHERE slug = ${normalizedSlug}
      OR slug = ${normalizedOriginalSlug ?? normalizedSlug}
      OR sku = ${normalizedSku}
  `;
  const product =
    normalizedOriginalSlug === null
      ? null
      : rows.find((match) => normalizeSlug(match.slug) === normalizedOriginalSlug) ??
        null;
  const skuConflict = rows.find(
    (match) => normalizeSku(match.sku) === normalizedSku && match.id !== product?.id,
  );

  if (skuConflict) {
    throw new Error(
      `SKU ${normalizedSku} is already used by ${skuConflict.name}. Use a unique SKU before saving.`,
    );
  }

  const slugConflict = rows.find(
    (match) => normalizeSlug(match.slug) === normalizedSlug && match.id !== product?.id,
  );

  if (slugConflict) {
    throw new Error(
      `Product slug ${normalizedSlug} is already used by ${slugConflict.name}.`,
    );
  }

  return product;
}

export async function checkProductSkuAvailability({
  sku,
  originalSlug,
}: {
  sku: string;
  originalSlug?: string;
}): Promise<{
  sku: string;
  available: boolean;
  product: ProductSkuMatch | null;
}> {
  const normalizedSku = normalizeSku(sku);

  if (!normalizedSku) {
    throw new Error("SKU is required.");
  }

  const normalizedOriginalSlug = originalSlug ? normalizeSlug(originalSlug) : null;
  const rows = await prisma.$queryRaw<ProductSkuMatch[]>`
    SELECT id, slug, sku, name
    FROM "Product"
    WHERE upper(sku) = ${normalizedSku}
    LIMIT 2
  `;
  const conflictingProduct =
    rows.find(
      (product) =>
        !normalizedOriginalSlug ||
        normalizeSlug(product.slug) !== normalizedOriginalSlug,
    ) ?? null;

  return {
    sku: normalizedSku,
    available: conflictingProduct === null,
    product: conflictingProduct,
  };
}

export async function getCatalogProducts(): Promise<Product[]> {
  return getCatalogProductsOrEmpty();
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const storedRows = await getStoredCategoryRows();
  if (storedRows.length > 0) {
    return buildCategoryTree(storedRows);
  }

  const products = await getCatalogProducts();
  return buildCategoryTree(deriveCategoryRowsFromProducts(products));
}

export async function getCategoryOptions(): Promise<ProductCategory[]> {
  return (await getCategoryTree()).map(
    (category) => category.name as ProductCategory,
  );
}

export async function getFeaturedCategorySummary(): Promise<
  FeaturedCategorySummary[]
> {
  return (await getCategoryTree()).slice(0, 5).map((category) => ({
    id: `cat-${normalizeSlug(category.name)}`,
    name: category.name,
    description: `${category.name} essentials curated across premium product lines.`,
    href: `/products?category=${encodeURIComponent(category.name)}`,
  }));
}

export async function getNavbarMenus(): Promise<NavMenu[]> {
  const categories = await getCategoryTree();

  return categories.map((top) => {
    const columns: NavMenu["columns"] = [];

    for (const child of top.children) {
      if (top.name === "Horse" && child.name === "Bits & Tack") {
        columns.push({
          heading: "Bits",
          href: buildCategoryPathHref([top.name, child.name]),
          items: child.children.map((group) => ({
            label: group.name,
            href: buildCategoryPathHref([top.name, child.name, group.name]),
          })),
        });
        continue;
      }

      if (child.children.length > 0 && child.children.every(isLeaf)) {
        columns.push({
          heading: child.name,
          href: buildCategoryPathHref([top.name, child.name]),
          items: child.children.map((leaf) => ({
            label: leaf.name,
            href: buildCategoryPathHref([top.name, child.name, leaf.name]),
          })),
        });
        continue;
      }

      if (child.children.length > 0) {
        for (const grandChild of child.children) {
          const leafPaths = collectLeafPaths(grandChild, [
            top.name,
            child.name,
            grandChild.name,
          ]);
          columns.push({
            heading: grandChild.name,
            href: buildCategoryPathHref([top.name, child.name, grandChild.name]),
            items: leafPaths.map((path) => ({
              label: path[path.length - 1],
              href: buildCategoryPathHref(path),
            })),
          });
        }
      }
    }

    return {
      label: top.name,
      href: `/products?category=${encodeURIComponent(top.name)}`,
      columns,
    };
  });
}

function findProductBySlug(products: Product[], slug: string): Product | undefined {
  const directMatch = products.find((product) => product.slug === slug);
  if (directMatch) {
    return directMatch;
  }

  const normalizedSlug = normalizeSlug(slug);
  return products.find(
    (product) => normalizeSlug(product.slug) === normalizedSlug,
  );
}

export async function getAdminProductSummaries(): Promise<AdminProductSummary[]> {
  const products = await getCatalogProducts();

  return products
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      category: product.category,
      primaryImage: product.images[0] ?? null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return findProductBySlug(await getCatalogProducts(), slug);
}

export async function getRelatedProducts(slug: string): Promise<Product[]> {
  const products = await getCatalogProducts();
  const product = findProductBySlug(products, slug);

  if (!product) {
    return [];
  }

  return product.relatedSlugs
    .map((relatedSlug) => findProductBySlug(products, relatedSlug))
    .filter((relatedProduct): relatedProduct is Product => Boolean(relatedProduct));
}

export async function getBestSellers(limit = 4): Promise<Product[]> {
  const products = await getCatalogProducts();
  return products.filter((product) => product.isBestSeller).slice(0, limit);
}

export async function getNewArrivals(limit = 4): Promise<Product[]> {
  const products = await getCatalogProducts();
  return products.filter((product) => product.isNewArrival).slice(0, limit);
}

export async function filterProducts(filters: SearchFilters): Promise<Product[]> {
  const products = await getCatalogProducts();

  return products.filter((product) => {
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    if (filters.categoryPath) {
      const productPath = product.categoryPath.join(" > ");
      const isExactMatch = productPath === filters.categoryPath;
      const isNestedMatch = productPath.startsWith(`${filters.categoryPath} > `);
      if (!isExactMatch && !isNestedMatch) {
        return false;
      }
    }

    if (filters.minPricePkr && product.basePricePkr < filters.minPricePkr) {
      return false;
    }

    if (filters.maxPricePkr && product.basePricePkr > filters.maxPricePkr) {
      return false;
    }

    if (filters.tag && !product.tags.includes(filters.tag)) {
      return false;
    }

    if (!filters.query) {
      return true;
    }

    const normalizedQuery = filters.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.sku.toLowerCase().includes(normalizedQuery) ||
      product.categoryPath.some((node) => node.toLowerCase().includes(normalizedQuery))
    );
  });
}

export async function searchSuggestions(query: string): Promise<Product[]> {
  if (!query.trim()) {
    return [];
  }

  return (await filterProducts({ query })).slice(0, 6);
}

export async function saveAdminProduct(input: AdminProductInput): Promise<{
  product: Product;
  created: boolean;
}> {
  const normalizedName = normalizeProductName(input.name);
  const normalizedSlug = normalizeSlug(input.slug || input.name);
  const normalizedOriginalSlug = input.originalSlug
    ? normalizeSlug(input.originalSlug)
    : null;
  const normalizedSku = normalizeSku(input.sku);
  const categoryPath = input.categoryPath.map((node) => node.trim()).filter(Boolean);
  const category = (categoryPath[0] ?? input.category).trim() as ProductCategory;
  const images = input.images.map((image) => image.trim()).filter(Boolean);
  const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);

  if (!normalizedName || !normalizedSku) {
    throw new Error("Product name and SKU are required.");
  }

  if (!normalizedSlug) {
    throw new Error("Product slug is required.");
  }

  if (!category) {
    throw new Error("Product category is required.");
  }

  if (!Number.isFinite(input.basePriceUsd) || !Number.isFinite(input.basePricePkr)) {
    throw new Error("Product prices must be valid numbers.");
  }

  if (!Number.isFinite(input.stock)) {
    throw new Error("Product stock must be a valid number.");
  }

  const existingProduct = await findPersistedProductMatch({
    normalizedOriginalSlug,
    normalizedSlug,
    normalizedSku,
  });
  const productId = existingProduct?.id ?? randomUUID();
  const now = new Date();
  const safeCategoryPath = categoryPath.length ? categoryPath : [category];
  const relatedSlugs =
    existingProduct?.relatedSlugs ?? (await getRelatedSlugsForCategory(normalizedSlug, category));
  const compareAtPricePkr = Number.isFinite(input.compareAtPricePkr)
    ? Math.round(input.compareAtPricePkr as number)
    : null;
  const shippingInfo =
    typeof input.shippingInfo === "string"
      ? input.shippingInfo.trim() || null
      : existingProduct?.shippingInfo ?? null;

  await prisma.$transaction(async (transaction) => {
    if (existingProduct) {
      await transaction.$executeRaw`
        UPDATE "Product"
        SET
          slug = ${normalizedSlug},
          sku = ${normalizedSku},
          name = ${normalizedName},
          category = ${category},
          "categoryPath" = ${safeCategoryPath},
          "shortDescription" = ${input.shortDescription.trim()},
          "longDescription" = ${input.longDescription.trim()},
          "basePriceUsd" = ${input.basePriceUsd},
          "basePricePkr" = ${Math.round(input.basePricePkr)},
          "compareAtPricePkr" = ${compareAtPricePkr},
          tags = ${tags},
          "isBestSeller" = ${input.isBestSeller},
          "isNewArrival" = ${input.isNewArrival},
          "relatedSlugs" = ${relatedSlugs},
          stock = ${Math.floor(input.stock)},
          "careInstructions" = ${input.careInstructions?.trim() || null},
          "shippingInfo" = ${shippingInfo},
          "updatedAt" = ${now}
        WHERE id = ${productId}
      `;
    } else {
      await transaction.$executeRaw`
        INSERT INTO "Product" (
          id,
          slug,
          sku,
          name,
          category,
          "categoryPath",
          "shortDescription",
          "longDescription",
          "basePriceUsd",
          "basePricePkr",
          "compareAtPricePkr",
          rating,
          "reviewCount",
          tags,
          "isBestSeller",
          "isNewArrival",
          "relatedSlugs",
          stock,
          "careInstructions",
          "shippingInfo",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${productId},
          ${normalizedSlug},
          ${normalizedSku},
          ${normalizedName},
          ${category},
          ${safeCategoryPath},
          ${input.shortDescription.trim()},
          ${input.longDescription.trim()},
          ${input.basePriceUsd},
          ${Math.round(input.basePricePkr)},
          ${compareAtPricePkr},
          ${0},
          ${0},
          ${tags},
          ${input.isBestSeller},
          ${input.isNewArrival},
          ${relatedSlugs},
          ${Math.floor(input.stock)},
          ${input.careInstructions?.trim() || null},
          ${shippingInfo},
          ${now},
          ${now}
        )
      `;
    }

    await transaction.$executeRaw`
      DELETE FROM "ProductImage"
      WHERE "productId" = ${productId}
    `;

    for (const [index, image] of images.entries()) {
      await transaction.$executeRaw`
        INSERT INTO "ProductImage" ("id", "productId", "url", "position")
        VALUES (${randomUUID()}, ${productId}, ${image}, ${index})
      `;
    }
  });

  const savedProduct = await getPersistedProductRowById(productId);

  if (!savedProduct) {
    throw new Error("Product was saved but could not be loaded from Neon.");
  }

  return {
    product: dbProductToProduct(savedProduct),
    created: !existingProduct,
  };
}

export async function deleteAdminProduct(slug: string): Promise<{
  name: string;
  deleted: boolean;
  deactivated: boolean;
}> {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    throw new Error("Product slug is required.");
  }

  const hasIsActiveColumn = await ensureProductIsActiveColumn();
  const rows = hasIsActiveColumn
    ? await prisma.$queryRaw<ProductDeleteMatch[]>`
        SELECT id, slug, sku, name
        FROM "Product"
        WHERE slug = ${normalizedSlug}
          AND "isActive" = true
        LIMIT 1
      `
    : await prisma.$queryRaw<ProductDeleteMatch[]>`
        SELECT id, slug, sku, name
        FROM "Product"
        WHERE slug = ${normalizedSlug}
        LIMIT 1
      `;
  const product = rows[0] ?? null;

  if (!product) {
    throw new Error("Product not found.");
  }

  const [
    hasOrderItemTable,
    hasCartItemTable,
    hasWishlistItemTable,
    hasProductRelationTable,
    hasProductImageTable,
    hasProductVariantTable,
    hasRelatedSlugsColumn,
  ] = await Promise.all([
    databaseTableExists("OrderItem"),
    databaseTableExists("CartItem"),
    databaseTableExists("WishlistItem"),
    databaseTableExists("ProductRelation"),
    databaseTableExists("ProductImage"),
    databaseTableExists("ProductVariant"),
    productColumnExists("relatedSlugs"),
  ]);
  const orderRows = hasOrderItemTable
    ? await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "OrderItem"
        WHERE "productId" = ${product.id}
      `
    : [];
  const orderItemCount = Number(orderRows[0]?.count ?? 0);

  if (orderItemCount > 0) {
    if (!hasIsActiveColumn) {
      throw new Error(
        "This product has order history and cannot be removed until the Product.isActive column exists.",
      );
    }

    const removedToken = product.id.slice(0, 8);
    const removedSlug = normalizeSlug(`removed-${product.slug}-${removedToken}`);
    const removedSku = normalizeSku(`REMOVED-${product.sku}-${removedToken}`);
    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      if (hasCartItemTable) {
        await transaction.$executeRaw`
          DELETE FROM "CartItem"
          WHERE "productId" = ${product.id}
        `;
      }
      if (hasWishlistItemTable) {
        await transaction.$executeRaw`
          DELETE FROM "WishlistItem"
          WHERE "productId" = ${product.id}
        `;
      }
      if (hasProductRelationTable) {
        await transaction.$executeRaw`
          DELETE FROM "ProductRelation"
          WHERE "sourceProductId" = ${product.id}
            OR "targetProductId" = ${product.id}
        `;
      }
      if (hasRelatedSlugsColumn) {
        await transaction.$executeRaw`
          UPDATE "Product"
          SET
            "isActive" = false,
            slug = ${removedSlug},
            sku = ${removedSku},
            "relatedSlugs" = ARRAY[]::text[],
            "updatedAt" = ${now}
          WHERE id = ${product.id}
        `;
      } else {
        await transaction.$executeRaw`
          UPDATE "Product"
          SET
            "isActive" = false,
            slug = ${removedSlug},
            sku = ${removedSku},
            "updatedAt" = ${now}
          WHERE id = ${product.id}
        `;
      }
    });

    return {
      name: product.name,
      deleted: false,
      deactivated: true,
    };
  }

  await prisma.$transaction(async (transaction) => {
    if (hasProductImageTable) {
      await transaction.$executeRaw`
        DELETE FROM "ProductImage"
        WHERE "productId" = ${product.id}
      `;
    }
    if (hasProductVariantTable) {
      await transaction.$executeRaw`
        DELETE FROM "ProductVariant"
        WHERE "productId" = ${product.id}
      `;
    }
    if (hasCartItemTable) {
      await transaction.$executeRaw`
        DELETE FROM "CartItem"
        WHERE "productId" = ${product.id}
      `;
    }
    if (hasWishlistItemTable) {
      await transaction.$executeRaw`
        DELETE FROM "WishlistItem"
        WHERE "productId" = ${product.id}
      `;
    }
    if (hasProductRelationTable) {
      await transaction.$executeRaw`
        DELETE FROM "ProductRelation"
        WHERE "sourceProductId" = ${product.id}
          OR "targetProductId" = ${product.id}
      `;
    }
    await transaction.$executeRaw`
      DELETE FROM "Product"
      WHERE id = ${product.id}
    `;
  });

  return {
    name: product.name,
    deleted: true,
    deactivated: false,
  };
}
