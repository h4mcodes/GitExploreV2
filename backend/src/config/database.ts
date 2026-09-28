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

export interface DatabaseHealthStatus {
  readonly connected: boolean;
  readonly latencyMs?: number;
  readonly error?: string;
}

/**
 * Validates database connectivity by executing a lightweight ping query.
 */
export async function checkDatabaseConnection(): Promise<DatabaseHealthStatus> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      latencyMs,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    return {
      connected: false,
      error: message,
    };
  }
}

/**
 * Gracefully disconnects Prisma client connections.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
