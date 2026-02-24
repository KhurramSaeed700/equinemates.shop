"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ProductPreviewModal } from "@/components/catalog/product-preview-modal";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { formatFromPkr } = useCurrency();
  const { addToCart } = useCart();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <article className="product-card reveal">
        <div className="product-image-wrap">
          <Image
            alt={product.name}
            className="product-image"
            height={420}
            src={product.images[0]}
            width={640}
          />
        </div>
      <div className="product-body">
        <p className="product-meta">
          <span>{product.category}</span>
          <span>{product.sku}</span>
        </p>
        <Link href={`/products/${product.slug}`} className="product-title-link">
          <h3>{product.name}</h3>
        </Link>
        <p className="product-description">{product.shortDescription}</p>
        <p className="product-price">{formatFromPkr(product.basePricePkr)}</p>
        <div className="product-actions">
          <button
            className="btn-primary"
            onClick={() => addToCart(product, 1)}
            type="button"
          >
            Add to Cart
          </button>
          <button
            className="btn-secondary"
            onClick={() => setIsPreviewOpen(true)}
            type="button"
          >
            See Preview
          </button>
        </div>
      </div>
    </article>

      <ProductPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        product={product}
      />
    </>
  );
}
