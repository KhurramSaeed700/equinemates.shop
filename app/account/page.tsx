import type { Metadata } from "next";
import Image from "next/image";
import {
  SignIn,
  SignedIn,
  SignedOut,
  UserProfile,
} from "@clerk/nextjs";

import { isClerkEnabledFromKey } from "@/lib/clerk";

export const metadata: Metadata = {
  title: "Account",
  description: "Sign in to manage your Equinemates account, orders, and saved items.",
};

export default function AccountPage() {
  const clerkEnabled = isClerkEnabledFromKey(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  if (!clerkEnabled) {
    return (
      <section className="panel">
        <h2>Account Authentication</h2>
        <p>
          Clerk is configured, but valid API keys are not set yet. Add your real
          Clerk keys in <code>.env.local</code> to enable sign-in and profile
          management cards.
        </p>
      </section>
    );
  }

  return (
    <section className="clerk-account-panel">
      <SignedOut>
        <div className="account-auth-shell">
          <aside className="account-auth-story">
            <Image
              alt="English riding bits and bridles arranged in a tack room"
              className="account-auth-image"
              fill
              priority
              sizes="(max-width: 800px) 100vw, 560px"
              src="/account/login-tack-background.jpg"
            />
            <div className="account-auth-story-content">
              <p className="account-auth-kicker">Your Equinemates account</p>
              <h1>Ready for your next ride.</h1>
              <p className="account-auth-story-description">
                Everything you need for horse, rider, and stable, together in
                one place.
              </p>
              <ul className="account-auth-benefits">
                <li><span aria-hidden="true">✓</span> View your orders</li>
                <li><span aria-hidden="true">✓</span> Keep your favorites close</li>
                <li><span aria-hidden="true">✓</span> Manage your delivery details</li>
              </ul>
            </div>
          </aside>

          <div className="account-auth-form-column">
            <div className="account-auth-intro">
              <p className="account-auth-kicker">Welcome back</p>
              <h2>Sign in to Equinemates</h2>
              <p>Access your orders, saved items, and account details.</p>
            </div>
            <div className="clerk-signin-frame">
              <SignIn routing="hash" />
            </div>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="clerk-profile-frame">
          <UserProfile routing="hash" />
        </div>
      </SignedIn>
    </section>
  );
}
