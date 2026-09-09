import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

// Invalidate stale client and require cache if newly added models are missing from cached instance
if (globalForPrisma.prisma && !("requestClaim" in (globalForPrisma.prisma as any))) {
  if (typeof require !== "undefined" && require.cache) {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes(".prisma") || key.includes("@prisma")) {
        delete require.cache[key];
      }
    });
  }
  delete globalForPrisma.prisma;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}