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

const WISHLIST_STORAGE_KEY = "eqm_wishlist_items";

interface WishlistContextValue {
  productSlugs: string[];
  toggle: (productSlug: string) => void;
  has: (productSlug: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [productSlugs, setProductSlugs] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      window.localStorage.removeItem(WISHLIST_STORAGE_KEY);
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productSlugs));
  }, [productSlugs]);

  const toggle = useCallback((productSlug: string) => {
    setProductSlugs((prevSlugs) =>
      prevSlugs.includes(productSlug)
        ? prevSlugs.filter((slug) => slug !== productSlug)
        : [...prevSlugs, productSlug],
    );
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      productSlugs,
      toggle,
      has: (productSlug: string) => productSlugs.includes(productSlug),
    }),
    [productSlugs, toggle],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider.");
  }
  return context;
}
