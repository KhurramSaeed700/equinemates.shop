import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

export type AdminRole = "SUPER_ADMIN" | "ADMIN";
export type AdminStatus = "ACTIVE" | "REMOVED";

export type AdminAccountRow = {
  id: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  isSystem: boolean;
  invitedByEmail: string | null;
  lastInviteSentAt: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const BUILT_IN_SUPER_ADMIN_EMAIL = "snb.khurram@gmail.com";
export const BUILT_IN_ADMIN_EMAIL = "equinemates@gmail.com";

let adminDirectoryReady = false;

function uniqueEmails(emails: string[]) {
  return Array.from(new Set(emails.map(normalizeAdminEmail).filter(Boolean)));
}

function splitEmailEnv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map(normalizeAdminEmail)
    .filter(Boolean);
}

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidAdminEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getBootstrapSuperAdminEmails() {
  return uniqueEmails([
    BUILT_IN_SUPER_ADMIN_EMAIL,
    ...splitEmailEnv(process.env.SUPER_ADMIN_EMAILS),
  ]);
}

export function getBootstrapAdminEmails() {
  return uniqueEmails([
    BUILT_IN_ADMIN_EMAIL,
    ...splitEmailEnv(process.env.ADMIN_EMAILS),
    ...getBootstrapSuperAdminEmails(),
  ]);
}

function assertValidAdminEmail(email: string) {
  if (!isValidAdminEmail(email)) {
    throw new Error("Enter a valid email address.");
  }
}

async function ensureAdminAccountTable() {
  if (adminDirectoryReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
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
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminAccount_email_key"
    ON "AdminAccount" ("email")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AdminAccount_role_status_idx"
    ON "AdminAccount" ("role", "status")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AdminAccount_status_idx"
    ON "AdminAccount" ("status")
  `);

  for (const email of getBootstrapSuperAdminEmails()) {
    await upsertSystemAdminAccount(email, "SUPER_ADMIN");
  }

  const superAdmins = new Set(getBootstrapSuperAdminEmails());
  for (const email of getBootstrapAdminEmails()) {
    if (!superAdmins.has(email)) {
      await upsertSystemAdminAccount(email, "ADMIN");
    }
  }

  adminDirectoryReady = true;
}

async function upsertSystemAdminAccount(email: string, role: AdminRole) {
  assertValidAdminEmail(email);

  await prisma.$executeRaw`
    INSERT INTO "AdminAccount" (
      id,
      email,
      role,
      status,
      "isSystem",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${email},
      ${role},
      'ACTIVE',
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (email)
    DO UPDATE SET
      role = CASE
        WHEN ${role} = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
        WHEN "AdminAccount".role = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
        ELSE 'ADMIN'
      END,
      status = 'ACTIVE',
      "isSystem" = true,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export function getFallbackAdminAccessForEmails(emails: string[]): {
  isAuthorized: boolean;
  role: AdminRole | null;
} {
  const normalizedEmails = uniqueEmails(emails);
  const superAdmins = new Set(getBootstrapSuperAdminEmails());
  const admins = new Set(getBootstrapAdminEmails());

  if (normalizedEmails.some((email) => superAdmins.has(email))) {
    return { isAuthorized: true, role: "SUPER_ADMIN" };
  }

  if (normalizedEmails.some((email) => admins.has(email))) {
    return { isAuthorized: true, role: "ADMIN" };
  }

  return { isAuthorized: false, role: null };
}

export async function getAdminAccountByEmail(
  email: string,
): Promise<AdminAccountRow | null> {
  await ensureAdminAccountTable();

  const normalizedEmail = normalizeAdminEmail(email);
  assertValidAdminEmail(normalizedEmail);

  const rows = await prisma.$queryRaw<AdminAccountRow[]>`
    SELECT id, email, role, status, "isSystem", "invitedByEmail",
      "lastInviteSentAt", "acceptedAt", "createdAt", "updatedAt"
    FROM "AdminAccount"
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getAdminAccountForEmails(
  emails: string[],
): Promise<AdminAccountRow | null> {
  await ensureAdminAccountTable();

  const matches: AdminAccountRow[] = [];
  for (const email of uniqueEmails(emails)) {
    if (!isValidAdminEmail(email)) {
      continue;
    }

    const rows = await prisma.$queryRaw<AdminAccountRow[]>`
      SELECT id, email, role, status, "isSystem", "invitedByEmail",
        "lastInviteSentAt", "acceptedAt", "createdAt", "updatedAt"
      FROM "AdminAccount"
      WHERE email = ${email} AND status = 'ACTIVE'
      LIMIT 1
    `;

    if (rows[0]) {
      matches.push(rows[0]);
    }
  }

  return (
    matches.find((entry) => entry.role === "SUPER_ADMIN") ?? matches[0] ?? null
  );
}

export async function listAdminAccounts(): Promise<AdminAccountRow[]> {
  await ensureAdminAccountTable();

  return prisma.$queryRaw<AdminAccountRow[]>`
    SELECT id, email, role, status, "isSystem", "invitedByEmail",
      "lastInviteSentAt", "acceptedAt", "createdAt", "updatedAt"
    FROM "AdminAccount"
    WHERE status = 'ACTIVE'
    ORDER BY
      CASE WHEN role = 'SUPER_ADMIN' THEN 0 ELSE 1 END,
      email ASC
  `;
}

export async function addAdminAccount({
  email,
  invitedByEmail,
}: {
  email: string;
  invitedByEmail: string;
}): Promise<AdminAccountRow> {
  await ensureAdminAccountTable();

  const normalizedEmail = normalizeAdminEmail(email);
  assertValidAdminEmail(normalizedEmail);

  const rows = await prisma.$queryRaw<AdminAccountRow[]>`
    INSERT INTO "AdminAccount" (
      id,
      email,
      role,
      status,
      "isSystem",
      "invitedByEmail",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${normalizedEmail},
      'ADMIN',
      'ACTIVE',
      false,
      ${normalizeAdminEmail(invitedByEmail)},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (email)
    DO UPDATE SET
      role = CASE
        WHEN "AdminAccount".role = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
        ELSE 'ADMIN'
      END,
      status = 'ACTIVE',
      "invitedByEmail" = ${normalizeAdminEmail(invitedByEmail)},
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING id, email, role, status, "isSystem", "invitedByEmail",
      "lastInviteSentAt", "acceptedAt", "createdAt", "updatedAt"
  `;

  return rows[0];
}

export async function recordAdminInviteSent(
  email: string,
): Promise<AdminAccountRow> {
  await ensureAdminAccountTable();

  const normalizedEmail = normalizeAdminEmail(email);
  assertValidAdminEmail(normalizedEmail);

  const rows = await prisma.$queryRaw<AdminAccountRow[]>`
    UPDATE "AdminAccount"
    SET "lastInviteSentAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE email = ${normalizedEmail}
    RETURNING id, email, role, status, "isSystem", "invitedByEmail",
      "lastInviteSentAt", "acceptedAt", "createdAt", "updatedAt"
  `;

  if (!rows[0]) {
    throw new Error("Admin account not found.");
  }

  return rows[0];
}

export async function removeAdminAccount(email: string): Promise<AdminAccountRow> {
  await ensureAdminAccountTable();

  const existing = await getAdminAccountByEmail(email);

  if (!existing) {
    throw new Error("Admin account not found.");
  }

  if (existing.role === "SUPER_ADMIN") {
    throw new Error("Super admin access cannot be removed.");
  }

  if (existing.isSystem) {
    throw new Error("System admin access is managed by the app configuration.");
  }

  const rows = await prisma.$queryRaw<AdminAccountRow[]>`
    UPDATE "AdminAccount"
    SET status = 'REMOVED',
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE email = ${existing.email}
    RETURNING id, email, role, status, "isSystem", "invitedByEmail",
      "lastInviteSentAt", "acceptedAt", "createdAt", "updatedAt"
  `;

  return rows[0];
}
