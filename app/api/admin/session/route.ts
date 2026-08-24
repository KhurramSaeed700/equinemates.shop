import { NextResponse } from "next/server";
import { clerkClient, verifyToken } from "@clerk/nextjs/server";

import {
  getAccessForEmails,
  setAdminSessionCookie,
} from "@/lib/server/admin-auth";

export const runtime = "nodejs";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

export async function POST(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json(
      { message: "Sign in with an admin account to continue." },
      { status: 401 },
    );
  }

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const userId = verifiedToken.sub;

    if (!userId) {
      return NextResponse.json(
        { message: "Clerk could not verify the signed-in user." },
        { status: 401 },
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const emails = [
      user.primaryEmailAddress?.emailAddress.toLowerCase(),
      ...user.emailAddresses.map((entry) => entry.emailAddress.toLowerCase()),
    ].filter((email): email is string => Boolean(email));
    const adminAccess = await getAccessForEmails(emails);

    if (!adminAccess.isAuthorized) {
      return NextResponse.json(
        { message: adminAccess.reason },
        { status: adminAccess.isAuthenticated ? 403 : 401 },
      );
    }

    await setAdminSessionCookie(adminAccess);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-session] Could not verify Clerk token.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Could not verify the signed-in Clerk session." },
      { status: 401 },
    );
  }
}
