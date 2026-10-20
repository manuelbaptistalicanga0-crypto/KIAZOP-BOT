import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Instancia única por processo/serverless worker para reutilizar o pool do Supabase. */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada.");
  const adapter = new PrismaPg({ connectionString, max: Number(process.env.DATABASE_POOL_MAX || 5) });
  const client = new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
  // Reutiliza o pool entre requests no mesmo worker serverless, também em produção.
  globalForPrisma.prisma = client;
  return client;
}
