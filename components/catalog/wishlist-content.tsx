"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { ProductCard } from "@/components/catalog/product-card";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { PRODUCTS } from "@/lib/catalog";

export function WishlistContent() {
  const { isSignedIn } = useUser();
  const { productSlugs, clearWishlist } = useWishlist();
  const products = PRODUCTS.filter((product) =>
    productSlugs.includes(product.slug),
  );

  if (!isSignedIn) {
    return (
      <section className="panel">
        <h2>Saved Products</h2>
        <p>
          Please{" "}
          <Link className="text-link" href="/account">
            sign in
          </Link>{" "}
          to save items or view your wishlist.
        </p>
      </section>
    );
  }

  if (!products.length) {
    return (
      <section className="panel">
        <h2>Saved Products</h2>
        <p>
          Your wishlist is empty. Save products and they remain synced locally
          across sessions.
        </p>
        <Link className="btn-primary" href="/products">
          Browse Catalog
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="action-row wishlist-header-row">
        <h2>Saved Products</h2>
        <button
          className="empty-wishlist-btn"
          onClick={() => {
            if (!products.length) return;
            if (window.confirm("Empty wishlist? This will remove all saved items.")) {
              clearWishlist();
            }
          }}
          type="button"
          aria-disabled={!products.length}
        >
          Empty wishlist
        </button>
      </div>
      <p className="tiny">
        Wishlist sync across devices is supported through the account API layer.
      </p>
      <div className="product-grid section-spacing">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
