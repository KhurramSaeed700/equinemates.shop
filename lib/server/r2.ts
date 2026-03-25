import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_UPLOAD_PREFIX = "products";
const DEFAULT_MAX_UPLOAD_MB = 4;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const REQUIRED_R2_ENV_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
] as const;

type RequiredR2EnvVar = (typeof REQUIRED_R2_ENV_VARS)[number];

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  uploadPrefix: string;
  maxUploadBytes: number;
};

type R2UploadInput = {
  file: File;
  folder?: string;
};

type R2UploadResult = {
  key: string;
  url: string;
  size: number;
  contentType: string;
};

let cachedClient: S3Client | null = null;
let cachedEndpoint = "";

function getMissingR2EnvVars(): RequiredR2EnvVar[] {
  return REQUIRED_R2_ENV_VARS.filter((name) => !process.env[name]?.trim());
}

function getNormalizedBaseUrl(value: string): string {
  const url = new URL(value);
  return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
}

function getMaxUploadBytes(): number {
  const configuredMaxMb = Number(process.env.R2_MAX_UPLOAD_MB ?? DEFAULT_MAX_UPLOAD_MB);
  const safeMaxMb =
    Number.isFinite(configuredMaxMb) && configuredMaxMb > 0
      ? configuredMaxMb
      : DEFAULT_MAX_UPLOAD_MB;

  return Math.floor(safeMaxMb * 1024 * 1024);
}

function getR2Config(): R2Config {
  const missing = getMissingR2EnvVars();

  if (missing.length) {
    throw new Error(`Missing R2 environment variables: ${missing.join(", ")}`);
  }

  return {
    accountId: process.env.R2_ACCOUNT_ID!.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    bucketName: process.env.R2_BUCKET_NAME!.trim(),
    publicBaseUrl: getNormalizedBaseUrl(process.env.R2_PUBLIC_BASE_URL!.trim()),
    uploadPrefix: process.env.R2_UPLOAD_PREFIX?.trim() || DEFAULT_UPLOAD_PREFIX,
    maxUploadBytes: getMaxUploadBytes(),
  };
}

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

export function getR2ConfigurationStatus() {
  const missing = getMissingR2EnvVars();

  return {
    isConfigured: missing.length === 0,
    missing,
    uploadPrefix: process.env.R2_UPLOAD_PREFIX?.trim() || DEFAULT_UPLOAD_PREFIX,
    maxUploadMb: Math.floor(getMaxUploadBytes() / 1024 / 1024),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim() ?? "",
  };
}

export async function uploadImageToR2({
  file,
  folder,
}: R2UploadInput): Promise<R2UploadResult> {
  const config = getR2Config();

  assertUploadableImage(file, config.maxUploadBytes);

  const key = buildObjectKey(config.uploadPrefix, folder, file);
  const body = Buffer.from(await file.arrayBuffer());

  await getS3Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: buildPublicUrl(config.publicBaseUrl, key),
    size: file.size,
    contentType: file.type,
  };
}
