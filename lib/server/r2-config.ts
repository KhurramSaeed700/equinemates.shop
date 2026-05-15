const DEFAULT_UPLOAD_PREFIX = "products";
const DEFAULT_MAX_UPLOAD_MB = 4;

const REQUIRED_R2_ENV_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
] as const;

type RequiredR2EnvVar = (typeof REQUIRED_R2_ENV_VARS)[number];

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  uploadPrefix: string;
  maxUploadBytes: number;
};

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

export function getR2Config(): R2Config {
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
