"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUser } from "@clerk/nextjs";

import { useToast } from "@/lib/use-toast";

const WISHLIST_STORAGE_KEY = "eqm_wishlist_items";

interface WishlistContextValue {
  productSlugs: string[];
  toggle: (productSlug: string) => void;
  has: (productSlug: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined,
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const { user, isSignedIn, isLoaded } = useUser();
  const userId = user?.id;

  const [productSlugs, setProductSlugs] = useState<string[]>([]);
  const lastActionRef = useRef<{
    type: "add" | "remove";
  } | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      const key = `${WISHLIST_STORAGE_KEY}_${userId}`;
      let slugsToLoad: string[] = [];

      const storedUser = window.localStorage.getItem(key);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as string[];
          slugsToLoad = Array.isArray(parsed) ? parsed : [];
        } catch {
          window.localStorage.removeItem(key);
          slugsToLoad = [];
        }
      } else {
        const anon = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
        if (anon) {
          try {
            const parsed = JSON.parse(anon) as string[];
            slugsToLoad = Array.isArray(parsed) ? parsed : [];
          } catch {
            // ignore
          }
          window.localStorage.removeItem(WISHLIST_STORAGE_KEY);
        }
      }
      setProductSlugs(slugsToLoad);
    } else {
      setProductSlugs([]);
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (isSignedIn && userId) {
      const key = `${WISHLIST_STORAGE_KEY}_${userId}`;
      window.localStorage.setItem(key, JSON.stringify(productSlugs));
    }
  }, [productSlugs, isSignedIn, userId]);

  useEffect(() => {
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(productSlugs),
    );
  }, [productSlugs]);

  // Toast effect: fire toast only when lastActionRef is set
  useEffect(() => {
    if (lastActionRef.current) {
      const action = lastActionRef.current;
      if (action.type === "add") {
        toast.success("Added to wishlist");
      } else if (action.type === "remove") {
        toast.info("Removed from wishlist");
      }
      lastActionRef.current = null;
    }
  }, [productSlugs, toast]);

  const toggle = useCallback(
    (productSlug: string) => {
      if (!isSignedIn) {
        toast.info("Please sign in to save items to your wishlist.");
        return;
      }

      setProductSlugs((prevSlugs) => {
        const isAdding = !prevSlugs.includes(productSlug);
        lastActionRef.current = {
          type: isAdding ? "add" : "remove",
        };
        return prevSlugs.includes(productSlug)
          ? prevSlugs.filter((slug) => slug !== productSlug)
          : [...prevSlugs, productSlug];
      });
    },
    [isSignedIn, toast],
  );
  const value = useMemo<WishlistContextValue>(
    () => ({
      productSlugs,
      toggle,
      has: (productSlug: string) => productSlugs.includes(productSlug),
    }),
    [productSlugs, toggle],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider.");
  }
  return context;
}
