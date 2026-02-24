import type { Metadata } from "next";

import { AddressBook } from "@/components/account/address-book";

export const metadata: Metadata = {
  title: "Address Book",
  description: "Manage shipping and billing addresses.",
};

export default function AccountAddressesPage() {
  return <AddressBook />;
}
