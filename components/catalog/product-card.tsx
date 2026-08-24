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
import { FiStar } from "react-icons/fi";
import { Product } from "@/lib/types";
import { useUser } from "@clerk/nextjs";

const cardZoomSkus = new Set(["EQM-1799-C"]);

export function ProductCard({ product }: { product: Product }) {
  const { formatFromPkr, formatFromUsd } = useCurrency();
  const { addToCart, items } = useCart();
  const { has: hasInWishlist, toggle } = useWishlist();
  const isFavorited = hasInWishlist(product.slug);
  const { isSignedIn } = useUser();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const mounted = useMounted();
  const isInCart = items.some((item) => item.productSlug === product.slug);
  const primaryImage = getProductImageSrc(product.images[0]);
  const secondaryImage = product.images
    .slice(1)
    .map((image) => getProductImageSrc(image))
    .find((image) => image !== primaryImage);
  const childListings = (product.listingVariations ?? []).filter(
    (variation) => variation.slug !== product.slug,
  );
  const visibleChildListings = childListings.slice(0, 4);
  const hiddenChildCount = Math.max(
    0,
    childListings.length - visibleChildListings.length,
  );
  const hasDiscount =
    typeof product.compareAtPricePkr === "number" &&
    product.compareAtPricePkr > product.basePricePkr;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compareAtPricePkr! - product.basePricePkr) /
          product.compareAtPricePkr!) *
          100,
      )
    : 0;

  return (
    <>
      <article
        className={
          secondaryImage
            ? "product-card product-card-has-secondary-image reveal"
            : "product-card product-card-single-image reveal"
        }
      >
        <Link href={`/products/${product.slug}`} className="product-link">
          <div className="product-image-wrap relative">
            <ProductMedia
              alt={product.name}
              className={
                cardZoomSkus.has(product.sku)
                  ? "product-image product-card-image product-card-image-primary product-image-card-zoom"
                  : "product-image product-card-image product-card-image-primary"
              }
              height={420}
              src={primaryImage}
              width={640}
            />
            {secondaryImage ? (
              <ProductMedia
                alt=""
                className="product-image product-card-image product-card-image-secondary"
                height={420}
                src={secondaryImage}
                width={640}
              />
            ) : null}
            <div className="product-card-badges">
              {hasDiscount ? <span className="product-sale-badge">Sale</span> : null}
              {!hasDiscount && product.isNewArrival ? (
                <span className="product-new-badge">New</span>
              ) : null}
            </div>
            {childListings.length ? (
              <div
                aria-label={`${childListings.length} listing variations`}
                className="product-parent-listing-mark"
              >
                <span className="product-child-thumbnails" role="list">
                  {visibleChildListings.map((variation) => (
                    <span
                      className="product-child-thumbnail"
                      key={variation.id}
                      role="listitem"
                      title={variation.name}
                    >
                      <ProductMedia
                        alt=""
                        className="product-child-thumbnail-image"
                        height={48}
                        sizes="40px"
                        src={getProductImageSrc(variation.images[0])}
                        width={48}
                      />
                    </span>
                  ))}
                  {hiddenChildCount ? (
                    <span
                      aria-label={`${hiddenChildCount} more variations`}
                      className="product-child-thumbnail product-child-thumbnail-more"
                      role="listitem"
                    >
                      +{hiddenChildCount}
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
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
            <div className="product-card-pricing">
              <p className="product-price">
                {childListings.length ? <span>From </span> : null}
                {mounted
                  ? formatFromUsd(product.basePriceUsd)
                  : `$${product.basePriceUsd.toFixed(2)}`}
              </p>
              {hasDiscount && mounted ? (
                <p className="product-card-savings">
                  <span className="product-compare-price">
                    Was {formatFromPkr(product.compareAtPricePkr!)}
                  </span>
                  <span>Save {discountPercent}%</span>
                </p>
              ) : null}
            </div>
            <p className="product-card-rating" aria-label={`${product.rating.toFixed(1)} out of 5 stars, ${product.reviewCount} reviews`}>
              <span className="product-card-stars" aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <FiStar
                    className={index < Math.round(product.rating) ? "is-filled" : undefined}
                    key={index}
                  />
                ))}
              </span>
              <span>{product.reviewCount ? `(${product.reviewCount})` : "No reviews"}</span>
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
