import { NextResponse } from "next/server";

import { getCurrencyRates } from "@/lib/server/currency-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getCurrencyRates();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Failed to resolve currency rates:", error);
    return NextResponse.json(
      { message: "Currency rates are temporarily unavailable." },
      { status: 503 },
    );
  }
}
