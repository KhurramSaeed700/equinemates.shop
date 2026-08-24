"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { useCatalogProducts } from "@/components/hooks/useCatalogProducts";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useMounted } from "@/components/hooks/useMounted";
import { getProductImageSrc } from "@/lib/image-utils";
import { ProductMedia } from "@/components/ui/product-media";

type RecentlyViewedVariant = "cart" | "catalog";

function useMediaQuery(query: string | undefined) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!query) {
      return () => {};
    }

    const mediaQuery = window.matchMedia(query);
    mediaQuery.addEventListener("change", onStoreChange);

    return () => {
      mediaQuery.removeEventListener("change", onStoreChange);
    };
  }, [query]);

  const getSnapshot = useCallback(() => {
    if (!query) return true;
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => !query);
}

export function RecentlyViewedSection({
  activeMediaQuery,
  className,
  limit,
  showWhenEmpty = false,
  variant = "cart",
}: {
  activeMediaQuery?: string;
  className?: string;
  limit?: number;
  showWhenEmpty?: boolean;
  variant?: RecentlyViewedVariant;
}) {
  const { slugs, clear } = useRecentlyViewed();
  const isActive = useMediaQuery(activeMediaQuery);
  const { products } = useCatalogProducts({
    slugs,
    enabled: isActive && slugs.length > 0,
  });
  const { addToCart } = useCart();
  const { formatFromUsd } = useCurrency();
  const mounted = useMounted();
  const [showAll, setShowAll] = useState(false);
  const visibleProducts = useMemo(() => {
    if (!limit || showAll) {
      return products;
    }

    return products.slice(0, limit);
  }, [limit, products, showAll]);

  if (!isActive || (!showWhenEmpty && !products.length)) return null;

  if (variant === "catalog") {
    const hasProducts = products.length > 0;
    const canViewAll = Boolean(limit && products.length > limit);

    return (
      <section
        aria-label="Last viewed products"
        className={[
          "last-viewed-products",
          className,
        ].filter(Boolean).join(" ")}
      >
        <div className="last-viewed-products-header">
          <h2>Last Viewed Products</h2>
          <div className="last-viewed-products-actions">
            {hasProducts && canViewAll ? (
              <button
                className="last-viewed-products-link"
                onClick={() => setShowAll((current) => !current)}
                type="button"
              >
                {showAll ? "Show less" : "View all"}
              </button>
            ) : null}
            {hasProducts ? (
              <button
                className="last-viewed-products-link"
                onClick={clear}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
        {hasProducts ? (
          <div className="last-viewed-products-list">
            {visibleProducts.map((product) => (
              <Link
                className="last-viewed-product"
                href={`/products/${product.slug}`}
                key={product.id}
              >
                <ProductMedia
                  alt={product.name}
                  className="last-viewed-product-image"
                  height={74}
                  src={getProductImageSrc(product.images[0])}
                  width={74}
                />
                <span className="last-viewed-product-copy">
                  <strong>{product.name}</strong>
                  <span>Item No. {product.sku}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="last-viewed-products-empty">View a product to see it here.</p>
        )}
      </section>
    );
  }

  return (
    <section className="section-spacing">
      <h2>Recently Viewed</h2>
      <div className="product-grid small-grid">
        {products.map((product) => (
          <article className="product-card small" key={product.id}>
            <Link href={`/products/${product.slug}`} className="product-link">
              <ProductMedia
                alt={product.name}
                className="product-image"
                height={100}
                src={getProductImageSrc(product.images[0])}
                width={160}
              />
              <p className="product-meta small">{product.category}</p>
              <h3>{product.name}</h3>
              <p className="product-price small">
                {mounted
                  ? formatFromUsd(product.basePriceUsd)
                  : `$${product.basePriceUsd.toFixed(2)}`}
              </p>
            </Link>
            <button
              className="btn-secondary compact"
              onClick={() => addToCart(product, 1)}
              type="button"
            >
              Add
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
