import type { Metadata } from "next";
import { SignIn, SignedIn, SignedOut, UserProfile } from "@clerk/nextjs";

import { isClerkEnabledFromKey } from "@/lib/clerk";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your account securely with Clerk authentication.",
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
    <section className="panel clerk-account-panel">
      <SignedOut>
        <SignIn routing="hash" />
      </SignedOut>
      <SignedIn>
        <UserProfile />
      </SignedIn>
    </section>
  );
}
