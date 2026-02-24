import { NextResponse } from "next/server";

import { getCurrencyRates } from "@/lib/server/currency-service";

export function GET() {
  return NextResponse.json(getCurrencyRates());
}
