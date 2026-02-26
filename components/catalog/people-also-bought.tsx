"use client";

import Link from "next/link";
import { PRODUCTS } from "@/lib/catalog";
import { CartItem, Product } from "@/lib/types";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useMounted } from "@/components/hooks/useMounted";

interface PeopleAlsoBoughtProps {
  items: CartItem[];
}

export function PeopleAlsoBought({ items }: PeopleAlsoBoughtProps) {
  const { addToCart } = useCart();
  const { formatFromPkr } = useCurrency();
  const mounted = useMounted();

  // compute related slugs
  const related: Product[] = [];
  const already = new Set(items.map((i) => i.productSlug));

  items.forEach((item) => {
    const prod = PRODUCTS.find((p) => p.slug === item.productSlug);
    if (prod && prod.relatedSlugs) {
      prod.relatedSlugs.forEach((slug) => {
        if (!already.has(slug) && !related.find((p) => p.slug === slug)) {
          const p2 = PRODUCTS.find((q) => q.slug === slug);
          if (p2) related.push(p2);
        }
      });
    }
  });

  // if none found, pick random excluding cart items
  if (!related.length) {
    const pool = PRODUCTS.filter((p) => !already.has(p.slug));
    while (related.length < 6 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      related.push(pool.splice(idx, 1)[0]);
    }
  }

  if (!related.length) return null;

  return (
    <section className="section-spacing">
      <h2>People Also Bought</h2>
      <div className="product-grid rec-grid">
        {related.map((product) => (
          <article className="product-card rec" key={product.id}>
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
