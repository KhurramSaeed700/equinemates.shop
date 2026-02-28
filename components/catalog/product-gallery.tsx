"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const safeImages = useMemo(
    () => (images.length > 0 ? images : ["/place holder/1.webp"]),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const prevImage = () => {
    setActiveIndex((current) =>
      current === 0 ? safeImages.length - 1 : current - 1,
    );
  };

  const nextImage = () => {
    setActiveIndex((current) =>
      current === safeImages.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div className="product-gallery-component">
      <div className="product-gallery-main-wrap">
        <button
          type="button"
          aria-label="Previous image"
          className="gallery-arrow gallery-arrow-left"
          onClick={prevImage}
        >
          {"<"}
        </button>
        <Image
          alt={name}
          src={safeImages[activeIndex]}
          width={640}
          height={420}
          className="product-gallery-main"
        />
        <button
          type="button"
          aria-label="Next image"
          className="gallery-arrow gallery-arrow-right"
          onClick={nextImage}
        >
          {">"}
        </button>
      </div>
      <div className="product-gallery-thumbs">
        {safeImages.map((img, index) => (
          <button
            key={`${img}-${index}`}
            type="button"
            className={
              index === activeIndex
                ? "gallery-thumb-btn gallery-thumb-active"
                : "gallery-thumb-btn"
            }
            onClick={() => setActiveIndex(index)}
            aria-label={`Show image ${index + 1}`}
          >
            <Image
              src={img}
              alt={`${name} image ${index + 1}`}
              width={120}
              height={90}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
