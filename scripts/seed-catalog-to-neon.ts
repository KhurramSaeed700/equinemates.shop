import { CATEGORIES, PRODUCTS } from "../lib/catalog";
import { prisma } from "../lib/prisma";

type SeedCategoryNode = {
  name: string;
  children: SeedCategoryNode[];
};

type CategorySeedRow = {
  id: string;
  name: string;
  slug: string;
  level: number;
  path: string;
  parentId: string | null;
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\/+/g, " ")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collectCategoryRows(
  nodes: SeedCategoryNode[],
  basePath: string[] = [],
): CategorySeedRow[] {
  const rows: CategorySeedRow[] = [];

  for (const node of nodes) {
    const pathSegments = [...basePath, node.name.trim()];
    const id = normalizeSlug(pathSegments.join("-"));

    rows.push({
      id,
      name: node.name.trim(),
      slug: id,
      level: pathSegments.length - 1,
      path: pathSegments.join(" > "),
      parentId:
        pathSegments.length > 1
          ? normalizeSlug(pathSegments.slice(0, -1).join("-"))
          : null,
    });

    if (node.children.length > 0) {
      rows.push(...collectCategoryRows(node.children, pathSegments));
    }
  }

  return rows;
}

async function ensureCategoryTableExists() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "level" INTEGER NOT NULL,
      "path" TEXT NOT NULL,
      "parentId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Category_level_idx" ON "Category"("level")
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Category_parentId_fkey'
      ) THEN
        ALTER TABLE "Category"
        ADD CONSTRAINT "Category_parentId_fkey"
        FOREIGN KEY ("parentId") REFERENCES "Category"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
}

async function seedCategories(rows: CategorySeedRow[]) {
  for (const row of rows) {
    await prisma.$executeRaw`
      INSERT INTO "Category" (
        id,
        name,
        slug,
        level,
        path,
        "parentId"
      )
      VALUES (
        ${row.id},
        ${row.name},
        ${row.slug},
        ${row.level},
        ${row.path},
        ${row.parentId}
      )
      ON CONFLICT (slug) DO UPDATE
      SET
        name = EXCLUDED.name,
        level = EXCLUDED.level,
        path = EXCLUDED.path,
        "parentId" = EXCLUDED."parentId",
        "updatedAt" = CURRENT_TIMESTAMP
    `;
  }
}

async function seedProducts() {
  const existingProducts = await prisma.$queryRaw<Array<{ id: string; sku: string }>>`
    SELECT id, sku
    FROM "Product"
  `;
  const existingBySku = new Map(
    existingProducts.map((product) => [product.sku.trim().toUpperCase(), product.id]),
  );

  for (const product of PRODUCTS) {
    const productId = existingBySku.get(product.sku.trim().toUpperCase()) ?? product.id;

    await prisma.$executeRaw`
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
        ${product.slug},
        ${product.sku},
        ${product.name},
        ${product.category},
        ${product.categoryPath},
        ${product.shortDescription},
        ${product.longDescription},
        ${product.basePriceUsd},
        ${product.basePricePkr},
        ${product.compareAtPricePkr ?? null},
        ${product.rating},
        ${product.reviewCount},
        ${product.tags},
        ${product.isBestSeller},
        ${product.isNewArrival},
        ${product.relatedSlugs},
        ${product.stock},
        ${product.careInstructions ?? null},
        ${product.shippingInfo ?? null},
        ${new Date()},
        ${new Date()}
      )
      ON CONFLICT (sku) DO UPDATE
      SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        "categoryPath" = EXCLUDED."categoryPath",
        "shortDescription" = EXCLUDED."shortDescription",
        "longDescription" = EXCLUDED."longDescription",
        "basePriceUsd" = EXCLUDED."basePriceUsd",
        "basePricePkr" = EXCLUDED."basePricePkr",
        "compareAtPricePkr" = EXCLUDED."compareAtPricePkr",
        rating = EXCLUDED.rating,
        "reviewCount" = EXCLUDED."reviewCount",
        tags = EXCLUDED.tags,
        "isBestSeller" = EXCLUDED."isBestSeller",
        "isNewArrival" = EXCLUDED."isNewArrival",
        "relatedSlugs" = EXCLUDED."relatedSlugs",
        stock = EXCLUDED.stock,
        "careInstructions" = EXCLUDED."careInstructions",
        "shippingInfo" = EXCLUDED."shippingInfo",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    await prisma.$executeRaw`
      DELETE FROM "ProductImage"
      WHERE "productId" = ${productId}
    `;

    for (const [index, image] of product.images.entries()) {
      await prisma.$executeRaw`
        INSERT INTO "ProductImage" ("id", "productId", "url", "position")
        VALUES (${`${productId}-image-${index + 1}`}, ${productId}, ${image}, ${index})
      `;
    }
  }
}

async function getCounts() {
  const [categoryCountRows, productCountRows, imageCountRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM "Category"
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM "Product"
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM "ProductImage"
    `,
  ]);

  return {
    categories: Number(categoryCountRows[0]?.count ?? 0),
    products: Number(productCountRows[0]?.count ?? 0),
    images: Number(imageCountRows[0]?.count ?? 0),
  };
}

async function main() {
  await ensureCategoryTableExists();
  await seedCategories(collectCategoryRows(CATEGORIES as SeedCategoryNode[]));
  await seedProducts();

  const counts = await getCounts();
  console.log(
    JSON.stringify(
      {
        message: "Catalog seed completed.",
        ...counts,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Catalog seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
