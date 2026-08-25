"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useMounted } from "@/components/hooks/useMounted";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";
import { useToast } from "@/lib/use-toast";

const NEWSLETTER_POPUP_STORAGE_KEY = "equinemates-newsletter-popup-v3";

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
      className="newsletter-popup-overlay"
      role="dialog"
    >
      <div className="newsletter-popup-panel">
        <Button
          aria-label="Close newsletter popup"
          className="newsletter-popup-close"
          onClick={closePopup}
          size="icon"
          variant="icon"
        >
          <CloseIcon aria-hidden="true" />
        </Button>

        <div className="newsletter-popup-grid">
          <section aria-label="Clearance collection" className="newsletter-popup-promo">
            <div className="newsletter-popup-image">
              <Image
                alt="Equestrian standing beside a dark bay horse"
                className="newsletter-popup-promo-image"
                fill
                sizes="(max-width: 700px) calc(100vw - 1.5rem), 310px"
                src="/newsletter/welcome-equestrian.png"
              />
            </div>
            <div className="newsletter-popup-sale">
              <p className="newsletter-popup-kicker">Clearance</p>
              <h2>Fresh markdowns are live.</h2>
              <Link className="newsletter-popup-link" href="/products?sort=price-asc">
                Shop clearance
              </Link>
            </div>
          </section>

          <section className="newsletter-popup-signup">
            <p className="newsletter-popup-kicker">Newsletter</p>
            <h3 id="newsletter-popup-title">Get sale alerts first.</h3>
            <p>
              New reductions, stable essentials, and private offers—straight to
              your inbox.
            </p>

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
            <button
              className="newsletter-popup-dismiss"
              onClick={closePopup}
              type="button"
            >
              No thanks
            </button>
            <p className="newsletter-popup-fineprint">
              By submitting, you agree to receive Equinemates emails. You can
              unsubscribe at any time.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
