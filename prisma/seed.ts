
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Hapus pengguna yang sudah ada untuk menghindari duplikasi email
  await prisma.user.deleteMany({ where: { email: 'owner@maujajan.com' } });
  await prisma.outlet.deleteMany({ where: { name: 'Main Outlet' } });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password', salt);

  const mainOutlet = await prisma.outlet.create({
    data: {
      name: 'Main Outlet',
      address: 'Jl. Raya No. 1',
    },
  });
  console.log(`Created main outlet with id: ${mainOutlet.id}`);

  const user = await prisma.user.create({
    data: {
      name: 'Admin Utama',
      email: 'owner@maujajan.com',
      username: 'owner',
      password: hashedPassword,
      role: 'owner',
      outletId: mainOutlet.id,
    },
  });
  console.log(`Created user with id: ${user.id}`);

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
