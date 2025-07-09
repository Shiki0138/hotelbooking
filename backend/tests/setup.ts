import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test database URL
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Mock external services
jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
      }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 'refund_test123',
        status: 'succeeded',
      }),
    },
  })),
}));

// Increase timeout for database operations
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  const { prisma } = await import('../src/lib/prisma');
  await prisma.$disconnect();
});