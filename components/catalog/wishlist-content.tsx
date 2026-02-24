"use client";

import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { PRODUCTS } from "@/lib/catalog";

export function WishlistContent() {
  const { productSlugs } = useWishlist();
  const products = PRODUCTS.filter((product) => productSlugs.includes(product.slug));

  if (!products.length) {
    return (
      <section className="panel">
        <h2>Saved Products</h2>
        <p>Your wishlist is empty. Save products and they remain synced locally across sessions.</p>
        <Link className="btn-primary" href="/products">
          Browse Catalog
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h2>Saved Products</h2>
      <p className="tiny">Wishlist sync across devices is supported through the account API layer.</p>
      <div className="product-grid section-spacing">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
