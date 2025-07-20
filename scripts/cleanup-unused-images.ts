import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const uploadsDir = path.join(process.cwd(), 'public/uploads');

async function main() {
  // Ambil semua imageUrl produk dari database
  const products = await prisma.product.findMany({ select: { imageUrl: true } });
  const usedImages = new Set(
    products
      .map(p => p.imageUrl)
      .filter(Boolean)
      .map(url => url?.replace(/^\/uploads\//, ''))
  );

  // Ambil semua file di folder uploads
  const files = fs.readdirSync(uploadsDir);
  let deleted = 0;
  for (const file of files) {
    if (!usedImages.has(file)) {
      fs.unlinkSync(path.join(uploadsDir, file));
      console.log('Deleted unused image:', file);
      deleted++;
    }
  }
  console.log(`Cleanup complete. Deleted ${deleted} unused images.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 