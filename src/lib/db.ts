import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    // Optimasi untuk production dengan latency tinggi
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pooling untuk production dengan latency tinggi
    __internal: {
      engine: {
        // Connection pooling yang lebih agresif untuk mengatasi latency
        connectionLimit: process.env.NODE_ENV === 'production' ? 30 : 10,
        // Query timeout yang lebih pendek untuk production
        queryTimeout: process.env.NODE_ENV === 'production' ? 15000 : 30000,
        // Connection timeout yang lebih pendek
        connectionTimeout: process.env.NODE_ENV === 'production' ? 8000 : 10000,
        // Pool timeout yang lebih pendek
        poolTimeout: process.env.NODE_ENV === 'production' ? 3000 : 5000,
        // Keep alive untuk connection yang stabil
        keepAlive: process.env.NODE_ENV === 'production' ? true : false,
        // Connection retry untuk network issues
        retryAttempts: process.env.NODE_ENV === 'production' ? 3 : 1,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;



