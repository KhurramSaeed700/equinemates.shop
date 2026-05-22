import { randomUUID } from "node:crypto";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getR2Config, type R2Config } from "@/lib/server/r2-config";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
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
};

type R2ObjectResult = {
  body: ReadableStream;
  cacheControl: string;
  contentLength?: number;
  contentType: string;
};

let cachedClient: S3Client | null = null;
let cachedEndpoint = "";

function getFileExtension(contentType: string): string {
  switch (contentType) {
    case "image/avif":
      return "avif";
    case "image/gif":
      return "gif";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeFolderPath(folder: string | undefined): string {
  if (!folder) {
    return "";
  }

  return folder
    .split("/")
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join("/");
}

function buildObjectKey(uploadPrefix: string, folder: string | undefined, file: File): string {
  const sanitizedFolder = sanitizeFolderPath(folder);
  const baseName = sanitizeSegment(file.name.replace(/\.[^.]+$/, "")) || "image";
  const extension = getFileExtension(file.type);
  const objectName = `${randomUUID().slice(0, 8)}-${baseName}.${extension}`;
  const dateSegment = new Date().toISOString().slice(0, 10);

  return [uploadPrefix, sanitizedFolder, dateSegment, objectName]
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

function assertUploadableImage(file: File, maxUploadBytes: number) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Unsupported image type. Use AVIF, GIF, JPG, PNG, or WebP.");
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

  const key = buildObjectKey(config.uploadPrefix, folder, file);
  const body = Buffer.from(await file.arrayBuffer());

  try {
    await getS3Client(config).send(
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
  };
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
