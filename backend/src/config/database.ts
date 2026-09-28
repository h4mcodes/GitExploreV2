import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Global singleton pattern to prevent multiple instances during hot reloading
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Validates database connectivity by executing a lightweight ping query.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully disconnects Prisma client connections.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
