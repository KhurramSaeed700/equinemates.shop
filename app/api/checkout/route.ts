import { NextResponse } from "next/server";

import { createCheckout } from "@/lib/server/checkout-service";
import { CartItem, CurrencyCode } from "@/lib/types";

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

    const order = createCheckout({
      items: body.items,
      shippingCity: body.shippingCity,
      shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod,
      currency: body.currency ?? "PKR",
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
