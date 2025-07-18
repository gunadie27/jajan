
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // 1. Cari outlet yang akan dihapus
  const outlet = await prisma.outlet.findUnique({ where: { name: 'Main Outlet' } });

  // 2. Jika outlet ada, hapus semua data child yang berelasi ke outlet tsb, lalu hapus outlet-nya
  if (outlet) {
    // Cari semua transaction id yang terkait outlet
    const transactions = await prisma.transaction.findMany({
      where: { outletId: outlet.id },
      select: { id: true },
    });
    const transactionIds = transactions.map(t => t.id);

    // Hapus order item yang terkait transaction
    if (transactionIds.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { transactionId: { in: transactionIds } }
      });
    }

    // Hapus transaction
    await prisma.transaction.deleteMany({ where: { outletId: outlet.id } });

    // Hapus expense, cashierSession, user
    await prisma.expense.deleteMany({ where: { outletId: outlet.id } });
    await prisma.cashierSession.deleteMany({ where: { outletId: outlet.id } });
    await prisma.user.deleteMany({ where: { outletId: outlet.id } });

    // Hapus customer yang terkait outlet (tambahan karena ada foreign key)
    await prisma.customer.deleteMany({ where: { outletId: outlet.id } });

    // Hapus product yang terkait outlet (tambahan karena ada foreign key)
    await prisma.product.deleteMany({ where: { outletId: outlet.id } });

    // Hapus outlet
    await prisma.outlet.delete({ where: { id: outlet.id } });
  }

  // 3. Buat outlet baru
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password', salt);

  const mainOutlet = await prisma.outlet.create({
    data: {
      name: 'Main Outlet',
      address: 'Jl. Raya No. 1',
    },
  });
  console.log(`Created main outlet with id: ${mainOutlet.id}`);

  // 4. Buat user baru
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

  // 5. Buat beberapa produk contoh
  const product1 = await prisma.product.create({
    data: {
      name: 'Nasi Goreng',
      category: 'Makanan',
      imageUrl: '/images/nasi-goreng.jpg',
      outletId: mainOutlet.id,
    },
  });
  console.log(`Created product with id: ${product1.id}`);

  await prisma.productVariant.create({
    data: {
      productId: product1.id,
      name: 'Original',
      price: 15000,
      cogs: 10000,
      stock: 100,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Es Teh Manis',
      category: 'Minuman',
      imageUrl: '/images/es-teh.jpg',
      outletId: mainOutlet.id,
    },
  });
  console.log(`Created product with id: ${product2.id}`);

  await prisma.productVariant.create({
    data: {
      productId: product2.id,
      name: 'Original',
      price: 5000,
      cogs: 2000,
      stock: 100,
    },
  });

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
