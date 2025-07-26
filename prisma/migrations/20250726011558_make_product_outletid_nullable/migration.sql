-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_outletId_fkey";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "outletId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
