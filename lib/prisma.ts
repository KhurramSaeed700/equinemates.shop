import { config } from "dotenv";
import { lookup, Resolver } from "node:dns/promises";
import { Socket } from "node:net";
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

async function resolveDatabaseHost(host: string) {
  try {
    return (await lookup(host, { family: 4 })).address;
  } catch (systemDnsError) {
    if (!host.endsWith(".neon.tech")) {
      throw systemDnsError;
    }

    const resolver = new Resolver();
    resolver.setServers(["1.1.1.1", "1.0.0.1"]);

    try {
      const addresses = await resolver.resolve4(host);
      const address = addresses[Math.floor(Math.random() * addresses.length)];

      if (address) {
        return address;
      }
    } catch {
      // Preserve the original system DNS error when the fallback also fails.
    }

    throw systemDnsError;
  }
}

function createDatabaseSocket() {
  const socket = new Socket();
  const nativeConnect = socket.connect.bind(socket);

  socket.connect = ((
    port: number,
    host: string,
    connectionListener?: () => void,
  ) => {
    void resolveDatabaseHost(host)
      .then((address) => {
        nativeConnect(port, address, connectionListener);
      })
      .catch((error: unknown) => {
        socket.destroy(
          error instanceof Error
            ? error
            : new Error("Could not resolve the database host."),
        );
      });

    return socket;
  }) as Socket["connect"];

  return socket;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: getDatabaseUrl(),
    stream: createDatabaseSocket,
  });

  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.__equinematesPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__equinematesPrisma = prisma;
}

export { prisma };
