-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- AlterTable
ALTER TABLE "Case" ADD COLUMN "closeComment" TEXT,
ADD COLUMN "closedAt" TIMESTAMP(3);
