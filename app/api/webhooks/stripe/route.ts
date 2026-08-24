import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyStripeSignature } from "@/lib/server/payment-gateway";

export const runtime = "nodejs";

type StripeCheckoutSession = {
  id: string;
  payment_intent?: string | null;
  client_reference_id?: string | null;
  metadata?: {
    orderNumber?: string;
  } | null;
};

type StripeWebhookEvent = {
  type: string;
  data: {
    object: unknown;
  };
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (
    !verifyStripeSignature({
      body,
      header: signature,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    })
  ) {
    return NextResponse.json({ message: "Invalid Stripe signature." }, { status: 400 });
  }

  const event = JSON.parse(body) as StripeWebhookEvent;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as StripeCheckoutSession;
    const orderNumber = session.metadata?.orderNumber ?? session.client_reference_id;

    if (orderNumber) {
      await prisma.$executeRaw`
        UPDATE "Order"
        SET
          "paymentStatus" = ${"paid"},
          status = ${"PROCESSING"}::"OrderStatus",
          "paymentProvider" = ${"stripe"},
          "paymentProviderSessionId" = ${session.id},
          "paymentProviderPaymentIntentId" = ${session.payment_intent ?? null},
          "fulfillmentStatus" = COALESCE("fulfillmentStatus", ${"pending"})
        WHERE "orderNumber" = ${orderNumber}
      `;
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as StripeCheckoutSession;
    const orderNumber = session.metadata?.orderNumber ?? session.client_reference_id;

    if (orderNumber) {
      await prisma.$executeRaw`
        UPDATE "Order"
        SET "paymentStatus" = ${"expired"}
        WHERE "orderNumber" = ${orderNumber}
      `;
    }
  }

  return NextResponse.json({ received: true });
}
