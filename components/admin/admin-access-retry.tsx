"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminAccessRetryProps = {
  message?: string;
  title?: string;
};

const MAX_REFRESH_ATTEMPTS = 6;
const REFRESH_DELAY_MS = 900;

export function AdminAccessRetry({
  message = "Sign in with an admin account to continue.",
  title = "Admin Access Required",
}: AdminAccessRetryProps) {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState("Checking your signed-in session...");

  useEffect(() => {
    if (!isLoaded || attempts >= MAX_REFRESH_ATTEMPTS) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      async function verifyAdminSession() {
        if (!isSignedIn) {
          setAttempts(MAX_REFRESH_ATTEMPTS);
          setStatus(message);
          return;
        }

        try {
          const token = await getToken();

          if (!token) {
            throw new Error("Clerk did not provide a session token.");
          }

          const response = await fetch("/api/admin/session", {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
            },
          });
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;

          if (!response.ok) {
            throw new Error(
              payload?.message ?? "Could not verify admin access.",
            );
          }

          setStatus("Admin session verified. Loading workspace...");
          router.refresh();
        } catch (error) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not verify admin access.",
          );
          setAttempts((currentAttempts) => currentAttempts + 1);
        }
      }

      void verifyAdminSession();
    }, REFRESH_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [attempts, getToken, isLoaded, isSignedIn, message, router]);

  if (attempts < MAX_REFRESH_ATTEMPTS) {
    return (
      <section className="panel">
        <h2>Checking Admin Access</h2>
        <p>{status}</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>{title}</h2>
      <p>{status || message}</p>
    </section>
  );
}
