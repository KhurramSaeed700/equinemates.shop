import type { Metadata } from "next";

import { WishlistContent } from "@/components/catalog/wishlist-content";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Saved products synced through account and device workflows.",
};

export default function WishlistPage() {
  return <WishlistContent />;
}
