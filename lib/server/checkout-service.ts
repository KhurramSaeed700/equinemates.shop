import { randomUUID } from "node:crypto";

import { convertFromPkr } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { getCurrencyRates } from "@/lib/server/currency-service";
import { buildFulfillmentPlan } from "@/lib/server/fulfillment-service";
import {
  createStripeCheckoutSession,
  isPaymentGatewayConfigured,
} from "@/lib/server/payment-gateway";
import { CartItem, CurrencyCode } from "@/lib/types";

const PAYMENT_METHODS = ["bank_transfer", "card", "wallet"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface CheckoutInput {
  items: CartItem[];
  shippingCity: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  currency: CurrencyCode;
  siteUrl: string;
  user: {
    clerkId: string;
    email: string;
    name: string;
  };
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}

function createDurableId(prefix: "INV" | "ORD") {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function createCheckout(input: CheckoutInput) {
  if (!input.items.length) {
    throw new Error("Cart is empty.");
  }

  if (!isPaymentMethod(input.paymentMethod)) {
    throw new Error("Unsupported payment method.");
  }

  const orderId = createDurableId("ORD");
  const invoiceId = createDurableId("INV");
  const rateSnapshot = await getCurrencyRates();
  const exchangeRateFromPkr = rateSnapshot.rates[input.currency];

  if (!exchangeRateFromPkr || !Number.isFinite(exchangeRateFromPkr)) {
    throw new Error(`Exchange rate for ${input.currency} is unavailable.`);
  }

  const needsHostedPayment =
    input.paymentMethod === "card" || input.paymentMethod === "wallet";

  if (needsHostedPayment && !isPaymentGatewayConfigured()) {
    throw new Error("Card checkout is not configured yet. Add Stripe keys or choose bank transfer.");
  }

  const savedOrder = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { clerkId: input.user.clerkId },
      update: {
        email: input.user.email,
        name: input.user.name,
      },
      create: {
        clerkId: input.user.clerkId,
        email: input.user.email,
        name: input.user.name,
      },
    });
    const productSlugs = Array.from(
      new Set(input.items.map((item) => item.productSlug)),
    );
    const products = await tx.product.findMany({
      where: {
        slug: {
          in: productSlugs,
        },
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        sku: true,
        name: true,
        basePricePkr: true,
        stock: true,
        amazonSellerSku: true,
        amazonFulfillableQuantity: true,
        amazonMcfEnabled: true,
      },
    });
    const productsBySlug = new Map(
      products.map((product) => [product.slug, product]),
    );
    const fulfillmentPlan = buildFulfillmentPlan({
      items: input.items.map((item) => ({
        productSlug: item.productSlug,
        quantity: item.quantity,
      })),
      productsBySlug,
    });
    const orderItems = input.items.map((item) => {
      const product = productsBySlug.get(item.productSlug);
      const quantity = Math.floor(item.quantity);
      const fulfillmentRoute = fulfillmentPlan.items.find(
        (route) => route.productSlug === item.productSlug,
      );

      if (!product || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`${item.name} is no longer available for checkout.`);
      }

      return {
        product: {
          connect: {
            id: product.id,
          },
        },
        productName: product.name,
        quantity,
        sku: product.sku,
        unitPricePkr: product.basePricePkr,
        lineTotalPkr: product.basePricePkr * quantity,
        fulfillmentSource: fulfillmentRoute?.source ?? "LOCAL",
        amazonSellerSku: fulfillmentRoute?.amazonSellerSku ?? null,
      };
    });
    const subtotalPkr = orderItems.reduce(
      (sum, item) => sum + item.lineTotalPkr,
      0,
    );
    const shippingFeePkr = input.shippingCity.toLowerCase().includes("new york")
      ? 450
      : 650;
    const totalPkr = subtotalPkr + shippingFeePkr;
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
    const notes = fulfillmentPlan.message;
    const order = await tx.order.create({
      data: {
        currency: input.currency,
        notes,
        orderNumber: orderId,
        shippingPkr: shippingFeePkr,
        status: "PENDING",
        subtotalPkr,
        totalPkr,
        userId: user.id,
        items: {
          create: orderItems,
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    await tx.$executeRaw`
      UPDATE "Order"
      SET "invoiceId" = ${invoiceId},
        "paymentMethod" = ${input.paymentMethod},
        "paymentStatus" = ${
          input.paymentMethod === "card" || input.paymentMethod === "wallet"
            ? "pending"
            : "pending"
        },
        "paymentProvider" = ${
          input.paymentMethod === "card" || input.paymentMethod === "wallet"
            ? "stripe"
            : null
        },
        "fulfillmentSource" = ${fulfillmentPlan.source},
        "fulfillmentStatus" = ${
          fulfillmentPlan.status === "READY" ? "pending" : "needs_configuration"
        },
        "exchangeRateFromPkr" = ${exchangeRateFromPkr},
        "exchangeRateUpdatedAt" = ${new Date(rateSnapshot.updatedAt)},
        "exchangeRateStale" = ${rateSnapshot.stale},
        "subtotalInCurrency" = ${subtotalInCurrency},
        "totalInCurrency" = ${totalInCurrency},
        "shippingCity" = ${input.shippingCity},
        "checkoutShippingAddress" = ${input.shippingAddress}
      WHERE id = ${order.id}
    `;

    return {
      exchangeRateFromPkr,
      exchangeRateUpdatedAt: rateSnapshot.updatedAt,
      exchangeRateStale: rateSnapshot.stale,
      invoiceId,
      notes,
      orderId: order.orderNumber,
      paymentStatus: "pending",
      shippingFeePkr,
      subtotalInCurrency,
      subtotalPkr,
      totalInCurrency,
      totalPkr,
      fulfillmentPlan,
    };
  });
  let paymentUrl: string | undefined;
  let paymentProviderSessionId: string | undefined;

  if (needsHostedPayment) {
    const checkout = await createStripeCheckoutSession({
      orderId: savedOrder.orderId,
      invoiceId: savedOrder.invoiceId,
      currency: input.currency,
      totalAmount: savedOrder.totalInCurrency,
      customerEmail: input.user.email,
      siteUrl: input.siteUrl,
      lineItems: input.items.map((item) => ({
        name: item.name,
        quantity: Math.max(1, Math.floor(item.quantity)),
        unitAmount: Math.max(
          1,
          Math.round(
            convertFromPkr(item.unitPricePkr, input.currency, rateSnapshot.rates) * 100,
          ),
        ),
      })),
    });

    paymentUrl = checkout.url;
    paymentProviderSessionId = checkout.sessionId;

    await prisma.$executeRaw`
      UPDATE "Order"
      SET
        "paymentProvider" = ${checkout.provider},
        "paymentProviderSessionId" = ${checkout.sessionId},
        "paymentCheckoutUrl" = ${checkout.url},
        "paymentStatus" = ${"pending_payment"}
      WHERE "orderNumber" = ${savedOrder.orderId}
    `;
  }

  return {
    invoiceId: savedOrder.invoiceId,
    orderId: savedOrder.orderId,
    paymentMethod: input.paymentMethod,
    shippingFeePkr: savedOrder.shippingFeePkr,
    subtotalPkr: savedOrder.subtotalPkr,
    totalPkr: savedOrder.totalPkr,
    currency: input.currency,
    exchangeRateFromPkr: savedOrder.exchangeRateFromPkr,
    exchangeRateUpdatedAt: savedOrder.exchangeRateUpdatedAt,
    exchangeRateStale: savedOrder.exchangeRateStale,
    subtotalInCurrency: savedOrder.subtotalInCurrency,
    totalInCurrency: savedOrder.totalInCurrency,
    rateLocked: true,
    shippingAddress: input.shippingAddress,
    shippingCity: input.shippingCity,
    paymentStatus: savedOrder.paymentStatus,
    paymentUrl,
    paymentProviderSessionId,
    fulfillmentSource: savedOrder.fulfillmentPlan.source,
    fulfillmentStatus: savedOrder.fulfillmentPlan.status,
    notes: savedOrder.notes,
  };
}
