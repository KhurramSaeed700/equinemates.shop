"use client";

import Link from "next/link";
import { PRODUCTS } from "@/lib/catalog";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { Product } from "@/lib/types";
import { useMounted } from "@/components/hooks/useMounted";

export function CustomersAlsoBought({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { formatFromPkr } = useCurrency();
  const mounted = useMounted();

  // simple heuristic: take relatedSlugs, else random
  const related = product.relatedSlugs
    ?.map((s) => PRODUCTS.find((p) => p.slug === s))
    .filter(Boolean) as Product[];
  const pool = related.length
    ? related
    : PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 8);

  if (!pool.length) return null;

  return (
    <section className="section-spacing">
      <h3>Customers Also Bought</h3>
      <div className="product-grid rec-grid customers-also">
        {pool.slice(0, 8).map((p) => (
          <article key={p.id} className="product-card rec compact">
            <Link href={`/products/${p.slug}`} className="product-link">
              <img src={p.images[0]} alt={p.name} />
              <h4>{p.name}</h4>
              <p className="product-price small">
                {mounted
                  ? formatFromPkr(p.basePricePkr)
                  : `Rs ${p.basePricePkr}`}
              </p>
            </Link>
            <button
              className="btn-secondary compact"
              onClick={() => addToCart(p, 1)}
            >
              Quick Add
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
