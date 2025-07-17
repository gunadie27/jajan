import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to add usernames...');

  const users = await prisma.user.findMany();

  for (const user of users) {
    if (!user.username) {
      // Use a sanitized version of the email as the username
      const newUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      await prisma.user.update({
        where: { id: user.id },
        data: { username: newUsername },
      });
      console.log(`Updated user ${user.id} with username: ${newUsername}`);
    }
  }

  console.log('Migration finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
