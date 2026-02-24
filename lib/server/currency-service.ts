import { CURRENCY_RATES_FROM_PKR } from "@/lib/currency";

export function getCurrencyRates() {
  return {
    base: "PKR",
    updatedAt: new Date().toISOString(),
    rates: CURRENCY_RATES_FROM_PKR,
    source: "manual-fallback",
  };
}
