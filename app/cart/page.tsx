import type { Metadata } from "next";

import { CartContent } from "@/components/catalog/cart-content";

export const metadata: Metadata = {
  title: "Cart & Checkout",
  description: "Pakistan shipping support with COD, bank transfer, and card checkout.",
};

export default function CartPage() {
  return <CartContent />;
}
