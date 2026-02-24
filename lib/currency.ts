import { CurrencyCode } from "@/lib/types";

export const CURRENCY_RATES_FROM_PKR: Record<CurrencyCode, number> = {
  PKR: 1,
  USD: 0.00358,
  EUR: 0.0033,
};

export function convertFromPkr(amountPkr: number, currency: CurrencyCode): number {
  return amountPkr * CURRENCY_RATES_FROM_PKR[currency];
}

function currencyLocale(currency: CurrencyCode): string {
  if (currency === "USD") {
    return "en-US";
  }
  if (currency === "EUR") {
    return "de-DE";
  }
  return "en-PK";
}

export function formatMoneyFromPkr(
  amountPkr: number,
  currency: CurrencyCode,
): string {
  return new Intl.NumberFormat(currencyLocale(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(convertFromPkr(amountPkr, currency));
}

export function detectCurrencyFromLocale(locale?: string): CurrencyCode {
  if (!locale) {
    return "PKR";
  }

  const upper = locale.toUpperCase();
  if (upper.includes("US")) {
    return "USD";
  }

  const euroRegions = ["DE", "FR", "IT", "ES", "NL", "BE", "IE", "PT", "FI"];
  if (euroRegions.some((region) => upper.includes(region))) {
    return "EUR";
  }

  return "PKR";
}
