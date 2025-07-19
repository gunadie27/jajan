/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Outlet` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionNumber]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "transactionNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_code_key" ON "Outlet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionNumber_key" ON "Transaction"("transactionNumber");
