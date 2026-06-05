import { createHash } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getR2Config, type R2Config } from "@/lib/server/r2-config";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
]);

type R2UploadInput = {
  file: File;
  folder?: string;
};

type R2UploadResult = {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
  contentType: string;
  reused: boolean;
};

type R2ObjectResult = {
  body: ReadableStream;
  cacheControl: string;
  contentLength?: number;
  contentType: string;
};

type R2DeleteImagesResult = {
  deletedKeys: string[];
  failed: Array<{
    key: string;
    message: string;
  }>;
  skippedSharedKeys: string[];
  skippedSources: string[];
};

type R2DeleteImagesOptions = {
  protectedSources?: string[];
};

let cachedClient: S3Client | null = null;
let cachedEndpoint = "";

function getFileExtension(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return "bin";
  }
}

function sanitizeFolderSegment(value: string): string {
  return value
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\<>:"|?*#%{}[\]^`]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFileName(value: string): string {
  const baseName = value.replace(/\.[^.]+$/, "");
  const safeName = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "image";
}

function toFolderSegments(folder: string): string[] {
  return folder
    .split("/")
    .map(sanitizeFolderSegment)
    .filter((segment) => segment && segment !== "." && segment !== "..");
}

function buildObjectKey(
  uploadPrefix: string,
  folder: string | undefined,
  contentHash: string,
  file: File,
): string {
  const extension = getFileExtension(file.type);
  const objectName = `${contentHash.slice(0, 12)}-${sanitizeFileName(file.name)}.${extension}`;
  const folderSegments = toFolderSegments(folder ?? "");
  const baseSegments = folderSegments.length
    ? folderSegments
    : [...toFolderSegments(uploadPrefix), "images"];

  return [...baseSegments, objectName]
    .filter(Boolean)
    .join("/");
}

function buildPublicUrl(baseUrl: string, key: string): string {
  return new URL(key, baseUrl).toString();
}

function buildProxyUrl(key: string): string {
  return `/api/r2-images/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

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

function getR2ObjectKeyFromImageSource(source: string, config: R2Config): string | null {
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
      const publicBaseUrl = new URL(config.publicBaseUrl);

      if (sourceUrl.origin === publicBaseUrl.origin) {
        const basePath = publicBaseUrl.pathname.replace(/\/+$/, "");
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

function getS3Client(config: R2Config): S3Client {
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

  if (!cachedClient || cachedEndpoint !== endpoint) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedEndpoint = endpoint;
  }

  return cachedClient;
}

async function r2ObjectExists({
  bucketName,
  client,
  key,
}: {
  bucketName: string;
  client: S3Client;
  key: string;
}): Promise<boolean | null> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );

    return true;
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "$metadata" in error &&
      typeof error.$metadata === "object" &&
      error.$metadata !== null &&
      "httpStatusCode" in error.$metadata &&
      typeof error.$metadata.httpStatusCode === "number"
        ? error.$metadata.httpStatusCode
        : undefined;

    if (statusCode === 404 || statusCode === 403) {
      return statusCode === 404 ? false : null;
    }

    throw error;
  }
}

function assertUploadableImage(file: File, maxUploadBytes: number) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Unsupported image type. Use JPG or PNG.");
  }

  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > maxUploadBytes) {
    throw new Error(
      `Image is larger than the ${Math.floor(maxUploadBytes / 1024 / 1024)} MB upload limit.`,
    );
  }
}

export async function uploadImageToR2({
  file,
  folder,
}: R2UploadInput): Promise<R2UploadResult> {
  const config = getR2Config();

  assertUploadableImage(file, config.maxUploadBytes);

  const body = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(body).digest("hex");
  const key = buildObjectKey(config.uploadPrefix, folder, contentHash, file);
  const client = getS3Client(config);
  const exists = await r2ObjectExists({
    bucketName: config.bucketName,
    client,
    key,
  });

  if (exists) {
    return {
      key,
      url: buildProxyUrl(key),
      publicUrl: buildPublicUrl(config.publicBaseUrl, key),
      size: file.size,
      contentType: file.type,
      reused: true,
    };
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: body,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "$metadata" in error &&
      typeof error.$metadata === "object" &&
      error.$metadata !== null &&
      "httpStatusCode" in error.$metadata &&
      typeof error.$metadata.httpStatusCode === "number"
        ? error.$metadata.httpStatusCode
        : undefined;
    const errorName =
      error instanceof Error && error.name ? error.name : "R2UploadError";
    const errorMessage =
      error instanceof Error && error.message ? error.message : "Unknown R2 error";

    if (
      statusCode === 403 ||
      errorName === "AccessDenied" ||
      /access ?denied/i.test(errorMessage)
    ) {
      throw new Error(
        "Cloudflare R2 denied the upload. Restart the dev server after editing .env.local, then verify that R2_ACCOUNT_ID and R2_BUCKET_NAME match the bucket and that the R2 access key has write access.",
      );
    }

    if (statusCode === 404 || /no such bucket/i.test(errorMessage)) {
      throw new Error(
        "Cloudflare R2 could not find the configured bucket. Check R2_BUCKET_NAME and R2_ACCOUNT_ID, then restart the dev server.",
      );
    }

    throw new Error(`Cloudflare R2 upload failed: ${errorMessage}`);
  }

  return {
    key,
    url: buildProxyUrl(key),
    publicUrl: buildPublicUrl(config.publicBaseUrl, key),
    size: file.size,
    contentType: file.type,
    reused: false,
  };
}

export async function deleteImagesFromR2(
  imageSources: string[],
  options: R2DeleteImagesOptions = {},
): Promise<R2DeleteImagesResult> {
  const candidateSources = imageSources
    .map((source) => source.trim())
    .filter(
      (source) =>
        source.startsWith("/api/r2-images/") ||
        /^https?:\/\//i.test(source) ||
        (!source.startsWith("/") && source.includes("/")),
    );

  if (!candidateSources.length) {
    return {
      deletedKeys: [],
      failed: [],
      skippedSharedKeys: [],
      skippedSources: imageSources,
    };
  }

  const config = getR2Config();
  const skippedSources: string[] = [];
  const protectedKeys = new Set(
    (options.protectedSources ?? [])
      .map((source) => getR2ObjectKeyFromImageSource(source, config))
      .filter((key): key is string => Boolean(key)),
  );
  const keys = Array.from(
    new Set(
      candidateSources
        .map((source) => {
          const key = getR2ObjectKeyFromImageSource(source, config);

          if (!key) {
            skippedSources.push(source);
          }

          return key;
        })
        .filter((key): key is string => Boolean(key)),
    ),
  );

  if (!keys.length) {
    return {
      deletedKeys: [],
      failed: [],
      skippedSharedKeys: [],
      skippedSources,
    };
  }

  const client = getS3Client(config);
  const keysToDelete = keys.filter((key) => !protectedKeys.has(key));
  const skippedSharedKeys = keys.filter((key) => protectedKeys.has(key));

  if (!keysToDelete.length) {
    return {
      deletedKeys: [],
      failed: [],
      skippedSharedKeys,
      skippedSources,
    };
  }

  const settledResults = await Promise.allSettled(
    keysToDelete.map(async (key) => {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        }),
      );

      return key;
    }),
  );

  return settledResults.reduce<R2DeleteImagesResult>(
    (result, settledResult, index) => {
      const key = keysToDelete[index];

      if (settledResult.status === "fulfilled") {
        result.deletedKeys.push(settledResult.value);
        return result;
      }

      result.failed.push({
        key,
        message:
          settledResult.reason instanceof Error
            ? settledResult.reason.message
            : "Unknown R2 deletion error.",
      });

      return result;
    },
    {
      deletedKeys: [],
      failed: [],
      skippedSharedKeys,
      skippedSources,
    },
  );
}

export async function getImageFromR2(key: string): Promise<R2ObjectResult> {
  const config = getR2Config();
  const response = await getS3Client(config).send(
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error("R2 object has no response body.");
  }

  return {
    body: response.Body.transformToWebStream(),
    cacheControl: response.CacheControl ?? "public, max-age=31536000, immutable",
    contentLength: response.ContentLength,
    contentType: response.ContentType ?? "application/octet-stream",
  };
}
