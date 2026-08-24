import { readFile } from "node:fs/promises";
import { config } from "dotenv";

import { prisma } from "@/lib/prisma";

config({ path: ".env" });
config({ path: ".env.local", override: true });

type BackupCategory = {
  id: string;
  name: string;
  slug: string;
  level: number;
  path: string;
  parentId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type BackupProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: string;
  categoryPath: string[];
  shortDescription: string;
  longDescription: string;
  basePriceUsd: string | number;
  basePricePkr: string | number;
  compareAtPricePkr: string | number | null;
  rating: string | number;
  reviewCount: number;
  tags: string[] | null;
  isBestSeller: boolean;
  isNewArrival: boolean;
  relatedSlugs: string[] | null;
  stock: number;
  careInstructions: string | null;
  shippingInfo: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  variants: unknown;
};

type BackupProductImage = {
  id: string;
  productId: string;
  url: string;
  position: number;
  createdAt: string;
};

type BackupFile = {
  products: BackupProduct[];
  productImages: BackupProductImage[];
  categories: BackupCategory[];
};

const BACKUP_PATH = "prune-catalog-backup-2026-06-26T09-48-43-695Z.json";

const RESTORE_LEAF_PATHS = [
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

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(path: readonly string[]) {
  return path.map((part) => normalizeName(part).toLowerCase()).join(" > ");
}

function splitPath(path: string) {
  return path.split(" > ").map(normalizeName).filter(Boolean);
}

function dateOrNow(value: string | undefined) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getRestorePrefixKeys() {
  const keys = new Set<string>();

  for (const path of RESTORE_LEAF_PATHS) {
    for (let index = 1; index <= path.length; index += 1) {
      keys.add(normalizeKey(path.slice(0, index)));
    }
  }

  return keys;
}

async function loadBackup() {
  return JSON.parse(await readFile(BACKUP_PATH, "utf8")) as BackupFile;
}

async function categoryPathExists(path: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM "Category" WHERE path = ${path}
    ) AS "exists"
  `;

  return Boolean(rows[0]?.exists);
}

async function productExists(productId: string, slug: string, sku: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM "Product"
      WHERE id = ${productId}
        OR slug = ${slug}
        OR sku = ${sku}
    ) AS "exists"
  `;

  return Boolean(rows[0]?.exists);
}

async function imageExists(imageId: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM "ProductImage" WHERE id = ${imageId}
    ) AS "exists"
  `;

  return Boolean(rows[0]?.exists);
}

async function restoreCategory(category: BackupCategory, parentId: string | null) {
  if (await categoryPathExists(category.path)) {
    return false;
  }

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
      ${category.id},
      ${category.name},
      ${category.slug},
      ${category.level},
      ${category.path},
      ${parentId},
      ${dateOrNow(category.createdAt)},
      ${dateOrNow(category.updatedAt)}
    )
  `;

  return true;
}

async function restoreProduct(product: BackupProduct) {
  if (await productExists(product.id, product.slug, product.sku)) {
    return false;
  }

  await prisma.$executeRaw`
    INSERT INTO "Product" (
      id,
      slug,
      name,
      sku,
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
      "updatedAt",
      "isActive",
      variants
    )
    VALUES (
      ${product.id},
      ${product.slug},
      ${product.name},
      ${product.sku},
      ${product.category},
      ${product.categoryPath},
      ${product.shortDescription},
      ${product.longDescription},
      ${product.basePriceUsd},
      ${product.basePricePkr},
      ${product.compareAtPricePkr},
      ${product.rating},
      ${product.reviewCount},
      ${product.tags ?? []},
      ${product.isBestSeller},
      ${product.isNewArrival},
      ${product.relatedSlugs ?? []},
      ${product.stock},
      ${product.careInstructions},
      ${product.shippingInfo},
      ${new Date(product.createdAt)},
      ${new Date(product.updatedAt)},
      ${product.isActive},
      ${JSON.stringify(product.variants)}::jsonb
    )
  `;

  return true;
}

async function restoreImage(image: BackupProductImage) {
  if (await imageExists(image.id)) {
    return false;
  }

  await prisma.$executeRaw`
    INSERT INTO "ProductImage" (
      id,
      "productId",
      url,
      position,
      "createdAt"
    )
    VALUES (
      ${image.id},
      ${image.productId},
      ${image.url},
      ${image.position},
      ${new Date(image.createdAt)}
    )
  `;

  return true;
}

async function main() {
  const backup = await loadBackup();
  const restoreLeafKeys = new Set(RESTORE_LEAF_PATHS.map((path) => normalizeKey(path)));
  const restorePrefixKeys = getRestorePrefixKeys();
  const categoriesByPath = new Map(
    backup.categories.map((category) => [normalizeKey(splitPath(category.path)), category]),
  );
  const categoriesToRestore = [...restorePrefixKeys]
    .map((key) => categoriesByPath.get(key))
    .filter((category): category is BackupCategory => Boolean(category))
    .sort((left, right) => left.level - right.level || left.path.localeCompare(right.path));

  const restoredCategoryIdsByPath = new Map<string, string>();
  for (const category of await prisma.category.findMany({ select: { id: true, path: true } })) {
    restoredCategoryIdsByPath.set(normalizeKey(splitPath(category.path)), category.id);
  }

  let restoredCategories = 0;
  for (const category of categoriesToRestore) {
    const parentKey = normalizeKey(splitPath(category.path).slice(0, -1));
    const parentId = category.level === 0 ? null : restoredCategoryIdsByPath.get(parentKey) ?? null;
    const inserted = await restoreCategory(category, parentId);
    restoredCategoryIdsByPath.set(normalizeKey(splitPath(category.path)), category.id);
    if (inserted) {
      restoredCategories += 1;
    }
  }

  const productsToRestore = backup.products.filter((product) => {
    return product.isActive && restoreLeafKeys.has(normalizeKey(product.categoryPath));
  });
  const productIdsToRestore = new Set(productsToRestore.map((product) => product.id));
  let restoredProducts = 0;
  for (const product of productsToRestore) {
    if (await restoreProduct(product)) {
      restoredProducts += 1;
    }
  }

  let restoredImages = 0;
  for (const image of backup.productImages) {
    if (!productIdsToRestore.has(image.productId)) {
      continue;
    }
    if (await restoreImage(image)) {
      restoredImages += 1;
    }
  }

  console.log(JSON.stringify({
    restoredCategories,
    restoredProducts,
    restoredImages,
    restoredLeafCount: restoreLeafKeys.size,
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
