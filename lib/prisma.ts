import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const globalForPrisma = globalThis as unknown as {
  __equinematesPrisma?: PrismaClient;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Set it in .env.local or in your deployment environment.",
    );
  }

  return databaseUrl;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });

  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.__equinematesPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__equinematesPrisma = prisma;
}

export { prisma };
