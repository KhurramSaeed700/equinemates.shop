"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

import { ProductMedia } from "@/components/ui/product-media";
import { useProductVariationPreview } from "@/components/catalog/product-variation-preview";
import { getProductImageSrc } from "@/lib/image-utils";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const { previewVariation } = useProductVariationPreview();
  const displayImages = previewVariation?.images ?? images;
  const displayName = previewVariation?.name ?? name;
  const safeImages = useMemo(
    () =>
      displayImages.length > 0
        ? displayImages.map(getProductImageSrc)
        : ["/place holder/1.webp"],
    [displayImages],
  );
  const imageSetKey = previewVariation?.slug ?? "selected-listing";
  const [activeSelection, setActiveSelection] = useState({
    imageSetKey: "selected-listing",
    index: 0,
  });
  const activeIndex =
    activeSelection.imageSetKey === imageSetKey ? activeSelection.index : 0;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const zoomStageRef = useRef<HTMLDivElement>(null);
  const galleryButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxDialogRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const swipeStartXRef = useRef<number | null>(null);

  const selectImage = useCallback((index: number) => {
    setActiveSelection({ imageSetKey, index });
  }, [imageSetKey]);

  const updateZoomPosition = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const zoomStage = zoomStageRef.current;
    const image = event.currentTarget.querySelector("img");

    if (!zoomStage || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const naturalWidth = image?.naturalWidth || bounds.width;
    const naturalHeight = image?.naturalHeight || bounds.height;
    const imageScale = Math.min(
      bounds.width / naturalWidth,
      bounds.height / naturalHeight,
    );
    const renderedImageWidth = naturalWidth * imageScale;
    const renderedImageHeight = naturalHeight * imageScale;
    const imageOffsetX = (bounds.width - renderedImageWidth) / 2;
    const imageOffsetY = (bounds.height - renderedImageHeight) / 2;
    const viewportGap = 16;
    let previewLeft = bounds.right + viewportGap;
    let availablePreviewWidth =
      window.innerWidth - previewLeft - viewportGap;
    let previewWidth = Math.min(bounds.width, availablePreviewWidth);

    if (availablePreviewWidth < Math.min(320, bounds.width * 0.5)) {
      previewWidth = Math.min(
        bounds.width,
        window.innerWidth - viewportGap * 2,
      );
      previewLeft = Math.max(
        viewportGap,
        window.innerWidth - previewWidth - viewportGap,
      );
      availablePreviewWidth = previewWidth;
    }

    const previewTop = Math.max(viewportGap, bounds.top);
    const previewHeight = Math.max(
      1,
      Math.min(
        bounds.height,
        window.innerHeight - previewTop - viewportGap,
      ),
    );
    const zoomScale = 2.5;
    const lensWidth = Math.min(renderedImageWidth, previewWidth / zoomScale);
    const lensHeight = Math.min(renderedImageHeight, previewHeight / zoomScale);
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const lensCenterX = Math.min(
      imageOffsetX + renderedImageWidth - lensWidth / 2,
      Math.max(imageOffsetX + lensWidth / 2, pointerX),
    );
    const lensCenterY = Math.min(
      imageOffsetY + renderedImageHeight - lensHeight / 2,
      Math.max(imageOffsetY + lensHeight / 2, pointerY),
    );
    const imageX = (lensCenterX - imageOffsetX) / renderedImageWidth;
    const imageY = (lensCenterY - imageOffsetY) / renderedImageHeight;
    const zoomedImageWidth = renderedImageWidth * zoomScale;
    const zoomedImageHeight = renderedImageHeight * zoomScale;
    const backgroundX = previewWidth / 2 - imageX * zoomedImageWidth;
    const backgroundY = previewHeight / 2 - imageY * zoomedImageHeight;

    zoomStage.style.setProperty("--product-lens-left", `${lensCenterX}px`);
    zoomStage.style.setProperty("--product-lens-top", `${lensCenterY}px`);
    zoomStage.style.setProperty("--product-lens-width", `${lensWidth}px`);
    zoomStage.style.setProperty("--product-lens-height", `${lensHeight}px`);
    zoomStage.style.setProperty(
      "--product-zoom-preview-left",
      `${previewLeft}px`,
    );
    zoomStage.style.setProperty(
      "--product-zoom-preview-top",
      `${previewTop}px`,
    );
    zoomStage.style.setProperty(
      "--product-zoom-preview-width",
      `${Math.max(1, Math.min(previewWidth, availablePreviewWidth))}px`,
    );
    zoomStage.style.setProperty(
      "--product-zoom-preview-height",
      `${Math.max(1, previewHeight)}px`,
    );
    zoomStage.style.setProperty(
      "--product-zoom-width",
      `${zoomedImageWidth}px`,
    );
    zoomStage.style.setProperty(
      "--product-zoom-height",
      `${zoomedImageHeight}px`,
    );
    zoomStage.style.setProperty(
      "--product-zoom-position-x",
      `${backgroundX}px`,
    );
    zoomStage.style.setProperty(
      "--product-zoom-position-y",
      `${backgroundY}px`,
    );
  };

  const startZoom = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    updateZoomPosition(event);
    setIsZooming(true);
  };

  const stopZoom = () => {
    setIsZooming(false);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const navigateImage = useCallback(
    (direction: -1 | 1) => {
      setActiveSelection((currentSelection) => {
        const currentIndex =
          currentSelection.imageSetKey === imageSetKey
            ? currentSelection.index
            : 0;

        return {
          imageSetKey,
          index:
            (currentIndex + direction + safeImages.length) %
            safeImages.length,
        };
      });
    },
    [imageSetKey, safeImages.length],
  );

  const showPreviousImage = useCallback(() => {
    navigateImage(-1);
  }, [navigateImage]);

  const showNextImage = useCallback(() => {
    navigateImage(1);
  }, [navigateImage]);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const galleryTrigger = galleryButtonRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousImage();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextImage();
        return;
      }

      if (event.key === "Tab") {
        const focusableElements =
          lightboxDialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button:not([disabled])",
          );

        if (!focusableElements?.length) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    lightboxCloseRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      galleryTrigger?.focus();
    };
  }, [lightboxOpen, showNextImage, showPreviousImage]);

  const activeImage =
    safeImages[activeIndex] ?? safeImages[0] ?? "/place holder/1.webp";

  return (
    <div className="product-gallery-component">
      <div className="product-gallery-main-stage" ref={zoomStageRef}>
        <div className="product-gallery-main-wrap">
          <button
            aria-label="Open image in full screen"
            className="product-gallery-main-btn"
            onClick={() => {
              stopZoom();
              setLightboxOpen(true);
            }}
            onPointerCancel={stopZoom}
            onPointerEnter={startZoom}
            onPointerLeave={stopZoom}
            onPointerMove={updateZoomPosition}
            ref={galleryButtonRef}
            type="button"
          >
            <ProductMedia
              alt={displayName}
              src={activeImage}
              width={640}
              height={420}
              className="product-gallery-main"
            />
          </button>
        </div>
        {isZooming ? (
          <div
            aria-hidden="true"
            className="product-gallery-zoom-preview"
            style={{
              backgroundImage: `url(${JSON.stringify(activeImage)})`,
            }}
          />
        ) : null}
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
            onClick={() => selectImage(index)}
            aria-label={`Show image ${index + 1}`}
          >
            <ProductMedia
              src={img}
              alt={`${displayName} image ${index + 1}`}
              width={120}
              height={90}
            />
          </button>
        ))}
      </div>
      {lightboxOpen ? (
        <div
          aria-label={`${displayName} image viewer`}
          aria-modal="true"
          className="product-gallery-lightbox"
          onPointerDown={(event) => {
            swipeStartXRef.current = event.clientX;
          }}
          onPointerUp={(event) => {
            const startX = swipeStartXRef.current;
            swipeStartXRef.current = null;

            if (startX === null) {
              return;
            }

            const distance = event.clientX - startX;
            if (Math.abs(distance) < 50) {
              return;
            }

            if (distance > 0) {
              showPreviousImage();
            } else {
              showNextImage();
            }
          }}
          ref={lightboxDialogRef}
          role="dialog"
        >
          <button
            aria-label="Close image viewer"
            className="product-gallery-lightbox-close"
            onClick={closeLightbox}
            ref={lightboxCloseRef}
            type="button"
          >
            <FiX aria-hidden="true" />
          </button>
          <div className="product-gallery-lightbox-content">
            <ProductMedia
              alt={`${displayName} image ${activeIndex + 1}`}
              className="product-gallery-lightbox-single-image"
              height={1600}
              key={`${activeImage}-${activeIndex}`}
              sizes="100vw"
              src={activeImage}
              width={2000}
            />
          </div>
          {safeImages.length > 1 ? (
            <nav
              aria-label="Image navigation"
              className="product-gallery-lightbox-controls"
            >
              <button
                aria-label="Show previous image"
                onClick={showPreviousImage}
                type="button"
              >
                <FiChevronLeft aria-hidden="true" />
              </button>
              <span aria-live="polite">
                {activeIndex + 1} / {safeImages.length}
              </span>
              <button
                aria-label="Show next image"
                onClick={showNextImage}
                type="button"
              >
                <FiChevronRight aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
