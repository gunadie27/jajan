/*
  Warnings:

  - You are about to drop the column `outletId` on the `Customer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[memberId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - The required column `memberId` was added to the `Customer` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_outletId_fkey";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "outletId",
ADD COLUMN     "isMember" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastUsedDiscount" TIMESTAMP(3),
ADD COLUMN     "memberId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_memberId_key" ON "Customer"("memberId");
