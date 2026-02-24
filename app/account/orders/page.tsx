import type { Metadata } from "next";

import { OrdersHistory } from "@/components/account/orders-history";

export const metadata: Metadata = {
  title: "Order History",
  description: "Track previous purchases, status, and invoice-linked totals.",
};

export default function AccountOrdersPage() {
  return <OrdersHistory />;
}
