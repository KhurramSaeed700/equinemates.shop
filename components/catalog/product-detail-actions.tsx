"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { Product } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import { FrequentlyBoughtTogether } from "./frequently-bought-together";

export function ProductDetailActions({
  product,
}: {
  product: Product;
}) {
  const { addToCart } = useCart();
  const { formatFromUsd } = useCurrency();
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

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => current + 1);
  };

  return (
    <>
      <section ref={actionsRef} className="panel product-detail-actions">
        <p className="tiny">SKU: {product.sku}</p>
        <p className="product-price highlight">{formatFromUsd(product.basePriceUsd)}</p>
        <p className="tiny">
          Rating {product.rating.toFixed(1)}/5 ({product.reviewCount} reviews)
        </p>
        <p>{product.shortDescription}</p>

        {product.variants.length > 0 ? (
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
        ) : null}

        <label className="quantity-label">
          <span>Quantity</span>
          <div className="quantity-stepper">
            <button className="qty-btn" onClick={decreaseQuantity} type="button">
              -
            </button>
            <span className="qty-value">{quantity}</span>
            <button className="qty-btn" onClick={increaseQuantity} type="button">
              +
            </button>
          </div>
        </label>

        {isSignedIn ? (
          <div className="action-row">
            <button
              className="btn-primary strong-cta"
              onClick={() => addToCart(product, quantity)}
              type="button"
            >
              Add to Cart
            </button>
            <button
              className="btn-secondary"
              onClick={() => toggle(product.slug)}
              type="button"
            >
              {has(product.slug) ? "Remove from Wishlist" : "Save to Wishlist"}
            </button>
          </div>
        ) : null}
        {!isSignedIn ? (
          <p className="auth-gate-hint tiny">
            <Link className="text-link" href="/account">
              Sign in
            </Link>{" "}
            to add this product to cart or wishlist.
          </p>
        ) : null}

        <FrequentlyBoughtTogether product={product} />

      </section>

      {sticky && isSignedIn ? (
        <div className="sticky-addbar">
          <div className="action-row">
            <span className="product-price highlight">{formatFromUsd(product.basePriceUsd)}</span>
            <button
              className="btn-primary strong-cta"
              onClick={() => addToCart(product, quantity)}
              type="button"
            >
              Add
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
