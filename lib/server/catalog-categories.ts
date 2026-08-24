import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

export type AdminCategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  level: number;
  path: string[];
  parentId: string | null;
  sortOrder: number;
  directProductCount: number;
  totalProductCount: number;
  children: AdminCategoryTreeNode[];
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  level: number;
  path: string;
  parentId: string | null;
  sortOrder: number;
};

type ProductCategoryReferenceRow = {
  id: string;
  category?: string | null;
  categoryId?: string | null;
  categoryPath?: string[] | string | null;
};

type CategoryPathMove = {
  id: string;
  oldPath: string[];
  newPath: string[];
};

type ProductColumnFlags = {
  category: boolean;
  categoryId: boolean;
  categoryPath: boolean;
  isActive: boolean;
};

type SqlExecutor = Pick<typeof prisma, "$executeRaw" | "$queryRawUnsafe">;

const productColumnExistsCache = new Map<string, boolean>();
const tableExistsCache = new Map<string, boolean>();
let categorySortOrderColumnReady = false;

function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function splitStoredPath(value: string): string[] {
  return value
    .split(" > ")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

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

function slugForPath(path: string[]): string {
  return normalizeSlug(path.join("-"));
}

function isPathPrefix(path: string[], prefix: string[]): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((segment, index) => path[index] === segment)
  );
}

function normalizeProductPath(value: ProductCategoryReferenceRow["categoryPath"]): string[] {
  if (Array.isArray(value)) {
    return value.map((segment) => String(segment).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return splitStoredPath(value);
  }

  return [];
}

async function tableExists(tableName: string): Promise<boolean> {
  const cached = tableExistsCache.get(tableName);
  if (typeof cached === "boolean") {
    return cached;
  }

  const quotedTableName = `"${tableName.replace(/"/g, '""')}"`;

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT to_regclass(${quotedTableName}) IS NOT NULL AS "exists"
    `;
    const exists = Boolean(rows[0]?.exists);
    tableExistsCache.set(tableName, exists);
    return exists;
  } catch (error) {
    console.error(`Could not check whether ${tableName} exists.`, error);
    throw new Error(`Could not check whether ${tableName} exists.`);
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
    throw new Error(`Could not check whether Product.${columnName} exists.`);
  }
}

async function ensureCategorySortOrderColumn() {
  if (categorySortOrderColumnReady) {
    return;
  }

  try {
    await prisma.$executeRaw`
      ALTER TABLE "Category"
      ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Category_parentId_sortOrder_idx"
      ON "Category" ("parentId", "sortOrder")
    `;
    categorySortOrderColumnReady = true;
  } catch (error) {
    console.error("Could not prepare category sort order column.", error);
    throw new Error("Could not prepare category ordering.");
  }
}

async function getProductColumnFlags(): Promise<ProductColumnFlags> {
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

async function getStoredCategoryRows(): Promise<CategoryRow[]> {
  await ensureCategorySortOrderColumn();

  try {
    return await prisma.$queryRaw<CategoryRow[]>`
      SELECT
        id,
        name,
        slug,
        level,
        path,
        "parentId",
        "sortOrder"
      FROM "Category"
      ORDER BY
        level ASC,
        COALESCE("parentId", '') ASC,
        "sortOrder" ASC,
        name ASC
    `;
  } catch (error) {
    console.error("Could not load admin categories.", error);
    throw new Error("Could not load admin categories.");
  }
}

function sameParentId(left: string | null, right: string | null): boolean {
  return (left ?? null) === (right ?? null);
}

function compareCategoryRowsByOrder(left: CategoryRow, right: CategoryRow) {
  return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);
}

function getOrderedSiblingRows(
  rows: CategoryRow[],
  parentId: string | null,
): CategoryRow[] {
  return rows
    .filter((row) => sameParentId(row.parentId, parentId))
    .sort(compareCategoryRowsByOrder);
}

function getNextSortOrder(
  rows: CategoryRow[],
  parentId: string | null,
  excludeId?: string,
) {
  const siblingOrders = rows
    .filter(
      (row) => row.id !== excludeId && sameParentId(row.parentId, parentId),
    )
    .map((row) => row.sortOrder);

  return siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0;
}

async function getProductCategoryReferences({
  includeInactive = false,
}: {
  includeInactive?: boolean;
} = {}): Promise<ProductCategoryReferenceRow[]> {
  if (!(await tableExists("Product"))) {
    throw new Error("Product table was not found.");
  }

  const columns = ['"id"'];
  const flags = await getProductColumnFlags();

  if (flags.categoryId) {
    columns.push('"categoryId"');
  }

  if (flags.category) {
    columns.push('"category"');
  }

  if (flags.categoryPath) {
    columns.push('"categoryPath"');
  }

  const whereClause =
    flags.isActive && !includeInactive ? ' WHERE "isActive" = true' : "";

  try {
    return await prisma.$queryRawUnsafe<ProductCategoryReferenceRow[]>(
      `SELECT ${columns.join(", ")} FROM "Product"${whereClause}`,
    );
  } catch (error) {
    console.error("Could not load product category references.", error);
    throw new Error("Could not load product category references.");
  }
}

function getDescendantIdsByCategory(rows: CategoryRow[]): Map<string, Set<string>> {
  const descendantsById = new Map<string, Set<string>>();

  for (const category of rows) {
    const categoryPath = splitStoredPath(category.path);
    const descendantIds = new Set<string>();

    for (const possibleDescendant of rows) {
      if (isPathPrefix(splitStoredPath(possibleDescendant.path), categoryPath)) {
        descendantIds.add(possibleDescendant.id);
      }
    }

    descendantsById.set(category.id, descendantIds);
  }

  return descendantsById;
}

function getProductCountsByCategory(
  categories: CategoryRow[],
  products: ProductCategoryReferenceRow[],
): Map<string, { direct: number; total: number }> {
  const descendantsById = getDescendantIdsByCategory(categories);
  const countsById = new Map<string, { directIds: Set<string>; totalIds: Set<string> }>();

  for (const category of categories) {
    countsById.set(category.id, {
      directIds: new Set<string>(),
      totalIds: new Set<string>(),
    });
  }

  for (const category of categories) {
    const categoryPath = splitStoredPath(category.path);
    const descendantIds = descendantsById.get(category.id) ?? new Set<string>();
    const countBucket = countsById.get(category.id);

    if (!countBucket) {
      continue;
    }

    for (const product of products) {
      const productPath = normalizeProductPath(product.categoryPath);
      const categoryId = product.categoryId?.trim() ?? "";
      const topCategory = product.category?.trim() ?? "";
      const hasDetailedCategoryReference = productPath.length > 0 || categoryId.length > 0;
      const categoryIdMatchesDirect = Boolean(categoryId && categoryId === category.id);
      const categoryIdMatchesTotal = Boolean(categoryId && descendantIds.has(categoryId));
      const pathMatchesDirect =
        productPath.length > 0 &&
        productPath.length === categoryPath.length &&
        isPathPrefix(productPath, categoryPath);
      const pathMatchesTotal =
        productPath.length > 0 && isPathPrefix(productPath, categoryPath);
      const topCategoryMatchesRoot =
        !hasDetailedCategoryReference &&
        category.level === 0 &&
        topCategory.length > 0 &&
        topCategory === category.name;

      if (categoryIdMatchesDirect || pathMatchesDirect || topCategoryMatchesRoot) {
        countBucket.directIds.add(product.id);
      }

      if (categoryIdMatchesTotal || pathMatchesTotal || topCategoryMatchesRoot) {
        countBucket.totalIds.add(product.id);
      }
    }
  }

  return new Map(
    Array.from(countsById.entries()).map(([id, counts]) => [
      id,
      {
        direct: counts.directIds.size,
        total: counts.totalIds.size,
      },
    ]),
  );
}

function buildAdminCategoryTree(
  rows: CategoryRow[],
  products: ProductCategoryReferenceRow[],
): AdminCategoryTreeNode[] {
  const countsById = getProductCountsByCategory(rows, products);
  const nodesById = new Map<string, AdminCategoryTreeNode>();
  const roots: AdminCategoryTreeNode[] = [];

  for (const row of rows) {
    const counts = countsById.get(row.id) ?? { direct: 0, total: 0 };

    nodesById.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      level: row.level,
      path: splitStoredPath(row.path),
      parentId: row.parentId,
      sortOrder: row.sortOrder,
      directProductCount: counts.direct,
      totalProductCount: counts.total,
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

  const sortNodes = (nodes: AdminCategoryTreeNode[]) => {
    nodes.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };

  sortNodes(roots);
  return roots;
}

function flattenTree(nodes: AdminCategoryTreeNode[]): AdminCategoryTreeNode[] {
  const items: AdminCategoryTreeNode[] = [];

  for (const node of nodes) {
    items.push(node);
    items.push(...flattenTree(node.children));
  }

  return items;
}

async function syncProductCategoryPaths(
  executor: SqlExecutor,
  pathMoves: CategoryPathMove[],
) {
  const flags = await getProductColumnFlags();

  if (!flags.category && !flags.categoryPath) {
    return;
  }

  const products = await getProductCategoryReferences({ includeInactive: true });
  const now = new Date();

  for (const product of products) {
    const productPath = normalizeProductPath(product.categoryPath);
    const categoryIdMove = product.categoryId
      ? pathMoves.find((move) => move.id === product.categoryId)
      : undefined;
    const pathMove = categoryIdMove
      ? undefined
      : pathMoves.find(
          (move) =>
            productPath.length > 0 && isPathPrefix(productPath, move.oldPath),
        );
    const rootCategoryMove =
      categoryIdMove || pathMove
        ? undefined
        : pathMoves.find(
            (move) =>
              move.oldPath.length === 1 &&
              product.category?.trim() === move.oldPath[0],
          );
    const move = categoryIdMove ?? pathMove ?? rootCategoryMove;

    if (!move) {
      continue;
    }

    const nextPath =
      pathMove && productPath.length > 0
        ? [...pathMove.newPath, ...productPath.slice(pathMove.oldPath.length)]
        : move.newPath;
    const nextCategory = nextPath[0] ?? "";

    if (flags.categoryPath && flags.category) {
      await executor.$executeRaw`
        UPDATE "Product"
        SET
          "categoryPath" = ${nextPath},
          "category" = ${nextCategory},
          "updatedAt" = ${now}
        WHERE id = ${product.id}
      `;
      continue;
    }

    if (flags.categoryPath) {
      await executor.$executeRaw`
        UPDATE "Product"
        SET
          "categoryPath" = ${nextPath},
          "updatedAt" = ${now}
        WHERE id = ${product.id}
      `;
      continue;
    }

    if (flags.category) {
      await executor.$executeRaw`
        UPDATE "Product"
        SET
          "category" = ${nextCategory},
          "updatedAt" = ${now}
        WHERE id = ${product.id}
      `;
    }
  }
}

export function flattenAdminCategoryTree(
  tree: AdminCategoryTreeNode[],
): AdminCategoryTreeNode[] {
  return flattenTree(tree);
}

export async function getAdminCategoryTree(): Promise<AdminCategoryTreeNode[]> {
  const [categories, products] = await Promise.all([
    getStoredCategoryRows(),
    getProductCategoryReferences(),
  ]);

  return buildAdminCategoryTree(categories, products);
}

export async function createAdminCategory({
  name,
  parentId,
}: {
  name: string;
  parentId?: string | null;
}): Promise<AdminCategoryTreeNode[]> {
  const normalizedName = normalizeCategoryName(name);

  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  const categories = await getStoredCategoryRows();
  const parent = parentId
    ? categories.find((category) => category.id === parentId) ?? null
    : null;

  if (parentId && !parent) {
    throw new Error("Parent category was not found.");
  }

  const parentPath = parent ? splitStoredPath(parent.path) : [];
  const path = [...parentPath, normalizedName];
  const slug = slugForPath(path);

  if (!slug) {
    throw new Error("Category slug could not be generated.");
  }

  if (categories.some((category) => category.slug === slug)) {
    throw new Error("A category already exists at this path.");
  }

  const now = new Date();
  const sortOrder = getNextSortOrder(categories, parent?.id ?? null);

  await prisma.$executeRaw`
    INSERT INTO "Category" (
      id,
      name,
      slug,
      level,
      path,
      "parentId",
      "sortOrder",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${normalizedName},
      ${slug},
      ${path.length - 1},
      ${path.join(" > ")},
      ${parent?.id ?? null},
      ${sortOrder},
      ${now},
      ${now}
    )
  `;

  return getAdminCategoryTree();
}

export async function updateAdminCategory({
  id,
  name,
  parentId,
}: {
  id: string;
  name: string;
  parentId?: string | null;
}): Promise<AdminCategoryTreeNode[]> {
  const normalizedName = normalizeCategoryName(name);

  if (!id.trim()) {
    throw new Error("Category id is required.");
  }

  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  const categories = await getStoredCategoryRows();
  const category = categories.find((item) => item.id === id);

  if (!category) {
    throw new Error("Category was not found.");
  }

  const nextParentId = parentId?.trim() ? parentId.trim() : null;
  const parent = nextParentId
    ? categories.find((item) => item.id === nextParentId) ?? null
    : null;

  if (nextParentId && !parent) {
    throw new Error("Parent category was not found.");
  }

  const oldPath = splitStoredPath(category.path);
  const parentPath = parent ? splitStoredPath(parent.path) : [];

  if (parent && isPathPrefix(parentPath, oldPath)) {
    throw new Error("A category cannot be moved inside itself.");
  }

  const newPath = [...parentPath, normalizedName];
  const parentChanged = !sameParentId(category.parentId, nextParentId);
  const nextSortOrder = parentChanged
    ? getNextSortOrder(categories, nextParentId, category.id)
    : category.sortOrder;
  const subtree = categories.filter((item) =>
    isPathPrefix(splitStoredPath(item.path), oldPath),
  );
  const subtreeIds = new Set(subtree.map((item) => item.id));
  const nextRows = subtree.map((item) => {
    const currentPath = splitStoredPath(item.path);
    const updatedPath =
      item.id === category.id
        ? newPath
        : [...newPath, ...currentPath.slice(oldPath.length)];

    return {
      ...item,
      name: item.id === category.id ? normalizedName : item.name,
      slug: slugForPath(updatedPath),
      level: updatedPath.length - 1,
      path: updatedPath.join(" > "),
      parentId: item.id === category.id ? nextParentId : item.parentId,
      sortOrder: item.id === category.id ? nextSortOrder : item.sortOrder,
    };
  });
  const pathMoves: CategoryPathMove[] = nextRows.map((nextRow) => {
    const currentRow = subtree.find((item) => item.id === nextRow.id);

    return {
      id: nextRow.id,
      oldPath: currentRow ? splitStoredPath(currentRow.path) : [],
      newPath: splitStoredPath(nextRow.path),
    };
  });
  const nextSlugs = new Set<string>();

  for (const nextRow of nextRows) {
    if (!nextRow.slug) {
      throw new Error("Category slug could not be generated.");
    }

    if (nextSlugs.has(nextRow.slug)) {
      throw new Error("This category move would create duplicate category paths.");
    }

    nextSlugs.add(nextRow.slug);

    const conflictingCategory = categories.find(
      (item) => item.slug === nextRow.slug && !subtreeIds.has(item.id),
    );

    if (conflictingCategory) {
      throw new Error(`A category already exists at ${nextRow.path}.`);
    }
  }

  const now = new Date();

  await prisma.$transaction(async (transaction) => {
    for (const nextRow of nextRows) {
      await transaction.$executeRaw`
        UPDATE "Category"
        SET
          name = ${nextRow.name},
          slug = ${nextRow.slug},
          level = ${nextRow.level},
          path = ${nextRow.path},
          "parentId" = ${nextRow.parentId},
          "sortOrder" = ${nextRow.sortOrder},
          "updatedAt" = ${now}
        WHERE id = ${nextRow.id}
      `;
    }

    await syncProductCategoryPaths(transaction, pathMoves);
  });

  return getAdminCategoryTree();
}

export async function reorderAdminCategory({
  id,
  direction,
}: {
  id: string;
  direction: "up" | "down";
}): Promise<AdminCategoryTreeNode[]> {
  const categoryId = id.trim();

  if (!categoryId) {
    throw new Error("Category id is required.");
  }

  if (direction !== "up" && direction !== "down") {
    throw new Error("Category order direction is invalid.");
  }

  const categories = await getStoredCategoryRows();
  const category = categories.find((item) => item.id === categoryId);

  if (!category) {
    throw new Error("Category was not found.");
  }

  const siblings = getOrderedSiblingRows(categories, category.parentId);
  const currentIndex = siblings.findIndex((item) => item.id === category.id);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (
    currentIndex === -1 ||
    targetIndex < 0 ||
    targetIndex >= siblings.length
  ) {
    return getAdminCategoryTree();
  }

  const swappedSibling = siblings[targetIndex];
  const now = new Date();

  await prisma.$transaction(async (transaction) => {
    for (const [index, sibling] of siblings.entries()) {
      let sortOrder = index;

      if (sibling.id === category.id) {
        sortOrder = targetIndex;
      } else if (sibling.id === swappedSibling.id) {
        sortOrder = currentIndex;
      }

      await transaction.$executeRaw`
        UPDATE "Category"
        SET
          "sortOrder" = ${sortOrder},
          "updatedAt" = ${now}
        WHERE id = ${sibling.id}
      `;
    }
  });

  return getAdminCategoryTree();
}

export async function deleteAdminCategory(id: string): Promise<AdminCategoryTreeNode[]> {
  if (!id.trim()) {
    throw new Error("Category id is required.");
  }

  const categories = await getStoredCategoryRows();
  const category = categories.find((item) => item.id === id);

  if (!category) {
    throw new Error("Category was not found.");
  }

  const products = await getProductCategoryReferences();
  const counts = getProductCountsByCategory(categories, products);
  const productCount = counts.get(category.id)?.total ?? 0;

  if (productCount > 0) {
    throw new Error(
      `Move or remove ${productCount} product${productCount === 1 ? "" : "s"} before deleting this category.`,
    );
  }

  const categoryPath = splitStoredPath(category.path);
  const subtree = categories
    .filter((item) => isPathPrefix(splitStoredPath(item.path), categoryPath))
    .sort((left, right) => right.level - left.level);

  await prisma.$transaction(async (transaction) => {
    for (const item of subtree) {
      await transaction.$executeRaw`
        DELETE FROM "Category"
        WHERE id = ${item.id}
      `;
    }
  });

  return getAdminCategoryTree();
}
