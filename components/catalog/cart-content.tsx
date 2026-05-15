"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CheckoutForm } from "@/components/forms/checkout-form";
import { useCatalogProducts } from "@/components/hooks/useCatalogProducts";
import { PeopleAlsoBought } from "./people-also-bought";
import { RecentlyViewedSection } from "./recently-viewed";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useUser } from "@clerk/nextjs";

export function CartContent() {
  const { items, removeFromCart, setQuantity, subtotalPkr, clearCart } =
    useCart();
  const { formatFromPkr, formatFromUsd } = useCurrency();
  const { isSignedIn } = useUser();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const cartSlugs = items.map((item) => item.productSlug);
  const { products } = useCatalogProducts({
    slugs: cartSlugs,
    enabled: cartSlugs.length > 0,
  });
  const productsBySlug = useMemo(
    () => new Map(products.map((product) => [product.slug, product])),
    [products],
  );
  const subtotalUsd = items.reduce((sum, item) => {
    const product = productsBySlug.get(item.productSlug);
    return sum + (product?.basePriceUsd ?? item.unitPricePkr / 280) * item.quantity;
  }, 0);

  if (!isSignedIn) {
    return (
      <section className="panel">
        <div className="action-row">
          <h2>Cart Items</h2>
        </div>
        <p>
          Please{" "}
          <Link className="text-link" href="/account">
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
                setShowClearConfirm((current) => !current);
              }}
              type="button"
              aria-disabled={!items.length}
            >
              Empty cart
            </button>
          </div>
          {showClearConfirm && items.length ? (
            <div className="inline-confirmation">
              <p>Are you sure you want to empty your cart?</p>
              <div className="inline-confirmation-actions">
                <button
                  className="btn-primary compact"
                  onClick={() => {
                    clearCart();
                    setShowClearConfirm(false);
                  }}
                  type="button"
                >
                  Yes
                </button>
                <button
                  className="btn-secondary compact"
                  onClick={() => setShowClearConfirm(false)}
                  type="button"
                >
                  No
                </button>
              </div>
            </div>
          ) : null}
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
                const product = productsBySlug.get(item.productSlug);
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
                        {product ? formatFromUsd(product.basePriceUsd) : formatFromPkr(item.unitPricePkr)}
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
                        {product
                          ? formatFromUsd(product.basePriceUsd * item.quantity)
                          : formatFromPkr(item.unitPricePkr * item.quantity)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="product-price">
            Subtotal: {items.length ? formatFromUsd(subtotalUsd) : formatFromPkr(subtotalPkr)}
          </p>
          <p className="tiny">
            Shipping supports the United States and Europe with city-based rate
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
