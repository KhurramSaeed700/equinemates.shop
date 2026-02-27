"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { detectCurrencyFromLocale, formatMoneyFromPkr } from "@/lib/currency";
import { CurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/types";

const CURRENCY_STORAGE_KEY = "eqm_currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  supportedCurrencies: readonly CurrencyCode[];
  setCurrency: (currency: CurrencyCode) => void;
  formatFromPkr: (amountPkr: number) => string;
  ratesUpdatedAt: string | null;
  ratesStale: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") {
      return "PKR";
    }

    const storedValue = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (
      storedValue &&
      SUPPORTED_CURRENCIES.includes(storedValue as CurrencyCode)
    ) {
      return storedValue as CurrencyCode;
    }

    return detectCurrencyFromLocale(window.navigator.language);
  });
  const [ratesFromPkr, setRatesFromPkr] = useState<
    Partial<Record<CurrencyCode, number>>
  >({ PKR: 1 });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [ratesStale, setRatesStale] = useState(false);

  const refreshRates = useCallback(async () => {
    try {
      const response = await fetch("/api/currency/rates", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Rate fetch failed (${response.status})`);
      }

      const payload = (await response.json()) as {
        rates?: Partial<Record<CurrencyCode, number>>;
        updatedAt?: string;
        stale?: boolean;
      };

      if (!payload.rates || typeof payload.rates.PKR !== "number") {
        throw new Error("Rate payload is invalid.");
      }

      setRatesFromPkr(payload.rates);
      setRatesUpdatedAt(payload.updatedAt ?? null);
      setRatesStale(Boolean(payload.stale));
    } catch (error) {
      console.error("Currency rate refresh failed:", error);
      setRatesStale(true);
    }
  }, []);

  useEffect(() => {
    void refreshRates();

    const interval = window.setInterval(
      () => void refreshRates(),
      60 * 60 * 1000,
    );
    return () => window.clearInterval(interval);
  }, [refreshRates]);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      setCurrency,
      formatFromPkr: (amountPkr: number) =>
        formatMoneyFromPkr(amountPkr, currency, ratesFromPkr),
      ratesUpdatedAt,
      ratesStale,
    }),
    [currency, setCurrency, ratesFromPkr, ratesUpdatedAt, ratesStale],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider.");
  }
  return context;
}
