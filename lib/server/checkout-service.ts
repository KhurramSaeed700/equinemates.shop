import { randomUUID } from "node:crypto";

import { convertFromPkr } from "@/lib/currency";
import { getCurrencyRates } from "@/lib/server/currency-service";
import { db } from "@/lib/server/db";
import { CartItem, CurrencyCode } from "@/lib/types";

const PAYMENT_METHODS = ["cod", "bank_transfer", "card"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface CheckoutInput {
  items: CartItem[];
  shippingCity: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  currency: CurrencyCode;
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}

export async function createCheckout(input: CheckoutInput) {
  if (!input.items.length) {
    throw new Error("Cart is empty.");
  }

  if (!isPaymentMethod(input.paymentMethod)) {
    throw new Error("Unsupported payment method.");
  }

  const subtotalPkr = input.items.reduce(
    (sum, item) => sum + item.unitPricePkr * item.quantity,
    0,
  );

  const shippingFeePkr = input.shippingCity.toLowerCase().includes("karachi")
    ? 450
    : 650;
  const totalPkr = subtotalPkr + shippingFeePkr;
  const invoiceId = `INV-${randomUUID().slice(0, 8).toUpperCase()}`;
  const orderId = `ORD-${Math.floor(Math.random() * 9000 + 1000)}`;

  const rateSnapshot = await getCurrencyRates();
  const exchangeRateFromPkr = rateSnapshot.rates[input.currency];

  if (!exchangeRateFromPkr || !Number.isFinite(exchangeRateFromPkr)) {
    throw new Error(`Exchange rate for ${input.currency} is unavailable.`);
  }

  const subtotalInCurrency = convertFromPkr(
    subtotalPkr,
    input.currency,
    rateSnapshot.rates,
  );
  const totalInCurrency = convertFromPkr(
    totalPkr,
    input.currency,
    rateSnapshot.rates,
  );

  db.checkoutOrders.push({
    orderId,
    invoiceId,
    createdAt: new Date().toISOString(),
    currency: input.currency,
    exchangeRateFromPkr,
    exchangeRateUpdatedAt: rateSnapshot.updatedAt,
    subtotalPkr,
    totalPkr,
    subtotalInCurrency,
    totalInCurrency,
  });

  return {
    invoiceId,
    orderId,
    paymentMethod: input.paymentMethod,
    shippingFeePkr,
    subtotalPkr,
    totalPkr,
    currency: input.currency,
    exchangeRateFromPkr,
    exchangeRateUpdatedAt: rateSnapshot.updatedAt,
    exchangeRateStale: rateSnapshot.stale,
    subtotalInCurrency,
    totalInCurrency,
    rateLocked: true,
    shippingAddress: input.shippingAddress,
    shippingCity: input.shippingCity,
    paymentStatus: input.paymentMethod === "card" ? "authorized" : "pending",
    notes:
      "Payment-ready architecture enabled. Connect card and bank gateways for production settlement.",
  };
}
