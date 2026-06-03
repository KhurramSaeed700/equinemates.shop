"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useMounted } from "@/components/hooks/useMounted";
import { useToast } from "@/lib/use-toast";

const NEWSLETTER_POPUP_STORAGE_KEY = "equinemates-newsletter-popup-v2";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function NewsletterPopup() {
  const pathname = usePathname();
  const mounted = useMounted();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!mounted || pathname !== "/") {
      return;
    }

    const state = window.localStorage.getItem(NEWSLETTER_POPUP_STORAGE_KEY);
    if (state) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mounted, pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.localStorage.setItem(
          NEWSLETTER_POPUP_STORAGE_KEY,
          JSON.stringify({ status: "dismissed" }),
        );
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closePopup() {
    window.localStorage.setItem(
      NEWSLETTER_POPUP_STORAGE_KEY,
      JSON.stringify({ status: "dismissed" }),
    );
    setOpen(false);
  }

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
        body: JSON.stringify({
          email,
          source: "popup",
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not save newsletter signup.");
      }

      window.localStorage.setItem(
        NEWSLETTER_POPUP_STORAGE_KEY,
        JSON.stringify({ status: "subscribed", email }),
      );
      toast.success(payload.message ?? "You're on the email list.");
      setOpen(false);
    } catch (error) {
      toast.error(
        "Newsletter signup failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!mounted || pathname !== "/" || !open) {
    return null;
  }

  return (
    <div
      aria-labelledby="newsletter-popup-title"
      aria-modal="true"
      className="newsletter-popup-overlay"
      role="dialog"
    >
      <div className="newsletter-popup-panel">
        <button
          aria-label="Close newsletter popup"
          className="newsletter-popup-close"
          onClick={closePopup}
          type="button"
        >
          &times;
        </button>

        <div className="newsletter-popup-grid">
          <section className="newsletter-popup-promo">
            <p className="newsletter-popup-kicker">Clearance</p>
            <h2 id="newsletter-popup-title">Fresh markdowns are live.</h2>
            <Link className="btn-secondary newsletter-popup-link" href="/products">
              Shop clearance
            </Link>
          </section>

          <section className="newsletter-popup-signup">
            <p className="newsletter-popup-kicker">Newsletter</p>
            <h3>Get sale alerts first.</h3>

            <form className="newsletter-popup-form" onSubmit={handleSubmit}>
              <label className="visually-hidden" htmlFor="newsletter-popup-email">
                Email address
              </label>
              <input
                id="newsletter-popup-email"
                disabled={isSubmitting}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                type="email"
                value={email}
              />
              <button className="btn-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Joining..." : "Join now"}
              </button>
            </form>

          </section>
        </div>
      </div>
    </div>
  );
}
