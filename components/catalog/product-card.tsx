"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { HeartIcon } from "@/components/ui/icons";
import { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { formatFromPkr } = useCurrency();
  const { addToCart } = useCart();
  const { toggle, has } = useWishlist();
  const wished = has(product.slug);

  return (
    <article className="product-card reveal">
      <Link href={`/products/${product.slug}`} className="product-image-wrap">
        <button
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className="product-wishlist"
          onClick={(event) => {
            event.preventDefault();
            toggle(product.slug);
          }}
          type="button"
        >
          <HeartIcon height={14} width={14} />
        </button>
        <Image
          alt={product.name}
          className="product-image"
          height={420}
          src={product.images[0]}
          width={640}
        />
      </Link>
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
            Quick Add
          </button>
          <Link className="btn-secondary" href={`/products/${product.slug}`}>
            View Product
          </Link>
          <button
            className="btn-secondary"
            onClick={() => toggle(product.slug)}
            type="button"
          >
            {wished ? "Saved" : "Wishlist"}
          </button>
        </div>
      </div>
    </article>
  );
}
