import { auth, currentUser } from "@clerk/nextjs/server";

import { isClerkEnabledFromKey } from "@/lib/clerk";

type AdminAccessResult = {
  isAuthorized: boolean;
  isAuthenticated: boolean;
  reason: string;
  primaryEmail: string | null;
};

function getConfiguredAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminAccess(): Promise<AdminAccessResult> {
  const clerkEnabled = isClerkEnabledFromKey(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  if (!clerkEnabled || !process.env.CLERK_SECRET_KEY?.trim()) {
    return {
      isAuthorized: false,
      isAuthenticated: false,
      reason:
        "Admin access requires Clerk to be configured before R2 uploads can be used.",
      primaryEmail: null,
    };
  }

  const { userId } = await auth();

  if (!userId) {
    return {
      isAuthorized: false,
      isAuthenticated: false,
      reason: "Sign in with a Clerk account that is allowed to access the admin panel.",
      primaryEmail: null,
    };
  }

  const user = await currentUser();
  const emails =
    user?.emailAddresses.map((entry) => entry.emailAddress.toLowerCase()) ?? [];
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress.toLowerCase() ?? emails[0] ?? null;

  const adminEmails = getConfiguredAdminEmails();

  if (!adminEmails.length) {
    return {
      isAuthorized: false,
      isAuthenticated: true,
      reason:
        "ADMIN_EMAILS is not configured. Add a comma-separated admin allowlist to enable uploads.",
      primaryEmail,
    };
  }

  const isAuthorized = emails.some((email) => adminEmails.includes(email));

  return {
    isAuthorized,
    isAuthenticated: true,
    reason: isAuthorized
      ? ""
      : "The signed-in Clerk user is not included in ADMIN_EMAILS.",
    primaryEmail,
  };
}
