import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query'],
    // Tambahkan connection pooling untuk performa lebih baik
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Optimasi connection
    __internal: {
      engine: {
        // Connection pooling
        connectionLimit: 10,
        // Query timeout
        queryTimeout: 30000,
        // Connection timeout
        connectionTimeout: 10000,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;



