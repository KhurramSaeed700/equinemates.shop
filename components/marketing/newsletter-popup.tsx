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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      toast.error("Enter a valid email address", "Use the format name@example.com.");
      return;
    }

    window.localStorage.setItem(
      NEWSLETTER_POPUP_STORAGE_KEY,
      JSON.stringify({ status: "subscribed", email }),
    );
    toast.success(
      "You’re on the list",
      "We’ll send product drops, stable specials, and limited offers to your inbox.",
    );
    setOpen(false);
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
        <button
          aria-label="Close newsletter popup"
          className="newsletter-popup-close"
          onClick={closePopup}
          type="button"
        >
          ×
        </button>

        <div className="newsletter-popup-grid">
          <section className="newsletter-popup-promo">
            <p className="newsletter-popup-kicker">Clearance Update</p>
            <h2 id="newsletter-popup-title">Fresh markdowns in clearance.</h2>
            <p>New reduced-price picks are now live across everyday riding and stable gear.</p>
            <Link className="btn-secondary newsletter-popup-link" href="/products">
              Shop now
            </Link>
          </section>

          <section className="newsletter-popup-signup">
            <p className="newsletter-popup-kicker">Join Our Newsletter</p>
            <h3>Get first notice on launches and sale drops.</h3>
            <p>Short updates, product drops, and special offers.</p>

            <form className="newsletter-popup-form" onSubmit={handleSubmit}>
              <label className="visually-hidden" htmlFor="newsletter-popup-email">
                Email address
              </label>
              <input
                id="newsletter-popup-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                type="email"
                value={email}
              />
              <button className="btn-primary" type="submit">
                Join now
              </button>
            </form>

            <button
              className="newsletter-popup-dismiss"
              onClick={closePopup}
              type="button"
            >
              No thanks
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
