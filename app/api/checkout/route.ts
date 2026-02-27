import { NextResponse } from "next/server";

import { getProductBySlug } from "@/lib/catalog";
import { createCheckout } from "@/lib/server/checkout-service";
import { CartItem, CurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: CartItem[];
      shippingCity?: string;
      shippingAddress?: string;
      paymentMethod?: "cod" | "bank_transfer" | "card";
      currency?: CurrencyCode;
    };

    if (!body.items || !body.shippingCity || !body.shippingAddress || !body.paymentMethod) {
      return NextResponse.json(
        { message: "Missing checkout fields." },
        { status: 400 },
      );
    }

    const normalizedItems: CartItem[] = [];
    for (const item of body.items) {
      const product = getProductBySlug(item.productSlug);
      const quantity = Math.floor(item.quantity);
      if (!product || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      normalizedItems.push({
        sku: product.sku,
        productSlug: product.slug,
        name: product.name,
        unitPricePkr: product.basePricePkr,
        quantity,
      });
    }

    if (!normalizedItems.length) {
      return NextResponse.json(
        { message: "No valid cart items were provided." },
        { status: 400 },
      );
    }

    const selectedCurrency = SUPPORTED_CURRENCIES.includes(body.currency as CurrencyCode)
      ? (body.currency as CurrencyCode)
      : "PKR";

    const order = await createCheckout({
      items: normalizedItems,
      shippingCity: body.shippingCity,
      shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod,
      currency: selectedCurrency,
    });

    return NextResponse.json({
      message: "Checkout completed and invoice generated.",
      ...order,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Checkout failed." },
      { status: 400 },
    );
  }
}
