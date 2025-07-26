/*
  Warnings:

  - You are about to drop the column `description` on the `DiscountRule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DiscountRule" DROP COLUMN "description",
ADD COLUMN     "maxDiscountAmount" DOUBLE PRECISION;
