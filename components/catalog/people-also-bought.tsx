"use client";

import Link from "next/link";
import { useCatalogProducts } from "@/components/hooks/useCatalogProducts";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useMounted } from "@/components/hooks/useMounted";
import { getProductImageSrc } from "@/lib/image-utils";
import { CartItem } from "@/lib/types";

interface PeopleAlsoBoughtProps {
  items: CartItem[];
}

export function PeopleAlsoBought({ items }: PeopleAlsoBoughtProps) {
  const { addToCart } = useCart();
  const { formatFromUsd } = useCurrency();
  const mounted = useMounted();
  const itemSlugs = items.map((item) => item.productSlug);
  const { products: related } = useCatalogProducts({
    slugs: itemSlugs,
    excludeSlugs: itemSlugs,
    limit: 6,
    mode: "related",
    enabled: itemSlugs.length > 0,
  });

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
                src={getProductImageSrc(product.images[0])}
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
