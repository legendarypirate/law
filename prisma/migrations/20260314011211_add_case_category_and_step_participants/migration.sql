-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "caseTypeCategoryId" TEXT;

-- CreateTable
CREATE TABLE "CaseStepParticipant" (
    "id" TEXT NOT NULL,
    "caseStepId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStepParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseStepParticipant_caseStepId_idx" ON "CaseStepParticipant"("caseStepId");

-- CreateIndex
CREATE INDEX "CaseStepParticipant_caseStepId_role_idx" ON "CaseStepParticipant"("caseStepId", "role");

-- CreateIndex
CREATE INDEX "Case_caseTypeCategoryId_idx" ON "Case"("caseTypeCategoryId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_caseTypeCategoryId_fkey" FOREIGN KEY ("caseTypeCategoryId") REFERENCES "CaseTypeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStepParticipant" ADD CONSTRAINT "CaseStepParticipant_caseStepId_fkey" FOREIGN KEY ("caseStepId") REFERENCES "CaseStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
