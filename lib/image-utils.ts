const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;
const PRODUCT_IMAGE_FALLBACK_SRC = "/place holder/1.webp";

export function isRemoteImage(src: string): boolean {
  return REMOTE_IMAGE_PATTERN.test(src);
}

export function isMissingProductImageSrc(src: string | null | undefined): boolean {
  const trimmedSrc = src?.trim();

  if (!trimmedSrc) {
    return true;
  }

  let decodedSrc = trimmedSrc;

  try {
    decodedSrc = decodeURIComponent(trimmedSrc);
  } catch {
    decodedSrc = trimmedSrc;
  }

  const normalizedSrc = decodedSrc
    .replace(/\\/g, "/")
    .toLowerCase();

  return (
    normalizedSrc.includes("/place holder/") ||
    normalizedSrc.includes("/placeholder") ||
    normalizedSrc.includes("placeholder.") ||
    normalizedSrc.includes("/dummy") ||
    normalizedSrc.includes("dummy.")
  );
}

function getR2ProxyImageSrc(src: string): string | null {
  if (src.startsWith("/api/r2-images/")) {
    return src;
  }

  try {
    const url = new URL(src);
    if (!url.hostname.endsWith(".r2.dev")) {
      return null;
    }

    const key = url.pathname.replace(/^\/+/, "");
    if (!key) {
      return null;
    }

    return `/api/r2-images/${key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;
  } catch {
    return null;
  }
}

export function getProductImageSrc(src: string | null | undefined): string {
  const trimmedSrc = src?.trim();
  if (!trimmedSrc) {
    return PRODUCT_IMAGE_FALLBACK_SRC;
  }

  return getR2ProxyImageSrc(trimmedSrc) ?? trimmedSrc;
}
