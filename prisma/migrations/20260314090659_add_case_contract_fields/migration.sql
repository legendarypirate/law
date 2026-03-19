-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "contractFee" DECIMAL(14,2),
ADD COLUMN     "contractFiles" JSONB,
ADD COLUMN     "contractTerm" TEXT,
ADD COLUMN     "paymentSchedule" JSONB;
