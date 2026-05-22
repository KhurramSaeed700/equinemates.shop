import { auth, currentUser } from "@clerk/nextjs/server";

import { isClerkEnabledFromKey } from "@/lib/clerk";

type AdminAccessResult = {
  isAuthorized: boolean;
  isAuthenticated: boolean;
  reason: string;
  primaryEmail: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  ) {
    const messages = (error as { errors: Array<{ message?: unknown; longMessage?: unknown }> })
      .errors
      .map((entry) =>
        typeof entry.longMessage === "string"
          ? entry.longMessage
          : typeof entry.message === "string"
            ? entry.message
            : "",
      )
      .filter(Boolean);

    if (messages.length) {
      return messages.join(" ");
    }
  }

  return "Clerk did not provide an error message.";
}

function logClerkAuthError(context: string, error: unknown) {
  console.error(`[admin-auth] ${context}`, {
    name: error instanceof Error ? error.name : "UnknownError",
    message: getErrorMessage(error),
    status:
      error && typeof error === "object" && "status" in error
        ? (error as { status?: unknown }).status
        : undefined,
    clerkTraceId:
      error && typeof error === "object" && "clerkTraceId" in error
        ? (error as { clerkTraceId?: unknown }).clerkTraceId
        : undefined,
  });
}

function getConfiguredAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function collectEmailsFromClaims(claims: unknown): string[] {
  if (!claims || typeof claims !== "object") {
    return [];
  }

  const claimRecord = claims as Record<string, unknown>;
  const emailCandidates = [
    claimRecord.email,
    claimRecord.email_address,
    claimRecord.primary_email_address,
  ];

  return emailCandidates
    .filter((email): email is string => typeof email === "string")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getAccessForEmails(emails: string[]): AdminAccessResult {
  const uniqueEmails = Array.from(new Set(emails));
  const primaryEmail = uniqueEmails[0] ?? null;
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

  const isAuthorized = uniqueEmails.some((email) => adminEmails.includes(email));

  return {
    isAuthorized,
    isAuthenticated: true,
    reason: isAuthorized
      ? ""
      : "The signed-in Clerk user is not included in ADMIN_EMAILS.",
    primaryEmail,
  };
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

  let authResult: Awaited<ReturnType<typeof auth>>;

  try {
    authResult = await auth();
  } catch (error) {
    logClerkAuthError("Clerk auth() failed.", error);

    return {
      isAuthorized: false,
      isAuthenticated: false,
      reason:
        "Clerk authentication failed. Check the Clerk keys in .env.local, restart the dev server, and sign in again.",
      primaryEmail: null,
    };
  }

  const { userId, sessionClaims } = authResult;

  if (!userId) {
    return {
      isAuthorized: false,
      isAuthenticated: false,
      reason: "Sign in with a Clerk account that is allowed to access the admin panel.",
      primaryEmail: null,
    };
  }

  let user: Awaited<ReturnType<typeof currentUser>>;

  try {
    user = await currentUser();
  } catch (error) {
    logClerkAuthError("Clerk currentUser() failed.", error);

    const claimEmails = collectEmailsFromClaims(sessionClaims);

    if (claimEmails.length) {
      return getAccessForEmails(claimEmails);
    }

    return {
      isAuthorized: false,
      isAuthenticated: true,
      reason:
        "Clerk could not verify the signed-in user's email. Check CLERK_SECRET_KEY in .env.local, restart the dev server, and sign in again.",
      primaryEmail: null,
    };
  }

  const emails =
    user?.emailAddresses.map((entry) => entry.emailAddress.toLowerCase()) ?? [];
  const primaryEmail = user?.primaryEmailAddress?.emailAddress.toLowerCase();

  return getAccessForEmails(primaryEmail ? [primaryEmail, ...emails] : emails);
}
