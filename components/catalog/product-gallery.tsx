"use client";

import { PointerEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";

import { ProductMedia } from "@/components/ui/product-media";
import { getProductImageSrc } from "@/lib/image-utils";

type PanOffset = {
  x: number;
  y: number;
};

type PanDragState = {
  originX: number;
  originY: number;
  pointerId: number;
  startX: number;
  startY: number;
};

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
    () => (images.length > 0 ? images.map(getProductImageSrc) : ["/place holder/1.webp"]),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lightboxStageRef = useRef<HTMLDivElement>(null);
  const panDragRef = useRef<PanDragState | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const clampPanOffset = (offset: PanOffset, scale = zoomLevel): PanOffset => {
    const stage = lightboxStageRef.current;

    if (!stage || scale <= MIN_ZOOM) {
      return { x: 0, y: 0 };
    }

    const { width, height } = stage.getBoundingClientRect();
    const maxX = (width * (scale - 1)) / 2;
    const maxY = (height * (scale - 1)) / 2;

    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    };
  };

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
    if (lightboxOpen && zoomLevel > MIN_ZOOM) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (lightboxOpen && zoomLevel > MIN_ZOOM) {
      touchStartRef.current = null;
      return;
    }

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
    setPanOffset({ x: 0, y: 0 });
    panDragRef.current = null;
    setIsPanning(false);
  }, [activeIndex]);

  useEffect(() => {
    if (zoomLevel <= MIN_ZOOM) {
      setPanOffset({ x: 0, y: 0 });
      panDragRef.current = null;
      setIsPanning(false);
      return;
    }

    setPanOffset((current) => clampPanOffset(current, zoomLevel));
  }, [zoomLevel]);

  const zoomIn = () => {
    setZoomLevel((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP));
  };

  const zoomOut = () => {
    setZoomLevel((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP));
  };

  const closeLightbox = () => {
    setZoomLevel(MIN_ZOOM);
    setPanOffset({ x: 0, y: 0 });
    panDragRef.current = null;
    setIsPanning(false);
    setLightboxOpen(false);
  };

  const handlePanStart = (event: PointerEvent<HTMLDivElement>) => {
    if (zoomLevel <= MIN_ZOOM) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panDragRef.current = {
      originX: panOffset.x,
      originY: panOffset.y,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    setIsPanning(true);
  };

  const handlePanMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = panDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setPanOffset(
      clampPanOffset({
        x: dragState.originX + event.clientX - dragState.startX,
        y: dragState.originY + event.clientY - dragState.startY,
      }),
    );
  };

  const handlePanEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (panDragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    panDragRef.current = null;
    setIsPanning(false);
  };

  const activeImage = safeImages[activeIndex] ?? "/place holder/1.webp";
  const lightboxStageClassName =
    zoomLevel > MIN_ZOOM
      ? `product-gallery-lightbox-stage product-gallery-lightbox-stage-pannable${
          isPanning ? " product-gallery-lightbox-stage-panning" : ""
        }`
      : "product-gallery-lightbox-stage";

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
          <ProductMedia
            alt={name}
            src={activeImage}
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
            <ProductMedia
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
            <div
              className={lightboxStageClassName}
              onPointerCancel={handlePanEnd}
              onPointerDown={handlePanStart}
              onPointerMove={handlePanMove}
              onPointerUp={handlePanEnd}
              ref={lightboxStageRef}
            >
              <ProductMedia
                alt={name}
                src={activeImage}
                width={1600}
                height={1200}
                className="product-gallery-lightbox-image"
                style={{
                  transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel})`,
                }}
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
