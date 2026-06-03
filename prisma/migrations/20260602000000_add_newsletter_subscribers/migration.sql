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
);

CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_email_key"
  ON "NewsletterSubscriber" ("email");

CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_status_idx"
  ON "NewsletterSubscriber" ("status");

CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_subscribedAt_idx"
  ON "NewsletterSubscriber" ("subscribedAt");
