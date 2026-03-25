"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { ProductCard } from "@/components/catalog/product-card";
import { Product } from "@/lib/types";

export function ProductGrid({
  products,
  emptyLabel = "No products found for this filter.",
  showAuthHint = false,
}: {
  products: Product[];
  emptyLabel?: string;
  showAuthHint?: boolean;
}) {
  const { isSignedIn } = useUser();

  if (!products.length) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <>
      {showAuthHint && !isSignedIn ? (
        <p className="auth-gate-hint auth-gate-hint-banner tiny">
          <Link className="text-link" href="/account">
            Sign in
          </Link>{" "}
          to unlock cart and wishlist actions.
        </p>
      ) : null}
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
