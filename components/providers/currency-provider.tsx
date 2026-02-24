"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
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

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      setCurrency,
      formatFromPkr: (amountPkr: number) => formatMoneyFromPkr(amountPkr, currency),
    }),
    [currency, setCurrency],
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
