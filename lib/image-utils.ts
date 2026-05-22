const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;

export function isRemoteImage(src: string): boolean {
  return REMOTE_IMAGE_PATTERN.test(src);
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
    return "/place holder/1.webp";
  }

  return getR2ProxyImageSrc(trimmedSrc) ?? trimmedSrc;
}
