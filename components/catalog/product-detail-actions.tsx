"use client";

import { useState, useRef, useEffect } from "react";

import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { Product } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import { FrequentlyBoughtTogether } from "./frequently-bought-together";

export function ProductDetailActions({
  product,
  reviews,
}: {
  product: Product;
  reviews?: Product[`reviews`];
}) {
  const { addToCart } = useCart();
  const { formatFromPkr } = useCurrency();
  const { has, toggle } = useWishlist();
  const { isSignedIn } = useUser();
  const [quantity, setQuantity] = useState(1);
  const actionsRef = useRef<HTMLElement>(null);
  const [sticky, setSticky] = useState(false);

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

  return (
    <>
      <section ref={actionsRef} className="panel product-detail-actions">
        <p className="tiny">SKU: {product.sku}</p>
        <p className="product-price highlight">
          {formatFromPkr(product.basePricePkr)}
        </p>
        <div className="trust-indicators tiny">
          <span>🔒 Secure checkout</span> • <span>🚚 Fast shipping</span> •{" "}
          <span>🔄 Easy returns</span>
        </div>
        <p className="tiny">
          Rating {product.rating}/5 ({product.reviewCount} reviews)
        </p>
        <p className="tiny microcopy">
          Ships within 24 hours • Free shipping over €50
        </p>
        <p>{product.shortDescription}</p>

        <div className="variant-list">
          {product.variants.map((variant) => (
            <div key={variant.id}>
              <p className="tiny strong">{variant.label}</p>
              <div className="chip-row">
                {variant.options.map((option) => (
                  <span className="chip" key={option}>
                    {option}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* primary quantity and action buttons */}

        <label>
          Quantity
          <input
            min={1}
            onChange={(event) => setQuantity(Number(event.target.value))}
            type="number"
            value={quantity}
          />
        </label>
        <div className="action-row">
          <button
            className="btn-primary strong-cta"
            onClick={() => addToCart(product, quantity)}
            type="button"
            disabled={!isSignedIn}
          >
            {isSignedIn ? "Add to Cart" : "Sign in to add"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => toggle(product.slug)}
            type="button"
            disabled={!isSignedIn}
          >
            {isSignedIn
              ? has(product.slug)
                ? "Remove from Wishlist"
                : "Save to Wishlist"
              : "Sign in to save"}
          </button>
        </div>

        {/* frequently bought together moved below primary CTA to reduce clutter */}
        <FrequentlyBoughtTogether product={product} />

        {/* reviews live in fixed-height box next to gallery */}
        {reviews && reviews.length > 0 && (
          <section id="reviews" className="reviews-panel">
            <h4>Customer Reviews</h4>
            <div className="review-highlight">
              <strong>Most helpful review</strong>
              <div>
                <p className="tiny">
                  {reviews[0].author} — Rating: {reviews[0].rating}/5
                </p>
                <p>{reviews[0].comment}</p>
              </div>
            </div>
            <div className="review-list">
              {reviews.map((r) => (
                <article className="review-item" key={r.id}>
                  <strong>{r.headline}</strong>
                  <p className="tiny">
                    {r.author} | {r.date} | Rating: {r.rating}/5
                  </p>
                  <p>{r.comment}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      {sticky && (
        <div className="sticky-addbar">
          <div className="action-row">
            <span className="product-price highlight">
              {formatFromPkr(product.basePricePkr)}
            </span>
            <button
              className="btn-primary strong-cta"
              onClick={() => addToCart(product, quantity)}
              type="button"
              disabled={!isSignedIn}
            >
              {isSignedIn ? "Add" : "Sign in"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
