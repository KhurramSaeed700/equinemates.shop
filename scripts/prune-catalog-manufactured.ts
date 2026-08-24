import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import { config } from "dotenv";

import { deleteAdminProduct, getReferencedProductImageSources } from "@/lib/server/catalog-products";
import { deleteImagesFromR2 } from "@/lib/server/r2";
import { prisma } from "@/lib/prisma";

config({ path: ".env" });
config({ path: ".env.local", override: true });

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  level: number;
  path: string;
  parentId: string | null;
};

type ProductRow = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  isActive: boolean;
  categoryId: string | null;
  categoryPath: string;
};

const KEEP_LEAF_PATHS = [
  ["Horse", "Horse Wear & Protection", "Turnout Blankets"],
  ["Horse", "Horse Wear & Protection", "Stable Blankets"],
  ["Horse", "Horse Wear & Protection", "Fly Sheets"],
  ["Horse", "Horse Boots & Leg Protection", "Bell Boots"],
  ["Horse", "Horse Boots & Leg Protection", "Hoof Boots"],
  ["Horse", "Bits & Tack", "English Bits"],
  ["Horse", "Bits & Tack", "Western Bits"],
  ["Horse", "Bits & Tack", "German Silver Bits"],
  ["Horse", "Bits & Tack", "Specialty Bits"],
  ["Horse", "Bridles", "English Bridles"],
  ["Horse", "Bridles", "Western Bridles"],
  ["Horse", "Bridles", "Bitless Bridles"],
  ["Horse", "Bridles", "Reins"],
  ["Horse", "Bridles", "Curb Straps & Accessories"],
  ["Horse", "Saddles & Pads", "Saddle Pads"],
  ["Horse", "Girths & Cinches", "English Girths"],
  ["Horse", "Girths & Cinches", "Dressage Girths"],
  ["Horse", "Halters & Leads", "Leather Halters"],
  ["Horse", "Training Equipment", "Martingales"],
  ["Horse", "Trail & Outdoor Gear", "Saddle Bags"],
  ["Horse", "Fly & Pest Control", "Fly Masks"],
  ["Horse", "Fly & Pest Control", "Fly Boots"],
  ["Horse", "Fly & Pest Control", "Fly Rugs"],
  ["Horse", "Fly & Pest Control", "Fly Hoods"],
  ["Rider", "Riding Chaps", "Half Chaps"],
  ["Rider", "Riding Chaps", "Full Chaps"],
  ["Rider", "Riding Apparel", "Riding Gloves"],
  ["Rider", "Riding Apparel", "English Belts"],
  ["Rider", "Spurs & Accessories", "English Spurs"],
  ["Rider", "Spurs & Accessories", "Western Spurs"],
  ["Rider", "Spurs & Accessories", "Spur Straps"],
  ["Pet", "Dog Products", "Dog Coats & Jackets"],
  ["Pet", "Dog Products", "Dog Collars & Leashes"],
  ["Pet", "Cat Products", "Cat Collars"],
  ["Stable", "Feeding Equipment", "Hay Bags & Feeders"],
  ["Stable", "Farrier Tools", "Hoof Nippers"],
  ["Stable", "Farrier Tools", "Hoof Rasps"],
  ["Stable", "Farrier Tools", "Clinchers"],
  ["Stable", "Farrier Tools", "Hoof Knives"],
  ["Stable", "Farrier Tools", "Driving Hammers"],
  ["Stable", "Hardware & Knives", "Tack Hardware"],
  ["Stable", "Hardware & Knives", "Stainless Hardware"],
  ["Stable", "Hardware & Knives", "Brass Hardware"],
  ["Stable", "Hardware & Knives", "Damascus Knives"],
  ["Stable", "Hardware & Knives", "Leather Cutting Tools"],
  ["Health & Care", "Grooming & Bathing", "Clippers"],
  ["Health & Care", "Veterinary Instruments", "Castration Instruments", "Castration Forceps"],
  ["Health & Care", "Veterinary Instruments", "Castration Instruments", "Burdizzo Castrators"],
  ["Health & Care", "Veterinary Instruments", "Castration Instruments", "Emasculators"],
  ["Health & Care", "Veterinary Instruments", "Balling Guns", "Stainless Balling Guns"],
  ["Health & Care", "Veterinary Instruments", "Restraining Equipment", "Nose Tongs"],
  ["Health & Care", "Veterinary Instruments", "Restraining Equipment", "Bull Holders"],
  ["Health & Care", "Veterinary Instruments", "Restraining Equipment", "Animal Restraining Tools"],
  ["Health & Care", "Veterinary Instruments", "Hoof & Claw Tools", "Hoof Knives (Vet Grade)"],
  ["Health & Care", "Veterinary Instruments", "Hoof & Claw Tools", "Hoof Testers"],
  ["Health & Care", "Veterinary Instruments", "Hoof & Claw Tools", "Claw Cutters"],
  ["Health & Care", "Veterinary Instruments", "Pig Holders"],
  ["Health & Care", "Veterinary Instruments", "Ear Tagging Instruments", "Ear Tag Applicators"],
  ["Health & Care", "Veterinary Instruments", "Ear Tagging Instruments", "Ear Tag Removal Tools"],
  ["Health & Care", "Veterinary Instruments", "Obstetric Instruments", "OB Chains"],
  ["Health & Care", "Veterinary Instruments", "Obstetric Instruments", "OB Handles"],
  ["Health & Care", "Veterinary Instruments", "Obstetric Instruments", "OB Hooks"],
  ["Health & Care", "Veterinary Instruments", "MISC Veterinary", "Surgical Scissors"],
  ["Health & Care", "Veterinary Instruments", "MISC Veterinary", "Bandage Scissors"],
  ["Health & Care", "Veterinary Instruments", "MISC Veterinary", "Needle Holders"],
  ["Health & Care", "Veterinary Instruments", "MISC Veterinary", "Forceps"],
  ["Health & Care", "Veterinary Instruments", "MISC Veterinary", "Dehorners"],
  ["Health & Care", "Veterinary Instruments", "MISC Veterinary", "Uterine Pumps"],
] as const;

const FALLBACK_ARCHIVE_PATH = ["Horse", "Bits & Tack", "English Bits"];

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(path: readonly string[]) {
  return path.map((part) => normalizeName(part).toLowerCase()).join(" > ");
}

function splitPath(path: string) {
  return path.split(" > ").map(normalizeName).filter(Boolean);
}

function slugForPath(path: readonly string[]) {
  return path
    .join("-")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\/+/g, " ")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getKeepPrefixKeys() {
  const keys = new Set<string>();

  for (const path of KEEP_LEAF_PATHS) {
    for (let index = 1; index <= path.length; index += 1) {
      keys.add(normalizeKey(path.slice(0, index)));
    }
  }

  return keys;
}

async function productColumnExists(columnName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Product'
        AND column_name = ${columnName}
    ) AS "exists"
  `;

  return Boolean(rows[0]?.exists);
}

async function databaseTableExists(tableName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ${tableName}
    ) AS "exists"
  `;

  return Boolean(rows[0]?.exists);
}

async function getProductColumnFlags() {
  const [category, categoryId, categoryPath, isActive] = await Promise.all([
    productColumnExists("category"),
    productColumnExists("categoryId"),
    productColumnExists("categoryPath"),
    productColumnExists("isActive"),
  ]);

  return {
    category,
    categoryId,
    categoryPath,
    isActive,
  };
}

async function loadCategories() {
  return prisma.category.findMany({
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
}

async function loadProducts() {
  const flags = await getProductColumnFlags();

  if (!flags.categoryPath && !flags.category) {
    throw new Error("Product table must have categoryPath or category columns.");
  }

  const isActiveExpression = flags.isActive ? 'p."isActive"' : "true";
  const categoryIdExpression = flags.categoryId ? 'p."categoryId"' : "NULL";
  const categoryPathExpression = flags.categoryPath
    ? `array_to_string(p."categoryPath", ' > ')`
    : "p.category";
  const categoryJoin = flags.categoryId
    ? 'LEFT JOIN "Category" c ON c.id = p."categoryId"'
    : "";
  const resolvedPathExpression = flags.categoryId
    ? `COALESCE(c.path, ${categoryPathExpression})`
    : categoryPathExpression;

  return prisma.$queryRawUnsafe<ProductRow[]>(`
    SELECT
      p.id,
      p.slug,
      p.sku,
      p.name,
      COALESCE(${isActiveExpression}, true) AS "isActive",
      ${categoryIdExpression} AS "categoryId",
      ${resolvedPathExpression} AS "categoryPath"
    FROM "Product" p
    ${categoryJoin}
    ORDER BY "categoryPath" ASC, p.name ASC
  `);
}

async function ensureCategoryPath(path: readonly string[], dryRun: boolean) {
  let categories = await loadCategories();
  let parentId: string | null = null;
  const builtPath: string[] = [];

  for (const segment of path) {
    builtPath.push(segment);
    const key = normalizeKey(builtPath);
    const existing = categories.find((category) => normalizeKey(splitPath(category.path)) === key);

    if (existing) {
      parentId = existing.id;
      continue;
    }

    const row: CategoryRow = {
      id: randomUUID(),
      name: segment,
      slug: slugForPath(builtPath),
      level: builtPath.length - 1,
      path: builtPath.join(" > "),
      parentId,
    };

    if (dryRun) {
      categories.push(row);
      parentId = row.id;
      continue;
    }

    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO "Category" (
        id,
        name,
        slug,
        level,
        path,
        "parentId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${row.id},
        ${row.name},
        ${row.slug},
        ${row.level},
        ${row.path},
        ${row.parentId},
        ${now},
        ${now}
      )
    `;

    categories = await loadCategories();
    parentId = row.id;
  }
}

async function moveInactiveProductsFromRemovedCategories({
  dryRun,
  fallbackCategory,
  keepLeafKeys,
}: {
  dryRun: boolean;
  fallbackCategory: CategoryRow;
  keepLeafKeys: Set<string>;
}) {
  const inactiveProducts = (await loadProducts()).filter((product) => {
    return !product.isActive && !keepLeafKeys.has(normalizeKey(splitPath(product.categoryPath)));
  });

  if (dryRun || inactiveProducts.length === 0) {
    return inactiveProducts.length;
  }

  const hasCategoryColumn = await productColumnExists("category");
  const hasCategoryPathColumn = await productColumnExists("categoryPath");
  const hasCategoryIdColumn = await productColumnExists("categoryId");
  const fallbackPath = splitPath(fallbackCategory.path);
  const fallbackRoot = fallbackPath[0] ?? fallbackCategory.name;

  for (const product of inactiveProducts) {
    if (hasCategoryIdColumn && hasCategoryColumn && hasCategoryPathColumn) {
      await prisma.$executeRaw`
        UPDATE "Product"
        SET
          "categoryId" = ${fallbackCategory.id},
          category = ${fallbackRoot},
          "categoryPath" = ${fallbackPath},
          "updatedAt" = ${new Date()}
        WHERE id = ${product.id}
      `;
      continue;
    }

    if (hasCategoryColumn && hasCategoryPathColumn) {
      await prisma.$executeRaw`
        UPDATE "Product"
        SET
          category = ${fallbackRoot},
          "categoryPath" = ${fallbackPath},
          "updatedAt" = ${new Date()}
        WHERE id = ${product.id}
      `;
      continue;
    }

    if (hasCategoryIdColumn) {
      await prisma.$executeRaw`
        UPDATE "Product"
        SET
          "categoryId" = ${fallbackCategory.id},
          "updatedAt" = ${new Date()}
        WHERE id = ${product.id}
      `;
    }
  }

  return inactiveProducts.length;
}

async function writeRemovalBackup({
  productsToRemove,
  categoriesToRemove,
}: {
  productsToRemove: ProductRow[];
  categoriesToRemove: CategoryRow[];
}) {
  const productIds = productsToRemove.map((product) => product.id);
  const categoryIds = categoriesToRemove.map((category) => category.id);
  const hasProductImageTable = await databaseTableExists("ProductImage");
  const productRows = productIds.length > 0
    ? await prisma.$queryRawUnsafe<unknown[]>(
        `SELECT * FROM "Product" WHERE id = ANY($1) ORDER BY name`,
        productIds,
      )
    : [];
  const productImageRows = productIds.length > 0 && hasProductImageTable
    ? await prisma.$queryRawUnsafe(
        `SELECT * FROM "ProductImage" WHERE "productId" = ANY($1) ORDER BY "productId", position`,
        productIds,
      )
    : [];

  const backup = {
    createdAt: new Date().toISOString(),
    products: productRows,
    productImages: productImageRows,
    categories: categoriesToRemove,
  };
  const filename = `prune-catalog-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

  await writeFile(filename, JSON.stringify(backup, null, 2));

  return {
    filename,
    products: productRows.length,
    productImages: Array.isArray(productImageRows) ? productImageRows.length : 0,
    categories: categoryIds.length,
  };
}

async function main() {
  const verify = process.argv.includes("--verify");
  const apply = process.argv.includes("--apply");
  const deleteR2 = process.argv.includes("--delete-r2");
  const dryRun = !apply;
  const keepLeafKeys = new Set(KEEP_LEAF_PATHS.map((path) => normalizeKey(path)));
  const keepPrefixKeys = getKeepPrefixKeys();

  if (verify) {
    const categories = await loadCategories();
    const products = await loadProducts();
    const categoryPaths = categories.map((category) => category.path);
    const activeProducts = products.filter((product) => product.isActive);
    const productsOutsideKeepList = activeProducts.filter((product) => {
      return !keepLeafKeys.has(normalizeKey(splitPath(product.categoryPath)));
    });
    const productCountsByPath = activeProducts.reduce<Record<string, number>>((counts, product) => {
      counts[product.categoryPath] = (counts[product.categoryPath] ?? 0) + 1;
      return counts;
    }, {});

    console.log(JSON.stringify({
      activeProductCount: activeProducts.length,
      categoryCount: categories.length,
      hasSaddleBags: categoryPaths.includes("Horse > Trail & Outdoor Gear > Saddle Bags"),
      hasTrailBoots: categoryPaths.some((path) => path.toLowerCase().includes("trail boots")),
      productsOutsideKeepList: productsOutsideKeepList.length,
      productCountsByPath,
      remainingPaths: categoryPaths,
    }, null, 2));
    return;
  }

  for (const path of KEEP_LEAF_PATHS) {
    await ensureCategoryPath(path, dryRun);
  }

  const categories = await loadCategories();
  const products = await loadProducts();
  const productFlags = await getProductColumnFlags();
  const fallbackCategory = categories.find(
    (category) => normalizeKey(splitPath(category.path)) === normalizeKey(FALLBACK_ARCHIVE_PATH),
  );

  if (!fallbackCategory) {
    throw new Error(`Fallback category missing: ${FALLBACK_ARCHIVE_PATH.join(" > ")}`);
  }

  const productsToRemove = products.filter(
    (product) => product.isActive && !keepLeafKeys.has(normalizeKey(splitPath(product.categoryPath))),
  );
  const categoriesToRemove = categories
    .filter((category) => !keepPrefixKeys.has(normalizeKey(splitPath(category.path))))
    .sort((left, right) => right.level - left.level || right.path.localeCompare(left.path));

  console.log(JSON.stringify({
    mode: dryRun ? "dry-run" : "apply",
    deleteR2,
    keepLeafCount: keepLeafKeys.size,
    productsToRemove: productsToRemove.length,
    categoriesToRemove: categoriesToRemove.length,
    categoriesToAddOrKeep: KEEP_LEAF_PATHS.map((path) => path.join(" > ")),
    firstProductsToRemove: productsToRemove.slice(0, 25).map((product) => ({
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      categoryPath: product.categoryPath,
    })),
    firstCategoriesToRemove: categoriesToRemove.slice(0, 50).map((category) => category.path),
  }, null, 2));

  if (dryRun) {
    return;
  }

  const backup = await writeRemovalBackup({ productsToRemove, categoriesToRemove });
  console.log(JSON.stringify({ backup }, null, 2));

  const imageSources: string[] = [];
  let deletedCount = 0;
  let deactivatedCount = 0;

  for (const product of productsToRemove) {
    const result = await deleteAdminProduct(product.slug);
    imageSources.push(...result.imageSources);
    if (result.deleted) {
      deletedCount += 1;
    }
    if (result.deactivated) {
      deactivatedCount += 1;
    }
    console.log(`${result.deleted ? "deleted" : "deactivated"} product: ${product.sku} ${result.name}`);
  }

  const movedInactiveCount = await moveInactiveProductsFromRemovedCategories({
    dryRun,
    fallbackCategory,
    keepLeafKeys,
  });

  let deletedCategoryCount = 0;
  for (const category of categoriesToRemove) {
    try {
      if (productFlags.categoryId) {
        await prisma.category.delete({ where: { id: category.id } });
      } else {
        await prisma.$executeRaw`
          DELETE FROM "Category"
          WHERE id = ${category.id}
        `;
      }
      deletedCategoryCount += 1;
      console.log(`deleted category: ${category.path}`);
    } catch (error) {
      console.warn(`could not delete category ${category.path}:`, error);
    }
  }

  let r2DeletedCount = 0;
  let r2FailedCount = 0;
  let r2SkippedSharedCount = 0;
  if (deleteR2 && imageSources.length > 0) {
    const protectedSources = await getReferencedProductImageSources();
    const cleanup = await deleteImagesFromR2(imageSources, { protectedSources });
    r2DeletedCount = cleanup.deletedKeys.length;
    r2FailedCount = cleanup.failed.length;
    r2SkippedSharedCount = cleanup.skippedSharedKeys.length;
  }

  console.log(JSON.stringify({
    completed: true,
    deletedCount,
    deactivatedCount,
    movedInactiveCount,
    deletedCategoryCount,
    imageSourcesRemovedFromDatabase: imageSources.length,
    r2DeletedCount,
    r2FailedCount,
    r2SkippedSharedCount,
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
