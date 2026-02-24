"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { Address, UserProfile } from "@/lib/types";

export function AddressBook() {
  const { isSignedIn } = useUser();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [status, setStatus] = useState(
    isSignedIn
      ? "Loading address book..."
      : "Sign in first to view your address book.",
  );

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    void (async () => {
      const response = await fetch("/api/account/profile", {
        credentials: "include",
      });
      const payload = (await response.json()) as {
        profile?: UserProfile;
        message?: string;
      };
      if (response.ok && payload.profile) {
        setAddresses(payload.profile.addresses);
        setStatus(
          payload.profile.addresses.length ? "" : "No saved addresses.",
        );
      } else {
        setStatus(payload.message ?? "Unable to load addresses.");
      }
    })();
  }, [isSignedIn]);

  if (status) {
    return (
      <section className="panel">
        <h2>Address Book</h2>
        <p>{status}</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Address Book</h2>
      <div className="review-list">
        {addresses.map((address) => (
          <article className="review-item" key={address.id}>
            <strong>{address.label}</strong>
            <p className="tiny">{address.recipient}</p>
            <p className="tiny">
              {address.line1}, {address.city}, {address.province}
            </p>
            <p className="tiny">
              {address.country} - {address.postalCode}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
