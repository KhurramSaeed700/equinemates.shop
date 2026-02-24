"use client";

import { FormEvent, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { UserProfile } from "@/lib/types";

export function ProfileOverview() {
  const { isSignedIn } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState("");

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
        setProfile(payload.profile);
        setStatus("Profile synced.");
      } else {
        setStatus(payload.message ?? "Unable to load profile.");
      }
    })();
  }, [isSignedIn]);

  const onSaveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // Clerk cookies will be sent automatically
    const payload = {
      id: `addr-${Date.now()}`,
      label: String(formData.get("label") ?? ""),
      recipient: String(formData.get("recipient") ?? ""),
      line1: String(formData.get("line1") ?? ""),
      city: String(formData.get("city") ?? ""),
      province: String(formData.get("province") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: "Pakistan",
    };

    const response = await fetch("/api/account/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-session-token": token,
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as {
      profile?: UserProfile;
      message?: string;
    };
    if (response.ok && result.profile) {
      setProfile(result.profile);
      setStatus("Address saved.");
      event.currentTarget.reset();
    } else {
      setStatus(result.message ?? "Unable to save address.");
    }
  };

  return (
    <section className="panel">
      <h3>Profile Management</h3>
      {profile ? (
        <>
          <p className="tiny">Signed in as {profile.name}</p>
          <p className="tiny">Email: {profile.email}</p>
          <p className="tiny">Role: {profile.role}</p>
          <p className="tiny">Wishlist items: {profile.wishlist.length}</p>
        </>
      ) : (
        <p className="tiny">
          {isSignedIn
            ? "Loading profile..."
            : "Sign in first to load profile data."}
        </p>
      )}

      <form className="form-grid compact" onSubmit={onSaveAddress}>
        <label>
          Address Label
          <input name="label" required type="text" />
        </label>
        <label>
          Recipient
          <input name="recipient" required type="text" />
        </label>
        <label>
          Street
          <input name="line1" required type="text" />
        </label>
        <label>
          City
          <input name="city" required type="text" />
        </label>
        <label>
          Province
          <input name="province" required type="text" />
        </label>
        <label>
          Postal Code
          <input name="postalCode" required type="text" />
        </label>
        <button className="btn-secondary" type="submit">
          Save Address
        </button>
      </form>

      {status ? <p className="form-status">{status}</p> : null}
    </section>
  );
}
