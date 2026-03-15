"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { Product } from "@/lib/types";

interface ProductPreviewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductPreviewModal({
  product,
  isOpen,
  onClose,
}: ProductPreviewModalProps) {
  const { formatFromPkr } = useCurrency();
  const { addToCart } = useCart();
  const { has: hasInWishlist, toggle } = useWishlist();
  const { isSignedIn } = useUser();
  const safeImages = useMemo(
    () => (product.images.length > 0 ? product.images : ["/place holder/1.webp"]),
    [product.images],
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const savingsPkr = product.compareAtPricePkr
    ? Math.max(0, product.compareAtPricePkr - product.basePricePkr)
    : 0;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    const scrollY = window.scrollY;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overscrollBehavior = "none";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveImageIndex(0);
  }, [isOpen, product.slug]);

  if (!isOpen) return null;

  const isWishlisted = hasInWishlist(product.slug);

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-backdrop" />
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          aria-label="Close preview"
          className="preview-modal-close"
          onClick={onClose}
          type="button"
        >
          X
        </button>

        <div className="preview-modal-body">
          <div className="preview-modal-gallery">
            <div className="preview-modal-images">
              <div className="preview-modal-image-stage">
                <Image
                  alt={`${product.name} image ${activeImageIndex + 1}`}
                  className="preview-modal-image"
                  height={720}
                  src={safeImages[activeImageIndex]}
                  width={720}
                />
              </div>
              {safeImages.length > 1 ? (
                <div className="preview-modal-thumbs">
                  {safeImages.map((image, index) => (
                    <button
                      aria-label={`Show preview image ${index + 1}`}
                      className={
                        index === activeImageIndex
                          ? "preview-modal-thumb preview-modal-thumb-active"
                          : "preview-modal-thumb"
                      }
                      key={`${image}-${index}`}
                      onClick={() => setActiveImageIndex(index)}
                      type="button"
                    >
                      <Image
                        alt={`${product.name} thumbnail ${index + 1}`}
                        className="preview-modal-thumb-image"
                        height={84}
                        src={image}
                        width={84}
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="preview-modal-info">
            <h2 className="preview-modal-title">{product.name}</h2>
            <div className="preview-modal-rating-row">
              <span className="preview-modal-stars">★★★★☆</span>
              <span>{product.rating.toFixed(1)}</span>
              <span>{product.reviewCount} reviews</span>
              <span>{product.stock} in stock</span>
            </div>

            <div className="preview-modal-price-card">
              <p className="preview-modal-deal">Featured deal</p>
              <div className="preview-modal-price-row">
                <p className="preview-modal-price">{formatFromPkr(product.basePricePkr)}</p>
                {product.compareAtPricePkr ? (
                  <p className="preview-modal-compare">
                    {formatFromPkr(product.compareAtPricePkr)}
                  </p>
                ) : null}
              </div>
              {savingsPkr > 0 ? (
                <p className="preview-modal-savings">
                  Save {formatFromPkr(savingsPkr)} on this item
                </p>
              ) : null}
            </div>

            <div className="preview-modal-meta">
              <p className="preview-modal-category">
                <span className="preview-modal-label">Category:</span> {product.category}
              </p>
              <p className="preview-modal-sku">
                <span className="preview-modal-label">SKU:</span> {product.sku}
              </p>
            </div>

            {product.variants.length > 0 ? (
              <div className="preview-modal-variants">
                {product.variants.map((variant) => (
                  <div className="preview-modal-variant-block" key={variant.id}>
                    <p className="preview-modal-variant-label">{variant.label}</p>
                    <div className="preview-modal-variant-options">
                      {variant.options.map((option) => (
                        <span className="preview-modal-variant-chip" key={option}>
                          {option}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="preview-modal-description">
              <p>{product.shortDescription}</p>
            </div>

            <div className="preview-modal-actions">
              <button
                className="btn-primary preview-modal-action-button"
                disabled={!isSignedIn}
                onClick={() => addToCart(product, 1)}
                type="button"
              >
                {isSignedIn ? "Add to cart" : "Sign in to add"}
              </button>
              <button
                className="btn-secondary preview-modal-action-button"
                disabled={!isSignedIn}
                onClick={() => toggle(product.slug)}
                type="button"
              >
                {isSignedIn
                  ? isWishlisted
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                  : "Sign in to save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
