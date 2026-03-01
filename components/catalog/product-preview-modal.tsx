"use client";

import Image from "next/image";
import { useEffect } from "react";

import { useCurrency } from "@/components/providers/currency-provider";
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

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
          <div className="preview-modal-images">
            <Image
              alt={product.name}
              className="preview-modal-image"
              height={500}
              src={product.images[0]}
              width={500}
            />
          </div>

          <div className="preview-modal-info">
            <h2 className="preview-modal-title">{product.name}</h2>
            <p className="preview-modal-price">{formatFromPkr(product.basePricePkr)}</p>
            <p className="preview-modal-category">
              <span className="preview-modal-label">Category:</span> {product.category}
            </p>
            <p className="preview-modal-sku">
              <span className="preview-modal-label">SKU:</span> {product.sku}
            </p>
            <div className="preview-modal-description">
              <p>{product.shortDescription}</p>
            </div>
            <div className="preview-modal-rating">
              <span>Rating: {product.rating.toFixed(1)}/5</span>
              <span>({product.reviewCount} reviews)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
