"use client";

import Link from "next/link";

import { CheckoutForm } from "@/components/forms/checkout-form";
import { PeopleAlsoBought } from "./people-also-bought";
import { RecentlyViewedSection } from "./recently-viewed";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useUser } from "@clerk/nextjs";
import { PRODUCTS } from "@/lib/catalog";

export function CartContent() {
  const { items, removeFromCart, setQuantity, subtotalPkr, clearCart } =
    useCart();
  const { formatFromPkr } = useCurrency();
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <section className="panel">
        <div className="action-row">
          <h2>Cart Items</h2>
          <div>
            <button
              className="btn-ghost"
              onClick={() => {
                if (!items.length) return;
                if (window.confirm("Empty cart? This will remove all items.")) {
                  clearCart();
                }
              }}
              type="button"
              aria-disabled={!items.length}
            >
              Empty cart
            </button>
          </div>
        </div>
        <p>
          Please{" "}
          <Link className="text-link" href="/sign-in">
            sign in
          </Link>{" "}
          to view or add items to your cart.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="grid-two cart-grid">
        <section className="panel">
          <div className="action-row wishlist-header-row">
            <h2>Cart Items</h2>
            <button
              className="empty-wishlist-btn"
              onClick={() => {
                if (!items.length) return;
                if (window.confirm("Empty cart? This will remove all items.")) {
                  clearCart();
                }
              }}
              type="button"
              aria-disabled={!items.length}
            >
              Empty cart
            </button>
          </div>
          {!items.length ? (
            <p>
              Your cart is empty. Add products from{" "}
              <Link className="text-link" href="/products">
                the catalog
              </Link>
              .
            </p>
          ) : (
            <div className="review-list">
              {items.map((item) => {
                const product = PRODUCTS.find(
                  (p) => p.slug === item.productSlug,
                );
                const imageSrc =
                  product?.images?.[0] || "/products/placeholder.svg";
                return (
                  <article
                    className="review-item cart-item"
                    key={item.productSlug}
                  >
                    <img
                      src={imageSrc}
                      alt={item.name}
                      className="cart-item-image"
                    />
                    <div className="cart-item-details">
                      <div className="action-row">
                        <strong>{item.name}</strong>
                        <span className="tiny">{item.sku}</span>
                      </div>
                      <p className="item-price-large">
                        {formatFromPkr(item.unitPricePkr)}
                      </p>
                      <div className="action-row qty-controls">
                        <button
                          className="btn-secondary compact"
                          onClick={() => {
                            const newQty = item.quantity - 1;
                            if (newQty <= 0) {
                              removeFromCart(item.productSlug);
                            } else {
                              setQuantity(item.productSlug, newQty);
                            }
                          }}
                          type="button"
                        >
                          –
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="btn-secondary compact"
                          onClick={() =>
                            setQuantity(item.productSlug, item.quantity + 1)
                          }
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <p className="tiny">
                        Subtotal:{" "}
                        {formatFromPkr(item.unitPricePkr * item.quantity)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="product-price">
            Subtotal: {formatFromPkr(subtotalPkr)}
          </p>
          <p className="tiny">
            Shipping supports Pakistan nationwide with city-based rate
            adjustments.
          </p>
        </section>

        <CheckoutForm />
      </div>

      {/* secondary sections */}
      <PeopleAlsoBought items={items} />
      <RecentlyViewedSection />
    </>
  );
}
