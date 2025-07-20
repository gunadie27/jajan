-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_outletId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "outletId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
