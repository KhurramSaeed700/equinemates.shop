"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { FormattedDescription } from "@/components/ui/formatted-description";
import { HeartIcon } from "@/components/ui/icons";
import { NativeSelect } from "@/components/ui/native-select";
import { ProductMedia } from "@/components/ui/product-media";
import { getProductImageSrc } from "@/lib/image-utils";
import { Product } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import { FrequentlyBoughtTogether } from "./frequently-bought-together";
import { useProductVariationPreview } from "./product-variation-preview";

function getListingStyle(name: string) {
  const bracketedStyle = name.match(/(?:\(([^()]+)\)|\[([^[\]]+)\])\s*$/);

  return bracketedStyle?.[1]?.trim() || bracketedStyle?.[2]?.trim() || name;
}

export function ProductDetailActions({
  product,
}: {
  product: Product;
}) {
  const { addToCart } = useCart();
  const router = useRouter();
  const { formatFromUsd } = useCurrency();
  const { has, toggle } = useWishlist();
  const { isSignedIn } = useUser();
  const {
    clearPreviewVariation,
    previewVariation,
    previewVariationBySlug,
  } = useProductVariationPreview();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        product.variants.map((variant) => [variant.id, variant.options[0] ?? ""]),
      ),
  );
  const actionsRef = useRef<HTMLElement>(null);
  const [sticky, setSticky] = useState(false);
  const displayName = previewVariation?.name ?? product.name;
  const displaySku = previewVariation?.sku ?? product.sku;
  const displayAsin = previewVariation?.amazonAsin ?? product.amazonAsin;
  const displayPriceUsd = previewVariation?.basePriceUsd ?? product.basePriceUsd;
  const displayStock = previewVariation?.stock ?? product.stock;
  const isInStock = displayStock > 0;
  const hasAmazonFallback =
    product.amazonMcfEnabled
    && product.amazonFulfillableQuantity > 0
    && Boolean(product.amazonStoreUrl);
  const listingVariations = product.listingVariations ?? [];
  const currentListingVariation = listingVariations.find(
    (variation) => variation.slug === product.slug,
  );
  const displayListingVariation = previewVariation ?? currentListingVariation;

  useEffect(() => {
    const handle = () => {
      if (actionsRef.current) {
        const { top } = actionsRef.current.getBoundingClientRect();
        setSticky(top > window.innerHeight - 120);
      }
    };
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => current + 1);
  };

  const addSelectedProductToCart = () => {
    if (!isSignedIn) {
      router.push("/account");
      return false;
    }

    addToCart(product, quantity);
    return true;
  };

  const buyNow = () => {
    if (addSelectedProductToCart()) {
      router.push("/cart");
    }
  };

  return (
    <>
      <section ref={actionsRef} className="panel product-detail-actions">
        <div className="product-detail-title-row">
          <h1
            className="product-detail-purchase-title"
            style={{
              fontSize: "clamp(1.55rem, 2.1vw, 2.25rem)",
              letterSpacing: 0,
              lineHeight: 1.08,
              maxWidth: "22ch",
            }}
          >
            {displayName}
          </h1>
          {isSignedIn ? (
            <button
              aria-label={
                has(product.slug)
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
              aria-pressed={has(product.slug)}
              className="product-detail-favorite"
              onClick={() => toggle(product.slug)}
              title={
                has(product.slug)
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
              type="button"
            >
              <HeartIcon aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="product-detail-meta">SKU: {displaySku}</p>
        {displayAsin ? (
          <p className="product-detail-meta">ASIN: {displayAsin}</p>
        ) : null}
        <p
          className="product-price highlight"
          style={{ fontSize: "clamp(1.25rem, 1.5vw, 1.55rem)" }}
        >
          {formatFromUsd(displayPriceUsd)}
        </p>
        <p className="product-tax-shipping-note">
          Tax included. Shipping calculated at checkout.
        </p>
        <p className="product-detail-meta">
          Rating {product.rating.toFixed(1)}/5 ({product.reviewCount} reviews)
        </p>
        {listingVariations.length > 1 ? (
          <div className="product-listing-variations">
            <p className="product-listing-variations-label">
              <span>Style:</span>{" "}
              <strong>
                {getListingStyle(
                  displayListingVariation?.name ?? product.name,
                )}
              </strong>
            </p>
            <div
              aria-label="Choose a product variation"
              className="product-listing-variation-list"
              role="list"
            >
              {listingVariations.map((variation) => {
                const isCurrent = variation.slug === product.slug;
                const variationLabel = [
                  variation.name,
                  formatFromUsd(variation.basePriceUsd),
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Link
                    aria-label={variationLabel}
                    aria-current={isCurrent ? "page" : undefined}
                    className={
                      isCurrent
                        ? "product-listing-variation is-current"
                        : "product-listing-variation"
                    }
                    href={`/products/${encodeURIComponent(variation.slug)}`}
                    key={variation.id}
                    onBlur={clearPreviewVariation}
                    onFocus={() => previewVariationBySlug(variation.slug)}
                    onPointerEnter={() => previewVariationBySlug(variation.slug)}
                    onPointerLeave={clearPreviewVariation}
                    role="listitem"
                    scroll={false}
                    title={variationLabel}
                  >
                    <span className="product-listing-variation-media">
                      {variation.images[0] ? (
                        <ProductMedia
                          alt=""
                          height={88}
                          sizes="88px"
                          src={getProductImageSrc(variation.images[0])}
                          width={88}
                        />
                      ) : (
                        <span aria-hidden="true">No image</span>
                      )}
                    </span>
                    <span className="product-listing-variation-copy">
                      <strong>{formatFromUsd(variation.basePriceUsd)}</strong>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {product.variants.length > 0 ? (
          <div className="product-variant-selectors">
            {product.variants.map((variant) => (
              <label className="product-variant-field" key={variant.id}>
                <span>{variant.label}</span>
                <NativeSelect
                  onChange={(event) =>
                    setSelectedVariants((currentSelections) => ({
                      ...currentSelections,
                      [variant.id]: event.currentTarget.value,
                    }))
                  }
                  value={selectedVariants[variant.id] ?? variant.options[0] ?? ""}
                >
                  {variant.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            ))}
          </div>
        ) : null}

        <p className={isInStock ? "product-stock-line is-in-stock" : "product-stock-line"}>
          <span aria-hidden="true" />
          {isInStock ? "In stock, ready to ship" : "Out of stock"}
        </p>
        {!isInStock && hasAmazonFallback ? (
          <div className="amazon-fallback-box">
            <p>
              Available from our Amazon inventory:{" "}
              <strong>{product.amazonFulfillableQuantity}</strong>
            </p>
            <Link
              className="btn-secondary"
              href={product.amazonStoreUrl ?? "#"}
              rel="noreferrer"
              target="_blank"
            >
              Buy from Amazon
            </Link>
          </div>
        ) : null}

        <label className="quantity-label">
          <span>Quantity</span>
          <div className="quantity-stepper">
            <button className="qty-btn" onClick={decreaseQuantity} type="button">
              -
            </button>
            <span className="qty-value">{quantity}</span>
            <button className="qty-btn" onClick={increaseQuantity} type="button">
              +
            </button>
          </div>
        </label>

        <div className="product-purchase-actions">
          <button
            className="btn-secondary strong-cta"
            disabled={!isInStock && !hasAmazonFallback}
            onClick={addSelectedProductToCart}
            type="button"
          >
            Add to Cart
          </button>
          <button
            className="btn-primary strong-cta"
            disabled={!isInStock && !hasAmazonFallback}
            onClick={buyNow}
            type="button"
          >
            Buy Now
          </button>
        </div>
        {!isSignedIn ? (
          <p className="auth-gate-hint tiny">
            <Link className="text-link" href="/account">
              Sign in
            </Link>{" "}
            to purchase this product or add it to your wishlist.
          </p>
        ) : null}

        <FormattedDescription
          className="product-detail-summary"
          text={product.shortDescription}
        />

        <FrequentlyBoughtTogether product={product} />

      </section>

      {sticky && isSignedIn ? (
        <div className="sticky-addbar">
          <div className="action-row">
            <span className="product-price highlight">{formatFromUsd(product.basePriceUsd)}</span>
            <button
              className="btn-primary strong-cta"
              onClick={() => addToCart(product, quantity)}
              type="button"
            >
              Add
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
