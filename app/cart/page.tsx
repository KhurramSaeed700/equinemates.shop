import type { Metadata } from "next";

import { CartContent } from "@/components/catalog/cart-content";

export const metadata: Metadata = {
  title: "Cart & Checkout",
  description: "International shipping support with secure card, bank transfer, and wallet checkout.",
};

export default function CartPage() {
  return <CartContent />;
}
