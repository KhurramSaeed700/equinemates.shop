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
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 2.6;
  const ZOOM_STEP = 0.25;
  const safeImages = useMemo(
    () => (images.length > 0 ? images : ["/place holder/1.webp"]),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
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

  useEffect(() => {
    setZoomLevel(MIN_ZOOM);
  }, [activeIndex]);

  const zoomIn = () => {
    setZoomLevel((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP));
  };

  const zoomOut = () => {
    setZoomLevel((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP));
  };

  const closeLightbox = () => {
    setZoomLevel(MIN_ZOOM);
    setLightboxOpen(false);
  };

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
          onClick={() => {
            setZoomLevel(MIN_ZOOM);
            setLightboxOpen(true);
          }}
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
          onClick={closeLightbox}
        >
          <div
            className="product-gallery-lightbox-content"
            onClick={(event) => event.stopPropagation()}
            onTouchEnd={handleTouchEnd}
            onTouchStart={handleTouchStart}
          >
            <div className="product-gallery-lightbox-toolbar">
              <button
                aria-label="Back to product page gallery"
                className="product-gallery-lightbox-back"
                onClick={closeLightbox}
                type="button"
              >
                Back
              </button>
              <div className="product-gallery-lightbox-actions">
                <button
                  aria-label="Zoom out image"
                  className="product-gallery-lightbox-control"
                  onClick={zoomOut}
                  type="button"
                >
                  -
                </button>
                <span className="product-gallery-lightbox-zoom-label">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  aria-label="Zoom in image"
                  className="product-gallery-lightbox-control"
                  onClick={zoomIn}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
            <button
              aria-label="Previous image"
              className="gallery-arrow gallery-arrow-left"
              onClick={prevImage}
              type="button"
            >
              {"<"}
            </button>
            <div className="product-gallery-lightbox-stage">
              <Image
                alt={name}
                src={safeImages[activeIndex]}
                width={1600}
                height={1200}
                className="product-gallery-lightbox-image"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>
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
