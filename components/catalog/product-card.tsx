"use client";

import Link from "next/link";
import { useState } from "react";

import { ProductPreviewModal } from "@/components/catalog/product-preview-modal";
import { useMounted } from "@/components/hooks/useMounted";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { HeartIcon } from "@/components/ui/icons";
import { CartIcon } from "@/components/ui/icons";
import { FormattedDescription } from "@/components/ui/formatted-description";
import { ProductMedia } from "@/components/ui/product-media";
import { getProductImageSrc } from "@/lib/image-utils";
import { FiCheck } from "react-icons/fi";
import { Product } from "@/lib/types";
import { useUser } from "@clerk/nextjs";

export function ProductCard({ product }: { product: Product }) {
  const { formatFromUsd } = useCurrency();
  const { addToCart, items } = useCart();
  const { has: hasInWishlist, toggle } = useWishlist();
  const isFavorited = hasInWishlist(product.slug);
  const { isSignedIn } = useUser();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const mounted = useMounted();
  const isInCart = items.some((item) => item.productSlug === product.slug);
  const primaryImage = getProductImageSrc(product.images[0]);

  return (
    <>
      <article className="product-card reveal">
        <Link href={`/products/${product.slug}`} className="product-link">
          <div className="product-image-wrap relative">
            <ProductMedia
              alt={product.name}
              className="product-image"
              height={420}
              src={primaryImage}
              width={640}
            />
            {isSignedIn ? (
              <button
                type="button"
                aria-label={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
                className={
                  isFavorited
                    ? "product-wishlist product-wishlist-active"
                    : "product-wishlist"
                }
                onClick={(e) => {
                  // prevent the surrounding link from firing
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(product.slug);
                }}
              >
                <HeartIcon
                  aria-hidden="true"
                  className={isFavorited ? "fill-current" : undefined}
                />
              </button>
            ) : null}
          </div>
          <div className="product-body">
            <p className="product-meta">
              <span>{product.category}</span>
              <span>{product.sku}</span>
            </p>
            <h3>{product.name}</h3>
            <FormattedDescription
              className="product-description"
              compact
              text={product.shortDescription}
            />
            <p className="product-price">
              {mounted
                ? formatFromUsd(product.basePriceUsd)
                : `$${product.basePriceUsd.toFixed(2)}`}
            </p>
          </div>
        </Link>
        <div className={isSignedIn ? "product-actions" : "product-actions product-actions-single"}>
          {isSignedIn ? (
            <button
              className="btn-primary product-card-action-btn"
              onClick={() => {
                addToCart(product, 1);
              }}
              type="button"
              aria-pressed={isInCart}
            >
              <span className="inline-flex items-center gap-1">
                {isInCart ? (
                  <FiCheck className="h-3.5 w-3.5" />
                ) : (
                  <CartIcon className="h-3.5 w-3.5" />
                )}
                <span className="product-card-action-label-full">
                  {isInCart ? "Added" : "Add to Cart"}
                </span>
                <span className="product-card-action-label-compact">
                  {isInCart ? "Added" : "Cart"}
                </span>
              </span>
            </button>
          ) : null}
          <button
            className="btn-secondary product-card-action-btn"
            onClick={() => setIsPreviewOpen(true)}
            type="button"
          >
            See Preview
          </button>
        </div>
      </article>

      <ProductPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        product={product}
        key={`${product.slug}-${isPreviewOpen ? "open" : "closed"}`}
      />
    </>
  );
}
