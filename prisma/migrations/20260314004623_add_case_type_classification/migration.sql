-- CreateTable
CREATE TABLE "CaseType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseTypeCategory" (
    "id" TEXT NOT NULL,
    "caseTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseTypeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseTypeCategory_caseTypeId_idx" ON "CaseTypeCategory"("caseTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseTypeCategory_caseTypeId_name_key" ON "CaseTypeCategory"("caseTypeId", "name");

-- AddForeignKey
ALTER TABLE "CaseTypeCategory" ADD CONSTRAINT "CaseTypeCategory_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
