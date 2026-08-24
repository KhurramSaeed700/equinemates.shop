import { randomUUID } from "node:crypto";

import { Prisma } from "@/lib/generated/prisma/client";

import {
  buildCategoryPathHref,
  type AdminProductInput,
  type AdminProductSummary,
  type NavMenu,
} from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import {
  Product,
  ProductCategory,
  ProductVariant,
  SearchFilters,
} from "@/lib/types";

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
  amazonSellerSku: string | null;
  amazonAsin: string | null;
  amazonStoreUrl: string | null;
  amazonFulfillableQuantity: number | null;
  amazonInventoryUpdatedAt: Date | string | null;
  amazonMcfEnabled: boolean | null;
  careInstructions: string | null;
  shippingInfo: string | null;
  isActive: boolean;
  images: string[] | null;
  bannerImages: string[] | null;
  variants: unknown;
  parentListingId: string | null;
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

type ProductImageSourceRow = {
  source: string | null;
};

type ProductListingMatch = {
  id: string;
  name: string;
  parentListingId: string | null;
  shortDescription: string;
  longDescription: string;
  careInstructions: string | null;
  shippingInfo: string | null;
};

function normalizeAmazonAsin(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const dpMatch = trimmedValue.match(/\/dp\/([a-z0-9]{10})/i);

  if (dpMatch?.[1]) {
    return dpMatch[1].toUpperCase();
  }

  const asin = trimmedValue.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return asin || null;
}

function buildAmazonListingUrl(asin: string | null): string | null {
  return asin ? `https://www.amazon.com/dp/${asin}` : null;
}

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
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const variant = item as {
        id?: unknown;
        label?: unknown;
        options?: unknown;
      };
      const label = String(variant.label ?? "").trim();
      const options = Array.isArray(variant.options)
        ? Array.from(
            new Set(
              variant.options
                .flatMap((option) => String(option ?? "").split(/[,\n]/))
                .map((option) => option.trim())
                .filter(Boolean),
            ),
          )
        : [];

      if (!label || !options.length) {
        return null;
      }

      return {
        id: String(variant.id ?? `variant-${index}`).trim() || `variant-${index}`,
        label,
        options,
      };
    })
    .filter((variant): variant is ProductVariant => Boolean(variant));
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
let productVariantsColumnReady: boolean | null = null;
let productParentListingColumnReady: boolean | null = null;
let productBannerImagesColumnReady: boolean | null = null;
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

async function ensureProductVariantsColumn(): Promise<boolean> {
  if (productVariantsColumnReady !== null) {
    return productVariantsColumnReady;
  }

  try {
    await prisma.$executeRaw`
      ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS variants JSONB
    `;
    productVariantsColumnReady = true;
    productColumnExistsCache.set("variants", true);
  } catch (error) {
    productVariantsColumnReady = false;
    console.error("Could not ensure Product.variants column exists.", error);
  }

  return productVariantsColumnReady;
}

async function ensureProductParentListingColumn(): Promise<boolean> {
  if (productParentListingColumnReady !== null) {
    return productParentListingColumnReady;
  }

  try {
    await prisma.$executeRaw`
      ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "parentListingId" TEXT
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Product_parentListingId_idx"
      ON "Product"("parentListingId")
    `;
    productParentListingColumnReady = true;
    productColumnExistsCache.set("parentListingId", true);
  } catch (error) {
    productParentListingColumnReady = false;
    console.error("Could not ensure Product.parentListingId column exists.", error);
  }

  return productParentListingColumnReady;
}

async function ensureProductBannerImagesColumn(): Promise<boolean> {
  if (productBannerImagesColumnReady !== null) {
    return productBannerImagesColumnReady;
  }

  try {
    await prisma.$executeRaw`
      ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "bannerImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
    `;
    productBannerImagesColumnReady = true;
    productColumnExistsCache.set("bannerImages", true);
  } catch (error) {
    productBannerImagesColumnReady = false;
    console.error("Could not ensure Product.bannerImages column exists.", error);
  }

  return productBannerImagesColumnReady;
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
  await Promise.all([
    ensureProductVariantsColumn(),
    ensureProductParentListingColumn(),
    ensureProductBannerImagesColumn(),
  ]);
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
        COALESCE(p.variants, '[]'::jsonb) AS variants
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
        COALESCE(p.variants, '[]'::jsonb) AS variants
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
        COALESCE(p.variants, '[]'::jsonb) AS variants
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
      COALESCE(p.variants, '[]'::jsonb) AS variants
    FROM "Product" p
    WHERE p."isActive" = true
    ORDER BY p.name ASC
  `;
}

async function getPersistedProductRowById(
  productId: string,
): Promise<PersistedProductRow | null> {
  await Promise.all([
    ensureProductVariantsColumn(),
    ensureProductParentListingColumn(),
    ensureProductBannerImagesColumn(),
  ]);
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
        COALESCE(p.variants, '[]'::jsonb) AS variants
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
      COALESCE(p.variants, '[]'::jsonb) AS variants
    FROM "Product" p
    WHERE p.id = ${productId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getProductImageSourcesForCleanup({
  hasImagesColumn,
  hasProductImageTable,
  productId,
}: {
  hasImagesColumn: boolean;
  hasProductImageTable: boolean;
  productId: string;
}): Promise<string[]> {
  await ensureProductBannerImagesColumn();

  if (hasImagesColumn && hasProductImageTable) {
    const rows = await prisma.$queryRaw<ProductImageSourceRow[]>`
      SELECT unnest(
        COALESCE(p.images, ARRAY[]::text[]) ||
        COALESCE(p."bannerImages", ARRAY[]::text[]) ||
        COALESCE(
          (
            SELECT array_agg(pi.url ORDER BY pi.position)
            FROM "ProductImage" pi
            WHERE pi."productId" = p.id
          ),
          ARRAY[]::text[]
        )
      ) AS source
      FROM "Product" p
      WHERE p.id = ${productId}
    `;

    return Array.from(
      new Set(rows.map((row) => row.source?.trim()).filter(Boolean) as string[]),
    );
  }

  if (hasImagesColumn) {
    const rows = await prisma.$queryRaw<ProductImageSourceRow[]>`
      SELECT unnest(
        COALESCE(p.images, ARRAY[]::text[]) ||
        COALESCE(p."bannerImages", ARRAY[]::text[])
      ) AS source
      FROM "Product" p
      WHERE p.id = ${productId}
    `;

    return Array.from(
      new Set(rows.map((row) => row.source?.trim()).filter(Boolean) as string[]),
    );
  }

  if (hasProductImageTable) {
    const rows = await prisma.$queryRaw<ProductImageSourceRow[]>`
      SELECT pi.url AS source
      FROM "ProductImage" pi
      WHERE pi."productId" = ${productId}
      ORDER BY pi.position
    `;

    return Array.from(
      new Set(rows.map((row) => row.source?.trim()).filter(Boolean) as string[]),
    );
  }

  return [];
}

export async function getReferencedProductImageSources({
  excludeProductSlug,
}: {
  excludeProductSlug?: string;
} = {}): Promise<string[]> {
  await ensureProductBannerImagesColumn();

  const [hasImagesColumn, hasProductImageTable] = await Promise.all([
    productColumnExists("images"),
    databaseTableExists("ProductImage"),
  ]);

  const excludedSlug = excludeProductSlug?.trim();

  if (hasImagesColumn && hasProductImageTable) {
    const rows = excludedSlug
      ? await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT unnest(
            COALESCE(p.images, ARRAY[]::text[]) ||
            COALESCE(p."bannerImages", ARRAY[]::text[]) ||
            COALESCE(
              (
                SELECT array_agg(pi.url ORDER BY pi.position)
                FROM "ProductImage" pi
                WHERE pi."productId" = p.id
              ),
              ARRAY[]::text[]
            )
          ) AS source
          FROM "Product" p
          WHERE p.slug <> ${excludedSlug}
        `
      : await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT unnest(
            COALESCE(p.images, ARRAY[]::text[]) ||
            COALESCE(p."bannerImages", ARRAY[]::text[]) ||
            COALESCE(
              (
                SELECT array_agg(pi.url ORDER BY pi.position)
                FROM "ProductImage" pi
                WHERE pi."productId" = p.id
              ),
              ARRAY[]::text[]
            )
          ) AS source
          FROM "Product" p
        `;

    return Array.from(
      new Set(rows.map((row) => row.source?.trim()).filter(Boolean) as string[]),
    );
  }

  if (hasImagesColumn) {
    const rows = excludedSlug
      ? await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT unnest(
            COALESCE(p.images, ARRAY[]::text[]) ||
            COALESCE(p."bannerImages", ARRAY[]::text[])
          ) AS source
          FROM "Product" p
          WHERE p.slug <> ${excludedSlug}
        `
      : await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT unnest(
            COALESCE(p.images, ARRAY[]::text[]) ||
            COALESCE(p."bannerImages", ARRAY[]::text[])
          ) AS source
          FROM "Product" p
        `;

    return Array.from(
      new Set(rows.map((row) => row.source?.trim()).filter(Boolean) as string[]),
    );
  }

  if (hasProductImageTable) {
    const rows = excludedSlug
      ? await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT pi.url AS source
          FROM "ProductImage" pi
          JOIN "Product" p ON p.id = pi."productId"
          WHERE p.slug <> ${excludedSlug}
          ORDER BY pi.position
        `
      : await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT pi.url AS source
          FROM "ProductImage" pi
          ORDER BY pi.position
        `;

    return Array.from(
      new Set(rows.map((row) => row.source?.trim()).filter(Boolean) as string[]),
    );
  }

  return [];
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
    bannerImages: product.bannerImages ?? [],
    variants: toProductVariants(product.variants),
    rating: Number(product.rating),
    reviewCount: product.reviewCount,
    reviews: [],
    tags: product.tags ?? [],
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    relatedSlugs: product.relatedSlugs ?? [],
    stock: product.stock,
    amazonSellerSku: product.amazonSellerSku ?? undefined,
    amazonAsin: product.amazonAsin ?? undefined,
    amazonStoreUrl: product.amazonStoreUrl ?? undefined,
    amazonFulfillableQuantity: Number(product.amazonFulfillableQuantity ?? 0),
    amazonInventoryUpdatedAt:
      product.amazonInventoryUpdatedAt instanceof Date
        ? product.amazonInventoryUpdatedAt.toISOString()
        : product.amazonInventoryUpdatedAt ?? undefined,
    amazonMcfEnabled: Boolean(product.amazonMcfEnabled),
    careInstructions: product.careInstructions ?? undefined,
    shippingInfo: product.shippingInfo ?? undefined,
    parentListingId: product.parentListingId ?? undefined,
    listingVariations: [],
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

async function getAllCatalogProductsOrEmpty(): Promise<Product[]> {
  try {
    const rows = await getPersistedProductRows();
    return rows.map(dbProductToProduct);
  } catch (error) {
    console.error("Could not load persisted products from Neon.", error);
    return [];
  }
}

function withCombinedListingGroup(product: Product, products: Product[]): Product {
  const parentId = product.parentListingId ?? product.id;
  const parent = products.find((candidate) => candidate.id === parentId) ?? product;
  const group = products
    .filter(
      (candidate) =>
        candidate.id === parentId || candidate.parentListingId === parentId,
    )
    .sort((left, right) => {
      if (left.id === parentId) return -1;
      if (right.id === parentId) return 1;
      return left.name.localeCompare(right.name);
    });

  if (group.length <= 1) {
    return product;
  }

  return {
    ...product,
    shortDescription: parent.shortDescription,
    longDescription: parent.longDescription,
    careInstructions: parent.careInstructions,
    shippingInfo: parent.shippingInfo,
    listingParentSlug: parent.slug,
    listingVariations: group.map((variation) => ({
      id: variation.id,
      slug: variation.slug,
      name: variation.name,
      sku: variation.sku,
      amazonSellerSku: variation.amazonSellerSku,
      amazonAsin: variation.amazonAsin,
      images: variation.images,
      basePriceUsd: variation.basePriceUsd,
      stock: variation.stock,
    })),
  };
}

async function getCatalogProductsOrEmpty(): Promise<Product[]> {
  const products = await getAllCatalogProductsOrEmpty();

  return products
    .filter((product) => !product.parentListingId)
    .map((product) => withCombinedListingGroup(product, products));
}

async function getRelatedSlugsForCategory(
  productSlug: string,
  category: ProductCategory,
): Promise<string[]> {
  const hasIsActiveColumn = await ensureProductIsActiveColumn();
  const hasParentListingColumn = await ensureProductParentListingColumn();
  const parentListingFilter = hasParentListingColumn
    ? Prisma.sql`AND "parentListingId" IS NULL`
    : Prisma.empty;

  if (!hasIsActiveColumn) {
    const rows = await prisma.$queryRaw<Array<{ slug: string }>>`
      SELECT slug
      FROM "Product"
      WHERE category = ${category}
        AND slug <> ${productSlug}
        ${parentListingFilter}
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
      ${parentListingFilter}
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
  const products = await getAllCatalogProductsOrEmpty();

  return products
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      category: product.category,
      categoryPath: product.categoryPath,
      primaryImage: product.images[0] ?? null,
      parentListingId: product.parentListingId,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function moveAdminProductsToCategory({
  categoryId,
  productIds,
}: {
  categoryId: string;
  productIds: string[];
}): Promise<{ categoryPath: string[]; movedCount: number }> {
  const uniqueProductIds = Array.from(
    new Set(productIds.map((id) => id.trim()).filter(Boolean)),
  );

  if (!categoryId.trim() || !uniqueProductIds.length) {
    throw new Error("Select products and a destination category.");
  }

  const categories = await prisma.$queryRaw<
    Array<{ id: string; name: string; path: string }>
  >`
    SELECT id, name, path
    FROM "Category"
    WHERE id = ${categoryId}
    LIMIT 1
  `;
  const destination = categories[0];

  if (!destination) {
    throw new Error("Destination category not found.");
  }

  const categoryPath = destination.path
    .split(" > ")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const topCategory = categoryPath[0] ?? destination.name;
  const now = new Date();
  const [hasCategoryIdColumn, hasIsActiveColumn] = await Promise.all([
    productColumnExists("categoryId"),
    productColumnExists("isActive"),
  ]);
  let movedCount: number;

  if (hasCategoryIdColumn && hasIsActiveColumn) {
    movedCount = await prisma.$executeRaw`
      UPDATE "Product"
      SET
        category = ${topCategory},
        "categoryPath" = ${categoryPath},
        "categoryId" = ${destination.id},
        "updatedAt" = ${now}
      WHERE id IN (${Prisma.join(uniqueProductIds)})
        AND "isActive" = true
    `;
  } else if (hasCategoryIdColumn) {
    movedCount = await prisma.$executeRaw`
      UPDATE "Product"
      SET
        category = ${topCategory},
        "categoryPath" = ${categoryPath},
        "categoryId" = ${destination.id},
        "updatedAt" = ${now}
      WHERE id IN (${Prisma.join(uniqueProductIds)})
    `;
  } else if (hasIsActiveColumn) {
    movedCount = await prisma.$executeRaw`
      UPDATE "Product"
      SET
        category = ${topCategory},
        "categoryPath" = ${categoryPath},
        "updatedAt" = ${now}
      WHERE id IN (${Prisma.join(uniqueProductIds)})
        AND "isActive" = true
    `;
  } else {
    movedCount = await prisma.$executeRaw`
      UPDATE "Product"
      SET
        category = ${topCategory},
        "categoryPath" = ${categoryPath},
        "updatedAt" = ${now}
      WHERE id IN (${Prisma.join(uniqueProductIds)})
    `;
  }

  return { categoryPath, movedCount };
}

export async function combineAdminProductListings({
  parentProductId,
  childProductIds,
}: {
  parentProductId: string;
  childProductIds: string[];
}): Promise<{ parentName: string; combinedCount: number }> {
  const normalizedParentId = parentProductId.trim();
  const uniqueChildIds = Array.from(
    new Set(
      childProductIds
        .map((id) => id.trim())
        .filter((id) => id && id !== normalizedParentId),
    ),
  );

  if (!normalizedParentId || !uniqueChildIds.length) {
    throw new Error("Select at least one listing to combine with the parent.");
  }

  if (!(await ensureProductParentListingColumn())) {
    throw new Error("Combined listing storage is not available.");
  }
  await ensureProductIsActiveColumn();

  const parentRows = await prisma.$queryRaw<ProductListingMatch[]>`
    SELECT
      id,
      name,
      "parentListingId",
      "shortDescription",
      "longDescription",
      "careInstructions",
      "shippingInfo"
    FROM "Product"
    WHERE id = ${normalizedParentId}
      AND "isActive" = true
    LIMIT 1
  `;
  const parent = parentRows[0];

  if (!parent) {
    throw new Error("Parent listing not found.");
  }
  if (parent.parentListingId) {
    throw new Error("A child variation cannot also be used as a parent listing.");
  }

  const childRows = await prisma.$queryRaw<ProductListingMatch[]>`
    SELECT
      id,
      name,
      "parentListingId",
      "shortDescription",
      "longDescription",
      "careInstructions",
      "shippingInfo"
    FROM "Product"
    WHERE id IN (${Prisma.join(uniqueChildIds)})
      AND "isActive" = true
  `;

  if (childRows.length !== uniqueChildIds.length) {
    throw new Error("One or more selected listings could not be found.");
  }
  if (childRows.some((child) => child.parentListingId)) {
    throw new Error("Remove selected listings from their current parent before combining them.");
  }

  const nestedRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Product"
    WHERE "parentListingId" IN (${Prisma.join(uniqueChildIds)})
    LIMIT 1
  `;
  if (nestedRows.length) {
    throw new Error("A parent listing cannot be nested under another parent.");
  }

  const now = new Date();
  const combinedCount = await prisma.$executeRaw`
    UPDATE "Product"
    SET
      "parentListingId" = ${parent.id},
      "shortDescription" = ${parent.shortDescription},
      "longDescription" = ${parent.longDescription},
      "careInstructions" = ${parent.careInstructions},
      "shippingInfo" = ${parent.shippingInfo},
      "updatedAt" = ${now}
    WHERE id IN (${Prisma.join(uniqueChildIds)})
  `;

  return { parentName: parent.name, combinedCount };
}

export async function uncombineAdminProductListings({
  parentProductId,
  childProductIds,
}: {
  parentProductId: string;
  childProductIds: string[];
}): Promise<number> {
  const normalizedParentId = parentProductId.trim();
  const uniqueChildIds = Array.from(
    new Set(childProductIds.map((id) => id.trim()).filter(Boolean)),
  );

  if (!normalizedParentId || !uniqueChildIds.length) {
    throw new Error("Select at least one child listing to separate.");
  }
  if (!(await ensureProductParentListingColumn())) {
    throw new Error("Combined listing storage is not available.");
  }

  return prisma.$executeRaw`
    UPDATE "Product"
    SET
      "parentListingId" = NULL,
      "updatedAt" = ${new Date()}
    WHERE id IN (${Prisma.join(uniqueChildIds)})
      AND "parentListingId" = ${normalizedParentId}
  `;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getAllCatalogProductsOrEmpty();
  const product = findProductBySlug(products, slug);
  return product ? withCombinedListingGroup(product, products) : undefined;
}

export async function getRelatedProducts(slug: string): Promise<Product[]> {
  const allProducts = await getAllCatalogProductsOrEmpty();
  const publicProducts = allProducts.filter((product) => !product.parentListingId);
  const product = findProductBySlug(allProducts, slug);

  if (!product) {
    return [];
  }

  return product.relatedSlugs
    .map((relatedSlug) => findProductBySlug(publicProducts, relatedSlug))
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
  const bannerImages = input.bannerImages
    .map((image) => image.trim())
    .filter(Boolean);
  const variantsJson = JSON.stringify(toProductVariants(input.variants));
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
  await Promise.all([
    ensureProductVariantsColumn(),
    ensureProductParentListingColumn(),
    ensureProductBannerImagesColumn(),
  ]);
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
  const amazonFulfillableQuantity = Number.isFinite(input.amazonFulfillableQuantity)
    ? Math.max(0, Math.floor(input.amazonFulfillableQuantity as number))
    : 0;
  const amazonInventoryUpdatedAt =
    input.amazonInventoryUpdatedAt && !Number.isNaN(Date.parse(input.amazonInventoryUpdatedAt))
      ? new Date(input.amazonInventoryUpdatedAt)
      : null;
  const amazonAsin = normalizeAmazonAsin(input.amazonAsin);
  const amazonStoreUrl =
    buildAmazonListingUrl(amazonAsin) ?? (input.amazonStoreUrl?.trim() || null);

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
          "bannerImages" = ${bannerImages},
          variants = ${variantsJson}::jsonb,
          tags = ${tags},
          "isBestSeller" = ${input.isBestSeller},
          "isNewArrival" = ${input.isNewArrival},
          "relatedSlugs" = ${relatedSlugs},
          stock = ${Math.floor(input.stock)},
          "amazonSellerSku" = ${input.amazonSellerSku?.trim() || null},
          "amazonAsin" = ${amazonAsin},
          "amazonStoreUrl" = ${amazonStoreUrl},
          "amazonFulfillableQuantity" = ${amazonFulfillableQuantity},
          "amazonInventoryUpdatedAt" = ${amazonInventoryUpdatedAt},
          "amazonMcfEnabled" = ${Boolean(input.amazonMcfEnabled)},
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
          "bannerImages",
          variants,
          rating,
          "reviewCount",
          tags,
          "isBestSeller",
          "isNewArrival",
          "relatedSlugs",
          stock,
          "amazonSellerSku",
          "amazonAsin",
          "amazonStoreUrl",
          "amazonFulfillableQuantity",
          "amazonInventoryUpdatedAt",
          "amazonMcfEnabled",
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
          ${bannerImages},
          ${variantsJson}::jsonb,
          ${0},
          ${0},
          ${tags},
          ${input.isBestSeller},
          ${input.isNewArrival},
          ${relatedSlugs},
          ${Math.floor(input.stock)},
          ${input.amazonSellerSku?.trim() || null},
          ${amazonAsin},
          ${amazonStoreUrl},
          ${amazonFulfillableQuantity},
          ${amazonInventoryUpdatedAt},
          ${Boolean(input.amazonMcfEnabled)},
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

    if (existingProduct) {
      await transaction.$executeRaw`
        UPDATE "Product" child
        SET
          "shortDescription" = parent."shortDescription",
          "longDescription" = parent."longDescription",
          "careInstructions" = parent."careInstructions",
          "shippingInfo" = parent."shippingInfo",
          "updatedAt" = ${now}
        FROM "Product" parent
        WHERE child.id = ${productId}
          AND child."parentListingId" = parent.id
      `;

      await transaction.$executeRaw`
        UPDATE "Product"
        SET
          "shortDescription" = ${input.shortDescription.trim()},
          "longDescription" = ${input.longDescription.trim()},
          "careInstructions" = ${input.careInstructions?.trim() || null},
          "shippingInfo" = ${shippingInfo},
          "updatedAt" = ${now}
        WHERE "parentListingId" = ${productId}
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
  imageSources: string[];
}> {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    throw new Error("Product slug is required.");
  }

  const hasIsActiveColumn = await ensureProductIsActiveColumn();
  const hasParentListingColumn = await ensureProductParentListingColumn();
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
    hasImagesColumn,
  ] = await Promise.all([
    databaseTableExists("OrderItem"),
    databaseTableExists("CartItem"),
    databaseTableExists("WishlistItem"),
    databaseTableExists("ProductRelation"),
    databaseTableExists("ProductImage"),
    databaseTableExists("ProductVariant"),
    productColumnExists("relatedSlugs"),
    productColumnExists("images"),
  ]);
  const imageSources = await getProductImageSourcesForCleanup({
    hasImagesColumn,
    hasProductImageTable,
    productId: product.id,
  });
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
      if (hasParentListingColumn) {
        await transaction.$executeRaw`
          UPDATE "Product"
          SET "parentListingId" = NULL
          WHERE "parentListingId" = ${product.id}
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
      if (hasRelatedSlugsColumn) {
        await transaction.$executeRaw`
          UPDATE "Product"
          SET "relatedSlugs" = ARRAY[]::text[]
          WHERE id = ${product.id}
        `;
      }
      if (hasProductImageTable) {
        await transaction.$executeRaw`
          DELETE FROM "ProductImage"
          WHERE "productId" = ${product.id}
        `;
      }
      if (hasImagesColumn) {
        await transaction.$executeRaw`
          UPDATE "Product"
          SET
            "isActive" = false,
            slug = ${removedSlug},
            sku = ${removedSku},
            images = ARRAY[]::text[],
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
      imageSources,
    };
  }

  await prisma.$transaction(async (transaction) => {
    if (hasParentListingColumn) {
      await transaction.$executeRaw`
        UPDATE "Product"
        SET "parentListingId" = NULL
        WHERE "parentListingId" = ${product.id}
      `;
    }
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
    imageSources,
  };
}
