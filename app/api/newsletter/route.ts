import { NextResponse } from "next/server";

import { syncNewsletterSubscriberToBrevo } from "@/lib/server/brevo";
import { getAdminAccess } from "@/lib/server/admin-auth";
import {
  getNewsletterSubscribers,
  isValidNewsletterEmail,
  subscribeToNewsletter,
} from "@/lib/server/newsletter-subscribers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      source?: string;
    };
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!isValidNewsletterEmail(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const { alreadySubscribed, subscriber } = await subscribeToNewsletter({
      email,
      source: body.source,
    });
    const brevoSync = await syncNewsletterSubscriberToBrevo(subscriber.email);

    if (brevoSync.enabled && !brevoSync.synced) {
      console.error("[newsletter] Brevo contact sync failed.", {
        email: subscriber.email,
        error: brevoSync.error,
      });
    }

    return NextResponse.json({
      alreadySubscribed,
      brevoSynced: brevoSync.synced,
      email: subscriber.email,
      message: alreadySubscribed
        ? "You're already on the email list."
        : "You're on the email list.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not save newsletter signup.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return NextResponse.json(
      { message: adminAccess.reason },
      { status: adminAccess.isAuthenticated ? 403 : 401 },
    );
  }

  const subscribers = await getNewsletterSubscribers();

  return NextResponse.json({
    count: subscribers.length,
    subscribers: subscribers.map((subscriber) => ({
      email: subscriber.email,
      source: subscriber.source,
      subscribedAt: subscriber.subscribedAt,
      lastSignupAt: subscriber.lastSignupAt,
    })),
  });
}
