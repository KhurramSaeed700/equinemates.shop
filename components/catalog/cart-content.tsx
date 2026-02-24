"use client";

import Link from "next/link";

import { CheckoutForm } from "@/components/forms/checkout-form";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";

export function CartContent() {
  const { items, removeFromCart, setQuantity, subtotalPkr } = useCart();
  const { formatFromPkr } = useCurrency();

  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Cart Items</h2>
        {!items.length ? (
          <p>
            Your cart is empty. Add products from <Link className="text-link" href="/products">the catalog</Link>.
          </p>
        ) : (
          <div className="review-list">
            {items.map((item) => (
              <article className="review-item" key={item.productSlug}>
                <div className="action-row">
                  <strong>{item.name}</strong>
                  <span className="tiny">{item.sku}</span>
                </div>
                <p className="tiny">
                  Unit price: {formatFromPkr(item.unitPricePkr)} | Subtotal:{" "}
                  {formatFromPkr(item.unitPricePkr * item.quantity)}
                </p>
                <div className="action-row">
                  <label>
                    Qty
                    <input
                      min={1}
                      onChange={(event) =>
                        setQuantity(item.productSlug, Number(event.target.value))
                      }
                      type="number"
                      value={item.quantity}
                    />
                  </label>
                  <button
                    className="btn-secondary"
                    onClick={() => removeFromCart(item.productSlug)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="product-price">Subtotal: {formatFromPkr(subtotalPkr)}</p>
        <p className="tiny">
          Shipping supports Pakistan nationwide with city-based rate adjustments.
        </p>
      </section>

      <CheckoutForm />
    </div>
  );
}
