"use client";

import { FormEvent, useState } from "react";

import { useToast } from "@/lib/use-toast";

type NewsletterSignupResponse = {
  alreadySubscribed?: boolean;
  email?: string;
  message?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function NewsletterSignupForm({
  buttonLabel = "Join",
  className = "newsletter-form",
  source = "footer",
}: {
  buttonLabel?: string;
  className?: string;
  source?: string;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      toast.error("Enter a valid email address", "Use the format name@example.com.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, source }),
      });
      const payload = (await response.json()) as NewsletterSignupResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not save newsletter signup.");
      }

      toast.success(payload.message ?? "You're on the email list.");
      setEmail("");
    } catch (error) {
      toast.error(
        "Newsletter signup failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <input
        disabled={isSubmitting}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address"
        type="email"
        value={email}
      />
      <button className="btn-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Joining..." : buttonLabel}
      </button>
    </form>
  );
}
