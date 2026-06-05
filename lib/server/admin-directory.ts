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
  return uniqueEmails(splitEmailEnv(process.env.SUPER_ADMIN_EMAILS));
}

function assertValidAdminEmail(email: string) {
  if (!isValidAdminEmail(email)) {
    throw new Error("Enter a valid email address.");
  }
}

async function ensureBootstrapAdminAccounts() {
  if (adminDirectoryReady) {
    return;
  }

  for (const email of getBootstrapSuperAdminEmails()) {
    await upsertSystemAdminAccount(email, "SUPER_ADMIN");
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

  if (normalizedEmails.some((email) => superAdmins.has(email))) {
    return { isAuthorized: true, role: "SUPER_ADMIN" };
  }

  return { isAuthorized: false, role: null };
}

export async function getAdminAccountByEmail(
  email: string,
): Promise<AdminAccountRow | null> {
  await ensureBootstrapAdminAccounts();

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
  await ensureBootstrapAdminAccounts();

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
  await ensureBootstrapAdminAccounts();

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
  await ensureBootstrapAdminAccounts();

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
  await ensureBootstrapAdminAccounts();

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
  await ensureBootstrapAdminAccounts();

  const existing = await getAdminAccountByEmail(email);

  if (!existing) {
    throw new Error("Admin account not found.");
  }

  if (existing.role === "SUPER_ADMIN") {
    throw new Error("Super admin access cannot be removed.");
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
