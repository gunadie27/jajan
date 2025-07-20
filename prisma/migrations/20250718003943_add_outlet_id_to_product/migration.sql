/*
  Warnings:

  - Added the required column `outletId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Tambah kolom outletId tanpa NOT NULL constraint dulu
ALTER TABLE "Product" ADD COLUMN "outletId" TEXT;

-- Step 2: Update data existing dengan outletId dari outlet yang ada
UPDATE "Product" SET "outletId" = (SELECT id FROM "Outlet" LIMIT 1);

-- Step 3: Buat kolom outletId menjadi NOT NULL
ALTER TABLE "Product" ALTER COLUMN "outletId" SET NOT NULL;

-- Step 4: Tambah foreign key constraint
ALTER TABLE "Product" ADD CONSTRAINT "Product_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
