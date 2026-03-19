/*
  Warnings:

  - You are about to drop the column `caseTsahType` on the `Case` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Case" DROP COLUMN "caseTsahType",
ADD COLUMN     "caseTsahTypes" JSONB;
