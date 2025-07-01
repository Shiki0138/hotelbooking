import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

let prisma: PrismaClient;

export const initializePrisma = async (): Promise<void> => {
  try {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
    
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error; // Don't continue without database
  }
};

export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Prisma has not been initialized. Call initializePrisma() first.');
  }
  return prisma;
};

process.on('beforeExit', async () => {
  await prisma?.$disconnect();
});