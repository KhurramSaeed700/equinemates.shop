import "dotenv/config";
import { prisma } from "./lib/prisma";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "alice@prisma.io" },
    update: {
      name: "Alice",
    },
    create: {
      clerkId: "seed_alice_clerk_id",
      name: "Alice",
      email: "alice@prisma.io",
      role: "CUSTOMER",
    },
  });

  console.log("User upserted:");
  console.log(user);
}

main()
  .catch((error) => {
    console.error("Query failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
