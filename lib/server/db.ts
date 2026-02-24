import { createHash, randomUUID } from "node:crypto";

import { QuoteSummary, UserProfile } from "@/lib/types";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "customer" | "wholesale" | "admin";
  provider: "email" | "google";
}

export interface ContactSubmissionRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: string;
}

export interface CatalogSubmissionRecord {
  id: string;
  payload: unknown;
  createdAt: string;
}

export interface WholesaleSubmissionRecord {
  id: string;
  payload: unknown;
  createdAt: string;
}

interface InMemoryDatabase {
  users: UserRecord[];
  profiles: Record<string, UserProfile>;
  recoveryTokens: Record<string, { token: string; expiresAt: string }>;
  sessions: Record<string, string>;
  contactSubmissions: ContactSubmissionRecord[];
  catalogSubmissions: CatalogSubmissionRecord[];
  wholesaleSubmissions: WholesaleSubmissionRecord[];
  quoteHistory: QuoteSummary[];
}

declare global {
  var __equinematesDb: InMemoryDatabase | undefined;
}

function hash(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function createBaseDatabase(): InMemoryDatabase {
  const adminId = randomUUID();
  const wholesaleId = randomUUID();
  const customerId = randomUUID();

  const users: UserRecord[] = [
    {
      id: adminId,
      name: "Equinemates Admin",
      email: "admin@equinemates.com",
      passwordHash: hash("Admin@123"),
      role: "admin",
      provider: "email",
    },
    {
      id: wholesaleId,
      name: "Falcon Stables",
      email: "procurement@falconstables.pk",
      passwordHash: hash("Wholesale@123"),
      role: "wholesale",
      provider: "email",
    },
    {
      id: customerId,
      name: "Sara Noor",
      email: "sara.noor@example.com",
      passwordHash: hash("Customer@123"),
      role: "customer",
      provider: "email",
    },
  ];

  const profiles: Record<string, UserProfile> = {
    [customerId]: {
      id: customerId,
      name: "Sara Noor",
      email: "sara.noor@example.com",
      phone: "+92 300 1112222",
      role: "customer",
      wishlist: ["stablecore-groom-kit", "comfortnest-orthopedic-bed"],
      addresses: [
        {
          id: randomUUID(),
          label: "Home",
          recipient: "Sara Noor",
          line1: "House 18, Street 5, DHA Phase 6",
          city: "Lahore",
          province: "Punjab",
          postalCode: "54000",
          country: "Pakistan",
        },
      ],
      orders: [
        {
          id: "ORD-1042",
          date: "2026-01-28",
          status: "shipped",
          totalPkr: 18500,
          itemCount: 2,
        },
        {
          id: "ORD-1031",
          date: "2025-12-19",
          status: "delivered",
          totalPkr: 12900,
          itemCount: 1,
        },
      ],
    },
    [wholesaleId]: {
      id: wholesaleId,
      name: "Falcon Stables",
      email: "procurement@falconstables.pk",
      role: "wholesale",
      wishlist: [],
      addresses: [],
      orders: [],
    },
    [adminId]: {
      id: adminId,
      name: "Equinemates Admin",
      email: "admin@equinemates.com",
      role: "admin",
      wishlist: [],
      addresses: [],
      orders: [],
    },
  };

  const quoteHistory: QuoteSummary[] = [
    {
      id: "Q-204",
      companyName: "Falcon Stables",
      requestedAt: "2026-02-02",
      status: "reviewing",
      estimatedTotalPkr: 450000,
    },
    {
      id: "Q-198",
      companyName: "Desert Riders Club",
      requestedAt: "2026-01-15",
      status: "quoted",
      estimatedTotalPkr: 278000,
    },
  ];

  return {
    users,
    profiles,
    recoveryTokens: {},
    sessions: {},
    contactSubmissions: [],
    catalogSubmissions: [],
    wholesaleSubmissions: [],
    quoteHistory,
  };
}

export const db = globalThis.__equinematesDb ?? createBaseDatabase();
globalThis.__equinematesDb = db;

export function hashPassword(password: string): string {
  return hash(password);
}
