import crypto from "node:crypto";

type CheckoutLineItem = {
  name: string;
  quantity: number;
  unitAmount: number;
};

type CreatePaymentCheckoutInput = {
  orderId: string;
  invoiceId: string;
  currency: string;
  totalAmount: number;
  customerEmail: string;
  siteUrl: string;
  lineItems: CheckoutLineItem[];
};

export type PaymentCheckout = {
  provider: "stripe";
  sessionId: string;
  url: string;
};

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

export function isPaymentGatewayConfigured() {
  return Boolean(getStripeSecretKey());
}

function normalizeStripeCurrency(currency: string) {
  return currency.trim().toLowerCase();
}

function toMinorUnitAmount(amount: number) {
  return Math.max(1, Math.round(amount * 100));
}

function getCheckoutBaseUrl(siteUrl: string) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || siteUrl;
}

export async function createStripeCheckoutSession(
  input: CreatePaymentCheckoutInput,
): Promise<PaymentCheckout> {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    throw new Error("Stripe is not configured yet. Add STRIPE_SECRET_KEY before taking card payments.");
  }

  const baseUrl = getCheckoutBaseUrl(input.siteUrl).replace(/\/+$/, "");
  const body = new URLSearchParams();

  body.set("mode", "payment");
  body.set("success_url", `${baseUrl}/cart?checkout=success&order=${encodeURIComponent(input.orderId)}`);
  body.set("cancel_url", `${baseUrl}/cart?checkout=cancelled&order=${encodeURIComponent(input.orderId)}`);
  body.set("customer_email", input.customerEmail);
  body.set("client_reference_id", input.orderId);
  body.set("metadata[orderNumber]", input.orderId);
  body.set("metadata[invoiceId]", input.invoiceId);

  const lineItems = input.lineItems.length
    ? input.lineItems
    : [
        {
          name: `Equinemates order ${input.orderId}`,
          quantity: 1,
          unitAmount: toMinorUnitAmount(input.totalAmount),
        },
      ];

  lineItems.forEach((item, index) => {
    body.set(`line_items[${index}][quantity]`, String(item.quantity));
    body.set(`line_items[${index}][price_data][currency]`, normalizeStripeCurrency(input.currency));
    body.set(`line_items[${index}][price_data][product_data][name]`, item.name);
    body.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitAmount));
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json() as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.id || !payload.url) {
    throw new Error(payload.error?.message ?? "Could not create Stripe Checkout session.");
  }

  return {
    provider: "stripe",
    sessionId: payload.id,
    url: payload.url,
  };
}

export function verifyStripeSignature({
  body,
  header,
  secret,
}: {
  body: string;
  header: string | null;
  secret: string | undefined;
}) {
  if (!secret || !header) {
    return false;
  }

  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === signatureBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}
