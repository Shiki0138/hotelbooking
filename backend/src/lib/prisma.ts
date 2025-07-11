import { PrismaClient } from '@prisma/client';

// Mock Prisma client for deployment without actual Prisma setup
// This allows the TypeScript compilation to succeed
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a mock PrismaClient that returns empty results
const createMockPrismaClient = () => {
  const handler = {
    get(target: any, prop: string) {
      // Return mock methods for common Prisma operations
      if (['findMany', 'findUnique', 'findFirst', 'create', 'update', 'delete', 'count', 'aggregate'].includes(prop)) {
        return async () => {
          console.warn(`Mock Prisma: ${prop} called - returning empty result`);
          if (prop === 'findMany') return [];
          if (prop === 'count') return 0;
          if (prop === 'aggregate') return {};
          return null;
        };
      }
      
      // Return nested model proxies
      return new Proxy({}, handler);
    }
  };
  
  return new Proxy({} as PrismaClient, handler);
};

// Use mock client for now
const prisma = global.prisma || createMockPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export { prisma };