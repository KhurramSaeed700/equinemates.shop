import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import { getProductBySlug } from "@/lib/server/catalog-products";
import { createCheckout } from "@/lib/server/checkout-service";
import { CartItem, CurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/types";

export const runtime = "nodejs";

function getUserEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null
  );
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: "Sign in before placing an order." },
        { status: 401 },
      );
    }

    const user = await currentUser();
    const email = getUserEmail(user);

    if (!email) {
      return NextResponse.json(
        { message: "Your account needs an email address before checkout." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      items?: CartItem[];
      shippingCity?: string;
      shippingAddress?: string;
      paymentMethod?: "bank_transfer" | "card" | "wallet";
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
      const product = await getProductBySlug(item.productSlug);
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
      : "USD";

    const order = await createCheckout({
      items: normalizedItems,
      shippingCity: body.shippingCity,
      shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod,
      currency: selectedCurrency,
      user: {
        clerkId: userId,
        email: email.toLowerCase(),
        name: user?.fullName ?? user?.username ?? email.split("@")[0],
      },
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
