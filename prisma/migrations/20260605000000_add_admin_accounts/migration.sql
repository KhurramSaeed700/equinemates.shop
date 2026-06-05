CREATE TABLE IF NOT EXISTS "AdminAccount" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "invitedByEmail" TEXT,
  "lastInviteSentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminAccount_email_key"
  ON "AdminAccount" ("email");

CREATE INDEX IF NOT EXISTS "AdminAccount_role_status_idx"
  ON "AdminAccount" ("role", "status");

CREATE INDEX IF NOT EXISTS "AdminAccount_status_idx"
  ON "AdminAccount" ("status");
