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

import { CartItem, Product } from "@/lib/types";

const CART_STORAGE_KEY = "eqm_cart_items";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotalPkr: number;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productSlug: string) => void;
  setQuantity: (productSlug: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored) as CartItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems((prevItems) => {
      const existing = prevItems.find((item) => item.productSlug === product.slug);
      if (existing) {
        return prevItems.map((item) =>
          item.productSlug === product.slug
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [
        ...prevItems,
        {
          sku: product.sku,
          productSlug: product.slug,
          name: product.name,
          unitPricePkr: product.basePricePkr,
          quantity,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productSlug: string) => {
    setItems((prevItems) =>
      prevItems.filter((item) => item.productSlug !== productSlug),
    );
  }, []);

  const setQuantity = useCallback((productSlug: string, quantity: number) => {
    setItems((prevItems) =>
      prevItems
        .map((item) =>
          item.productSlug === productSlug ? { ...item, quantity } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalPkr = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPricePkr,
      0,
    );
    return {
      items,
      itemCount,
      subtotalPkr,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
    };
  }, [addToCart, clearCart, items, removeFromCart, setQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }
  return context;
}
