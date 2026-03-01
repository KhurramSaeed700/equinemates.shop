import { CurrencyCode } from "@/lib/types";

export type RatesFromPkr = Partial<Record<CurrencyCode, number>>;

export function convertFromPkr(
  amountPkr: number,
  currency: CurrencyCode,
  ratesFromPkr: RatesFromPkr,
): number {
  const rate = ratesFromPkr[currency];
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return amountPkr;
  }
  return amountPkr * rate;
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
  ratesFromPkr: RatesFromPkr,
): string {
  return new Intl.NumberFormat(currencyLocale(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(convertFromPkr(amountPkr, currency, ratesFromPkr));
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
