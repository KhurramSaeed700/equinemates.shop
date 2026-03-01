"use client";

import { FormEvent, useState } from "react";

import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";

export function CheckoutForm() {
  const { items, clearCart } = useCart();
  const { currency } = useCurrency();
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length) {
      setStatus("Add products to cart before checkout.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          shippingCity: formData.get("shippingCity"),
          shippingAddress: formData.get("shippingAddress"),
          paymentMethod: formData.get("paymentMethod"),
          currency,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        invoiceId?: string;
        orderId?: string;
        exchangeRateFromPkr?: number;
        exchangeRateUpdatedAt?: string;
        currency?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Checkout failed.");
      }

      setStatus(
        `${payload.message ?? "Order created."} Order ${payload.orderId} Invoice ${payload.invoiceId}. Locked ${payload.currency} rate: ${payload.exchangeRateFromPkr} (updated ${payload.exchangeRateUpdatedAt ?? "unknown"}).`,
      );
      clearCart();
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel form-grid compact" onSubmit={onSubmit}>
      <h3>Checkout</h3>
      <label>
        Shipping City (Pakistan)
        <input defaultValue="Lahore" name="shippingCity" required type="text" />
      </label>
      <label className="full-width">
        Shipping Address
        <textarea name="shippingAddress" required rows={3} />
      </label>
      <label>
        Payment Method
        <select defaultValue="cod" name="paymentMethod">
          <option value="cod">Cash on Delivery (COD)</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Credit/Debit Card</option>
        </select>
      </label>
      <button className="btn-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Processing..." : "Place Order"}
      </button>
      {status ? <p className="form-status">{status}</p> : null}
    </form>
  );
}
