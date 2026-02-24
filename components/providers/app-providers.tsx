"use client";

import { ReactNode } from "react";

import { CartProvider } from "@/components/providers/cart-provider";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { WishlistProvider } from "@/components/providers/wishlist-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <WishlistProvider>
        <CartProvider>{children}</CartProvider>
      </WishlistProvider>
    </CurrencyProvider>
  );
}
