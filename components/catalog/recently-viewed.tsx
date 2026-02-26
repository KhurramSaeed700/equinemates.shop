"use client";

import Link from "next/link";
import { PRODUCTS } from "@/lib/catalog";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useEffect } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useMounted } from "@/components/hooks/useMounted";

export function RecentlyViewedSection() {
  const { slugs } = useRecentlyViewed();
  const products = PRODUCTS.filter((p) => slugs.includes(p.slug));
  const { addToCart } = useCart();
  const { formatFromPkr } = useCurrency();
  const mounted = useMounted();

  if (!products.length) return null;

  return (
    <section className="section-spacing">
      <h2>Recently Viewed</h2>
      <div className="product-grid small-grid">
        {products.map((product) => (
          <article className="product-card small" key={product.id}>
            <Link href={`/products/${product.slug}`} className="product-link">
              <img
                alt={product.name}
                className="product-image"
                src={product.images[0]}
              />
              <p className="product-meta small">{product.category}</p>
              <h3>{product.name}</h3>
              <p className="product-price small">
                {mounted
                  ? formatFromPkr(product.basePricePkr)
                  : `Rs ${product.basePricePkr}`}
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
