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
  const toast = useToast();
  const { user, isSignedIn, isLoaded } = useUser();
  const userId = user?.id;

  // always start empty; we'll hydrate once we know the auth state
  const [items, setItems] = useState<CartItem[]>([]);
  const lastActionRef = useRef<{
    type: "add" | "update" | "remove";
    productName: string;
    quantity?: number;
  } | null>(null);

  // load items from the appropriate per-user key when the auth status changes
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      const key = `${CART_STORAGE_KEY}_${userId}`;
      let itemsToLoad: CartItem[] = [];

      // prefer a previously saved user-specific cart
      const storedUser = window.localStorage.getItem(key);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as CartItem[];
          itemsToLoad = Array.isArray(parsed) ? parsed : [];
        } catch {
          window.localStorage.removeItem(key);
          itemsToLoad = [];
        }
      } else {
        // if nothing for this user yet, see if there is an anonymous cart and migrate it
        const anon = window.localStorage.getItem(CART_STORAGE_KEY);
        if (anon) {
          try {
            const parsed = JSON.parse(anon) as CartItem[];
            itemsToLoad = Array.isArray(parsed) ? parsed : [];
          } catch {
            // ignore malformed anonymous store
          }
          window.localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
      setItems(itemsToLoad);
    } else {
      // clear when not signed in
      setItems([]);
    }
  }, [isLoaded, isSignedIn, userId]);

  // persist items for the signed‑in user only
  useEffect(() => {
    if (isSignedIn && userId) {
      const key = `${CART_STORAGE_KEY}_${userId}`;
      window.localStorage.setItem(key, JSON.stringify(items));
    }
  }, [items, isSignedIn, userId]);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Toast effect: fire toast only when lastActionRef is set
  useEffect(() => {
    if (lastActionRef.current) {
      const action = lastActionRef.current;
      if (action.type === "add") {
        toast.success(
          `${action.productName} added to cart`,
          `Quantity: ${action.quantity}`,
        );
      } else if (action.type === "update") {
        toast.success(
          `${action.productName} quantity updated`,
          `Now ${action.quantity} in cart`,
        );
      } else if (action.type === "remove") {
        toast.info(`${action.productName} removed from cart`);
      }
      lastActionRef.current = null;
    }
  }, [items, toast]);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (!isSignedIn) {
        toast.info("Please sign in to add items to your cart.");
        return;
      }

      setItems((prevItems) => {
        const existing = prevItems.find(
          (item) => item.productSlug === product.slug,
        );
        if (existing) {
          lastActionRef.current = {
            type: "update",
            productName: product.name,
            quantity: existing.quantity + quantity,
          };
          return prevItems.map((item) =>
            item.productSlug === product.slug
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        }
        lastActionRef.current = {
          type: "add",
          productName: product.name,
          quantity,
        };
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
    },
    [isSignedIn, toast],
  );

  const removeFromCart = useCallback((productSlug: string) => {
    setItems((prevItems) => {
      const item = prevItems.find((i) => i.productSlug === productSlug);
      if (item) {
        lastActionRef.current = {
          type: "remove",
          productName: item.name,
        };
      }
      return prevItems.filter((item) => item.productSlug !== productSlug);
    });
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
