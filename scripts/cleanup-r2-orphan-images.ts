import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { config } from "dotenv";

import { prisma } from "@/lib/prisma";
import { getR2Config } from "@/lib/server/r2-config";

config({ path: ".env" });
config({ path: ".env.local", override: true });

type ProductImageSourceRow = {
  source: string | null;
};

type ProductImageCountRow = {
  activeProducts: number;
};

type ListedObject = {
  key: string;
  size: number;
  lastModified: string | null;
};

const shouldDelete = process.argv.includes("--delete");
const reportDir = path.join(process.cwd(), "tmp");

function decodeKeyPath(value: string): string | null {
  const key = value
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/")
    .replace(/^\/+/, "")
    .trim();

  return key || null;
}

function getR2ObjectKeyFromImageSource(source: string, publicBaseUrl: string): string | null {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    return null;
  }

  const proxyPrefix = "/api/r2-images/";

  if (trimmedSource.startsWith(proxyPrefix)) {
    return decodeKeyPath(trimmedSource.slice(proxyPrefix.length));
  }

  if (/^https?:\/\//i.test(trimmedSource)) {
    try {
      const sourceUrl = new URL(trimmedSource);
      const baseUrl = new URL(publicBaseUrl);

      if (sourceUrl.origin === baseUrl.origin) {
        const basePath = baseUrl.pathname.replace(/\/+$/, "");
        const sourcePathMatchesBase =
          !basePath ||
          sourceUrl.pathname === basePath ||
          sourceUrl.pathname.startsWith(`${basePath}/`);

        if (!sourcePathMatchesBase) {
          return null;
        }

        const keyPath = basePath
          ? sourceUrl.pathname.slice(basePath.length).replace(/^\/+/, "")
          : sourceUrl.pathname.replace(/^\/+/, "");

        return decodeKeyPath(keyPath);
      }

      if (sourceUrl.hostname.endsWith(".r2.dev")) {
        return decodeKeyPath(sourceUrl.pathname);
      }
    } catch {
      return null;
    }
  }

  if (!trimmedSource.startsWith("/") && trimmedSource.includes("/")) {
    return decodeKeyPath(trimmedSource);
  }

  return null;
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `;

  return Boolean(rows[0]?.exists);
}

async function productColumnExists(columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Product'
        AND column_name = ${columnName}
    ) AS exists
  `;

  return Boolean(rows[0]?.exists);
}

async function getActiveProductImageSources(): Promise<{
  sources: string[];
  activeProducts: number;
  referencedSources: number;
}> {
  const [hasImagesColumn, hasProductImageTable, hasIsActiveColumn] = await Promise.all([
    productColumnExists("images"),
    tableExists("ProductImage"),
    productColumnExists("isActive"),
  ]);

  if (!hasImagesColumn && !hasProductImageTable) {
    return {
      sources: [],
      activeProducts: 0,
      referencedSources: 0,
    };
  }

  const countRows = hasIsActiveColumn
    ? await prisma.$queryRaw<ProductImageCountRow[]>`
        SELECT
          COUNT(*)::int AS "activeProducts"
        FROM "Product"
        WHERE "isActive" = true
      `
    : await prisma.$queryRaw<ProductImageCountRow[]>`
        SELECT
          COUNT(*)::int AS "activeProducts"
        FROM "Product"
      `;

  let rows: ProductImageSourceRow[] = [];

  if (hasImagesColumn && hasProductImageTable) {
    rows = hasIsActiveColumn
      ? await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT unnest(
            COALESCE(p.images, ARRAY[]::text[]) ||
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
          WHERE p."isActive" = true
        `
      : await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT unnest(
            COALESCE(p.images, ARRAY[]::text[]) ||
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
  } else if (hasImagesColumn) {
    rows = hasIsActiveColumn
      ? await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT unnest(COALESCE(p.images, ARRAY[]::text[])) AS source
          FROM "Product" p
          WHERE p."isActive" = true
        `
      : await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT unnest(COALESCE(p.images, ARRAY[]::text[])) AS source
          FROM "Product" p
        `;
  } else if (hasProductImageTable) {
    rows = hasIsActiveColumn
      ? await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT pi.url AS source
          FROM "ProductImage" pi
          INNER JOIN "Product" p ON p.id = pi."productId"
          WHERE p."isActive" = true
        `
      : await prisma.$queryRaw<ProductImageSourceRow[]>`
          SELECT url AS source
          FROM "ProductImage"
        `;
  }

  return {
    sources: Array.from(
      new Set(rows.map((row) => row.source?.trim()).filter(Boolean) as string[]),
    ),
    activeProducts: Number(countRows[0]?.activeProducts ?? 0),
    referencedSources: rows.length,
  };
}

async function listBucketObjects(client: S3Client, bucketName: string): Promise<ListedObject[]> {
  const objects: ListedObject[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (!object.Key) {
        continue;
      }

      objects.push({
        key: object.Key,
        size: object.Size ?? 0,
        lastModified: object.LastModified?.toISOString() ?? null,
      });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

async function deleteObjects(
  client: S3Client,
  bucketName: string,
  keys: string[],
): Promise<{
  deletedKeys: string[];
  errors: Array<{ key: string; message: string }>;
}> {
  const deletedKeys: string[] = [];
  const errors: Array<{ key: string; message: string }> = [];

  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    const response = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: false,
        },
      }),
    );

    deletedKeys.push(
      ...(response.Deleted ?? [])
        .map((deletedObject) => deletedObject.Key)
        .filter((key): key is string => Boolean(key)),
    );
    errors.push(
      ...(response.Errors ?? []).map((error) => ({
        key: error.Key ?? "unknown",
        message: error.Message ?? error.Code ?? "Unknown R2 delete error.",
      })),
    );
  }

  return { deletedKeys, errors };
}

async function main() {
  const r2Config = getR2Config();
  const endpoint = `https://${r2Config.accountId}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });

  const [{ sources, activeProducts, referencedSources }, bucketObjects] = await Promise.all([
    getActiveProductImageSources(),
    listBucketObjects(client, r2Config.bucketName),
  ]);
  const protectedKeys = new Set(
    sources
      .map((source) => getR2ObjectKeyFromImageSource(source, r2Config.publicBaseUrl))
      .filter((key): key is string => Boolean(key)),
  );
  const orphanObjects = bucketObjects.filter((object) => !protectedKeys.has(object.key));
  const orphanKeys = orphanObjects.map((object) => object.key);
  const orphanBytes = orphanObjects.reduce((total, object) => total + object.size, 0);
  const keptObjects = bucketObjects.length - orphanObjects.length;
  const deletion = shouldDelete
    ? await deleteObjects(client, r2Config.bucketName, orphanKeys)
    : { deletedKeys: [], errors: [] };
  const report = {
    mode: shouldDelete ? "delete" : "dry-run",
    generatedAt: new Date().toISOString(),
    bucketName: r2Config.bucketName,
    activeProducts,
    referencedSources,
    protectedKeyCount: protectedKeys.size,
    bucketObjectCount: bucketObjects.length,
    keptObjectCount: keptObjects,
    orphanObjectCount: orphanObjects.length,
    orphanBytes,
    deletedCount: deletion.deletedKeys.length,
    errorCount: deletion.errors.length,
    orphanKeys,
    deletedKeys: deletion.deletedKeys,
    errors: deletion.errors,
  };

  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(
    reportDir,
    `r2-orphan-cleanup-${report.generatedAt.replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ ...report, reportPath, orphanKeys: undefined, deletedKeys: undefined }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
