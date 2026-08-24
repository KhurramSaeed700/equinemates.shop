import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

import { isClerkEnabledFromKey } from "@/lib/clerk";
import {
  getAdminAccountForEmails,
  getFallbackAdminAccessForEmails,
  type AdminRole,
} from "@/lib/server/admin-directory";

type AdminAccessResult = {
  isAuthorized: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  reason: string;
  primaryEmail: string | null;
  role: AdminRole | null;
};

const ADMIN_SESSION_COOKIE = "equinemates_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getAdminSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    ""
  );
}

function signAdminSessionPayload(payload: string) {
  const secret = getAdminSessionSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createAdminSessionCookieValue(access: AdminAccessResult) {
  if (!access.isAuthorized || !access.primaryEmail || !access.role) {
    return "";
  }

  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(
    JSON.stringify({
      email: access.primaryEmail,
      expiresAt,
      role: access.role,
    }),
  ).toString("base64url");
  const signature = signAdminSessionPayload(payload);

  return signature ? `${payload}.${signature}` : "";
}

async function getAccessFromAdminSessionCookie(): Promise<AdminAccessResult | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");
  const expectedSignature = signAdminSessionPayload(payload ?? "");

  if (!payload || !signature || !expectedSignature) {
    return null;
  }

  try {
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      email?: unknown;
      expiresAt?: unknown;
      role?: unknown;
    };

    if (
      typeof session.email !== "string" ||
      typeof session.expiresAt !== "number" ||
      Date.now() >= session.expiresAt ||
      (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")
    ) {
      return null;
    }

    const access = await getAccessForEmails([session.email]);

    return access.isAuthorized ? access : null;
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(access: AdminAccessResult) {
  const cookieValue = createAdminSessionCookieValue(access);

  if (!cookieValue) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

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

function collectEmailsFromUser(
  user:
    | {
        emailAddresses: Array<{ emailAddress: string }>;
        primaryEmailAddress?: { emailAddress: string } | null;
      }
    | null
    | undefined,
): string[] {
  if (!user) {
    return [];
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress.toLowerCase();
  const emails = user.emailAddresses.map((entry) =>
    entry.emailAddress.toLowerCase(),
  );

  return Array.from(
    new Set((primaryEmail ? [primaryEmail, ...emails] : emails).filter(Boolean)),
  );
}

export async function getAccessForEmails(emails: string[]): Promise<AdminAccessResult> {
  const uniqueEmails = Array.from(new Set(emails));
  const primaryEmail = uniqueEmails[0] ?? null;

  if (!uniqueEmails.length) {
    return {
      isAuthorized: false,
      isAuthenticated: true,
      isSuperAdmin: false,
      reason: "Clerk could not find an email address for this account.",
      primaryEmail,
      role: null,
    };
  }

  try {
    const adminAccount = await getAdminAccountForEmails(uniqueEmails);

    if (adminAccount) {
      return {
        isAuthorized: true,
        isAuthenticated: true,
        isSuperAdmin: adminAccount.role === "SUPER_ADMIN",
        reason: "",
        primaryEmail,
        role: adminAccount.role,
      };
    }
  } catch (error) {
    console.error("[admin-auth] Admin directory lookup failed.", {
      primaryEmail,
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const fallback = getFallbackAdminAccessForEmails(uniqueEmails);

  return {
    isAuthorized: fallback.isAuthorized,
    isAuthenticated: true,
    isSuperAdmin: fallback.role === "SUPER_ADMIN",
    reason: fallback.isAuthorized
      ? ""
      : "The signed-in Clerk user is not included in the admin directory.",
    primaryEmail,
    role: fallback.role,
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
      isSuperAdmin: false,
      reason:
        "Admin access requires Clerk to be configured before R2 uploads can be used.",
      primaryEmail: null,
      role: null,
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
      isSuperAdmin: false,
      reason:
        "Clerk authentication failed. Check the Clerk keys in .env.local, restart the dev server, and sign in again.",
      primaryEmail: null,
      role: null,
    };
  }

  const { userId, sessionClaims } = authResult;

  if (!userId) {
    const cookieAccess = await getAccessFromAdminSessionCookie();

    if (cookieAccess) {
      return cookieAccess;
    }

    return {
      isAuthorized: false,
      isAuthenticated: false,
      isSuperAdmin: false,
      reason: "Sign in with a Clerk account that is allowed to access the admin panel.",
      primaryEmail: null,
      role: null,
    };
  }

  let emails: string[] = [];

  try {
    emails = collectEmailsFromUser(await currentUser());
  } catch (error) {
    logClerkAuthError("Clerk currentUser() failed.", error);
  }

  if (!emails.length) {
    try {
      const client = await clerkClient();
      emails = collectEmailsFromUser(await client.users.getUser(userId));
    } catch (error) {
      logClerkAuthError("Clerk users.getUser() fallback failed.", error);
    }
  }

  if (!emails.length) {

    const claimEmails = collectEmailsFromClaims(sessionClaims);

    if (claimEmails.length) {
      return await getAccessForEmails(claimEmails);
    }

    const cookieAccess = await getAccessFromAdminSessionCookie();

    if (cookieAccess) {
      return cookieAccess;
    }

    return {
      isAuthorized: false,
      isAuthenticated: true,
      isSuperAdmin: false,
      reason:
        "Clerk could not verify the signed-in user's email. Check CLERK_SECRET_KEY in .env.local, restart the dev server, and sign in again.",
      primaryEmail: null,
      role: null,
    };
  }

  return await getAccessForEmails(emails);
}
