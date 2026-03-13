"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { useCurrency } from "@/components/providers/currency-provider";
import { OrderSummary } from "@/lib/types";

export function OrdersHistory() {
  const { isSignedIn } = useUser();
  const { formatFromPkr } = useCurrency();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [status, setStatus] = useState(
    isSignedIn ? "Loading orders..." : "Sign in first to view order history.",
  );

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    void (async () => {
      const response = await fetch("/api/account/orders", {
        credentials: "include",
      });
      const payload = (await response.json()) as {
        orders?: OrderSummary[];
        message?: string;
      };
      if (response.ok && payload.orders) {
        setOrders(payload.orders);
        setStatus(payload.orders.length ? "" : "No orders yet.");
      } else {
        setStatus(payload.message ?? "Unable to load orders.");
      }
    })();
  }, [isSignedIn]);

  if (status) {
    return (
      <section className="panel">
        <h2>Order History</h2>
        <p>{status}</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Order History</h2>
      <div className="review-list">
        {orders.map((order) => (
          <article className="review-item" key={order.id}>
            <strong>{order.id}</strong>
            <p className="tiny">
              Date: {order.date} | Status: {order.status}
            </p>
            <p className="tiny">
              Items: {order.itemCount} | Total: {formatFromPkr(order.totalPkr)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
