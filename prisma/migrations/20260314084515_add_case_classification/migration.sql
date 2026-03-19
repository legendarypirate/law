/*
  Warnings:

  - You are about to drop the column `caseHandwrittenNotes` on the `Case` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Case" DROP COLUMN "caseHandwrittenNotes",
ADD COLUMN     "caseClassificationId" TEXT;

-- CreateTable
CREATE TABLE "CaseClassification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Case_caseClassificationId_idx" ON "Case"("caseClassificationId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_caseClassificationId_fkey" FOREIGN KEY ("caseClassificationId") REFERENCES "CaseClassification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
