"use client";

import { useState } from "react";

import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { Product } from "@/lib/types";

export function ProductDetailActions({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { formatFromPkr } = useCurrency();
  const { has, toggle } = useWishlist();
  const [quantity, setQuantity] = useState(1);

  return (
    <section className="panel product-detail-actions">
      <p className="tiny">SKU: {product.sku}</p>
      <p className="product-price">{formatFromPkr(product.basePricePkr)}</p>
      <p className="tiny">
        Rating {product.rating}/5 ({product.reviewCount} reviews)
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
          className="btn-primary"
          onClick={() => addToCart(product, quantity)}
          type="button"
        >
          Add to Cart
        </button>
        <button className="btn-secondary" onClick={() => toggle(product.slug)} type="button">
          {has(product.slug) ? "Remove from Wishlist" : "Save to Wishlist"}
        </button>
      </div>
    </section>
  );
}
