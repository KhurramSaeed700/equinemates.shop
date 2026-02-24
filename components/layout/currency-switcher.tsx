"use client";

import { useCurrency } from "@/components/providers/currency-provider";

export function CurrencySwitcher() {
  const { currency, setCurrency, supportedCurrencies } = useCurrency();

  return (
    <label className="currency-switcher">
      <span className="sr-only">Currency</span>
      <select
        aria-label="Currency Switcher"
        onChange={(event) => setCurrency(event.target.value as typeof currency)}
        value={currency}
      >
        {supportedCurrencies.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  );
}
