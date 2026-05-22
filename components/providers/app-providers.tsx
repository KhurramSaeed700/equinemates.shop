"use client";

import { ReactNode } from "react";

import { CartProvider } from "@/components/providers/cart-provider";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToaster } from "@/components/providers/theme-toaster";
import { WishlistProvider } from "@/components/providers/wishlist-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <WishlistProvider>
          <CartProvider>{children}</CartProvider>
          <ThemeToaster />
        </WishlistProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
