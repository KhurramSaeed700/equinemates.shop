import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

type NewsletterSignupInput = {
  email: string;
  source?: string;
};

type NewsletterSubscriberRow = {
  id: string;
  email: string;
  status: string;
  source: string | null;
  subscribedAt: Date;
  lastSignupAt: Date;
  createdAt: Date;
};

let tableReady = false;

function normalizeNewsletterEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidNewsletterEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function ensureNewsletterSubscriberTable() {
  if (tableReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'SUBSCRIBED',
      "source" TEXT,
      "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSignupAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "unsubscribedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_email_key"
    ON "NewsletterSubscriber" ("email")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_status_idx"
    ON "NewsletterSubscriber" ("status")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_subscribedAt_idx"
    ON "NewsletterSubscriber" ("subscribedAt")
  `);

  tableReady = true;
}

export async function subscribeToNewsletter({
  email,
  source,
}: NewsletterSignupInput): Promise<{
  alreadySubscribed: boolean;
  subscriber: NewsletterSubscriberRow;
}> {
  await ensureNewsletterSubscriberTable();

  const normalizedEmail = normalizeNewsletterEmail(email);
  const safeSource = source?.trim().slice(0, 80) || null;

  if (!isValidNewsletterEmail(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const existingRows = await prisma.$queryRaw<NewsletterSubscriberRow[]>`
    SELECT id, email, status, source, "subscribedAt", "lastSignupAt", "createdAt"
    FROM "NewsletterSubscriber"
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;
  const alreadySubscribed = existingRows[0]?.status === "SUBSCRIBED";

  const rows = await prisma.$queryRaw<NewsletterSubscriberRow[]>`
    INSERT INTO "NewsletterSubscriber" (
      id,
      email,
      status,
      source,
      "subscribedAt",
      "lastSignupAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${normalizedEmail},
      'SUBSCRIBED',
      ${safeSource},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (email)
    DO UPDATE SET
      status = 'SUBSCRIBED',
      source = COALESCE(EXCLUDED.source, "NewsletterSubscriber".source),
      "lastSignupAt" = CURRENT_TIMESTAMP,
      "unsubscribedAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING id, email, status, source, "subscribedAt", "lastSignupAt", "createdAt"
  `;

  return {
    alreadySubscribed,
    subscriber: rows[0],
  };
}

export async function getNewsletterSubscribers(): Promise<NewsletterSubscriberRow[]> {
  await ensureNewsletterSubscriberTable();

  return prisma.$queryRaw<NewsletterSubscriberRow[]>`
    SELECT id, email, status, source, "subscribedAt", "lastSignupAt", "createdAt"
    FROM "NewsletterSubscriber"
    WHERE status = 'SUBSCRIBED'
    ORDER BY "subscribedAt" DESC
  `;
}
