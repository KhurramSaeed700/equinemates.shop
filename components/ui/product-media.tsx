import Image from "next/image";
import type { CSSProperties } from "react";

import { isRemoteImage } from "@/lib/image-utils";

type ProductMediaProps = {
  alt: string;
  className?: string;
  height: number;
  priority?: boolean;
  sizes?: string;
  src: string;
  style?: CSSProperties;
  width: number;
};

export function ProductMedia({
  alt,
  className,
  height,
  priority = false,
  sizes,
  src,
  style,
  width,
}: ProductMediaProps) {
  if (isRemoteImage(src) || src.startsWith("/api/r2-images/")) {
    return (
      <img
        alt={alt}
        className={className}
        decoding="async"
        height={height}
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        src={src}
        style={style}
        width={width}
      />
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      priority={priority}
      sizes={sizes}
      src={src}
      style={style}
      width={width}
    />
  );
}
