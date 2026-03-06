"use client";

import Image from "next/image";
import { TouchEvent, useEffect, useMemo, useRef, useState } from "react";

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;

    if (!start || !touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const swipeThreshold = 45;

    // Only treat mostly-horizontal gestures as gallery swipes.
    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      nextImage();
    } else {
      prevImage();
    }
  };

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEsc);
    };
  }, [lightboxOpen]);

  return (
    <div className="product-gallery-component">
      <div
        className="product-gallery-main-wrap"
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        <button
          type="button"
          aria-label="Previous image"
          className="gallery-arrow gallery-arrow-left"
          onClick={prevImage}
        >
          {"<"}
        </button>
        <button
          aria-label="Open image in full screen"
          className="product-gallery-main-btn"
          onClick={() => setLightboxOpen(true)}
          type="button"
        >
          <Image
            alt={name}
            src={safeImages[activeIndex]}
            width={640}
            height={420}
            className="product-gallery-main"
          />
        </button>
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
      {lightboxOpen ? (
        <div
          className="product-gallery-lightbox"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            aria-label="Close full screen image"
            className="product-gallery-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            type="button"
          >
            x
          </button>
          <div
            className="product-gallery-lightbox-content"
            onClick={(event) => event.stopPropagation()}
            onTouchEnd={handleTouchEnd}
            onTouchStart={handleTouchStart}
          >
            <button
              aria-label="Previous image"
              className="gallery-arrow gallery-arrow-left"
              onClick={prevImage}
              type="button"
            >
              {"<"}
            </button>
            <Image
              alt={name}
              src={safeImages[activeIndex]}
              width={1600}
              height={1200}
              className="product-gallery-lightbox-image"
            />
            <button
              aria-label="Next image"
              className="gallery-arrow gallery-arrow-right"
              onClick={nextImage}
              type="button"
            >
              {">"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
