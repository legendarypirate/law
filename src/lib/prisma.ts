import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// In development, always create a fresh client so schema changes (e.g. new Case fields) are picked up after `prisma generate` + restart.
// In production, use cached client if it has all expected models.
const cached = globalForPrisma.prisma;
const hasCaseType =
  cached && "caseType" in cached && typeof (cached as { caseType?: unknown }).caseType === "object";
const hasCaseStepParticipant =
  cached && "caseStepParticipant" in cached && typeof (cached as { caseStepParticipant?: unknown }).caseStepParticipant === "object";
const hasTask =
  cached && "task" in cached && typeof (cached as { task?: unknown }).task === "object";
const hasCaseClassification =
  cached && "caseClassification" in cached && typeof (cached as { caseClassification?: unknown }).caseClassification === "object";
const hasAppSetting =
  cached && "appSetting" in cached && typeof (cached as { appSetting?: unknown }).appSetting === "object";
const useCache =
  process.env.NODE_ENV === "production" &&
  hasCaseType &&
  hasCaseStepParticipant &&
  hasTask &&
  hasCaseClassification &&
  hasAppSetting;
export const prisma = useCache ? cached : createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
