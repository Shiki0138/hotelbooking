import Bull from 'bull';
import { setQueues, BullAdapter } from 'bull-board';
import { Redis } from 'ioredis';
import { sendEmail } from './emailService';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

// Queue configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Define job queues
export const emailQueue = new Bull('email', { redis: redisConfig });
export const bookingQueue = new Bull('booking', { redis: redisConfig });
export const notificationQueue = new Bull('notification', { redis: redisConfig });
export const analyticsQueue = new Bull('analytics', { redis: redisConfig });
export const maintenanceQueue = new Bull('maintenance', { redis: redisConfig });

// Setup Bull Board for monitoring
setQueues([
  new BullAdapter(emailQueue),
  new BullAdapter(bookingQueue),
  new BullAdapter(notificationQueue),
  new BullAdapter(analyticsQueue),
  new BullAdapter(maintenanceQueue),
]);

// Email Queue Processor
emailQueue.process(async (job) => {
  const { to, subject, template, data } = job.data;
  
  try {
    await sendEmail({ to, subject, template, data });
    logger.info(`Email sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    logger.error('Email job failed:', error);
    throw error;
  }
});

// Booking Queue Processor
bookingQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'confirmation':
      await processBookingConfirmation(data);
      break;
    case 'reminder':
      await processBookingReminder(data);
      break;
    case 'cancellation':
      await processBookingCancellation(data);
      break;
    case 'review-request':
      await processReviewRequest(data);
      break;
    default:
      throw new Error(`Unknown booking job type: ${type}`);
  }
});

// Notification Queue Processor
notificationQueue.process(async (job) => {
  const { type, userId, data } = job.data;

  try {
    // Create notification record
    await prisma.notification.create({
      data: {
        userId,
        type,
        title: data.title,
        message: data.message,
        data: JSON.stringify(data),
        isRead: false,
      },
    });

    // Send push notification if enabled
    if (data.sendPush) {
      // Implement push notification logic
      await sendPushNotification(userId, data);
    }

    // Send via WebSocket for real-time updates
    const { io } = await import('../index');
    io.to(`user-${userId}`).emit('notification', {
      type,
      title: data.title,
      message: data.message,
      timestamp: new Date(),
    });

    return { success: true };
  } catch (error) {
    logger.error('Notification job failed:', error);
    throw error;
  }
});

// Analytics Queue Processor
analyticsQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'search-analytics':
      await processSearchAnalytics(data);
      break;
    case 'booking-analytics':
      await processBookingAnalytics(data);
      break;
    case 'user-behavior':
      await processUserBehaviorAnalytics(data);
      break;
    case 'revenue-report':
      await generateRevenueReport(data);
      break;
    default:
      throw new Error(`Unknown analytics job type: ${type}`);
  }
});

// Maintenance Queue Processor
maintenanceQueue.process(async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'cleanup-expired-sessions':
      await cleanupExpiredSessions();
      break;
    case 'update-search-indexes':
      await updateSearchIndexes();
      break;
    case 'generate-sitemap':
      await generateSitemap();
      break;
    case 'backup-database':
      await backupDatabase();
      break;
    case 'sync-inventory':
      await syncInventory();
      break;
    default:
      throw new Error(`Unknown maintenance job type: ${type}`);
  }
});

// Helper functions
async function processBookingConfirmation(data: any) {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      user: true,
      hotel: true,
      room: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Send confirmation email
  await emailQueue.add('booking-confirmation', {
    to: booking.user.email,
    subject: `Booking Confirmed - ${booking.hotel.name}`,
    template: 'bookingConfirmation',
    data: {
      userName: booking.user.name,
      hotelName: booking.hotel.name,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      roomType: booking.room.name,
      totalPrice: booking.totalPrice,
      bookingId: booking.id,
    },
  });
}

async function processBookingReminder(data: any) {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      user: true,
      hotel: true,
    },
  });

  if (!booking || booking.status !== 'CONFIRMED') {
    return;
  }

  await emailQueue.add('booking-reminder', {
    to: booking.user.email,
    subject: `Reminder: Your stay at ${booking.hotel.name}`,
    template: 'bookingReminder',
    data: {
      userName: booking.user.name,
      hotelName: booking.hotel.name,
      checkInDate: booking.checkInDate,
      daysUntilCheckIn: data.daysUntilCheckIn,
    },
  });
}

async function processBookingCancellation(data: any) {
  // Implementation for booking cancellation
  logger.info('Processing booking cancellation:', data);
}

async function processReviewRequest(data: any) {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      user: true,
      hotel: true,
    },
  });

  if (!booking || booking.status !== 'COMPLETED') {
    return;
  }

  await emailQueue.add('review-request', {
    to: booking.user.email,
    subject: `How was your stay at ${booking.hotel.name}?`,
    template: 'reviewRequest',
    data: {
      userName: booking.user.name,
      hotelName: booking.hotel.name,
      bookingId: booking.id,
    },
  });
}

async function sendPushNotification(userId: string, data: any) {
  // Implement push notification logic
  logger.info(`Sending push notification to user ${userId}:`, data);
}

async function processSearchAnalytics(data: any) {
  // Store search analytics
  await prisma.searchAnalytics.create({
    data: {
      userId: data.userId,
      searchQuery: data.query,
      location: data.location,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      resultsCount: data.resultsCount,
      clickedResults: data.clickedResults,
    },
  });
}

async function processBookingAnalytics(data: any) {
  // Process booking analytics
  logger.info('Processing booking analytics:', data);
}

async function processUserBehaviorAnalytics(data: any) {
  // Process user behavior analytics
  logger.info('Processing user behavior analytics:', data);
}

async function generateRevenueReport(data: any) {
  // Generate revenue report
  const report = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', created_at) as date,
      COUNT(*) as bookings,
      SUM(total_price) as revenue
    FROM bookings
    WHERE status = 'CONFIRMED'
      AND created_at >= ${data.startDate}
      AND created_at <= ${data.endDate}
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date
  `;

  // Save report or send via email
  logger.info('Revenue report generated:', report);
}

async function cleanupExpiredSessions() {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - 30);

  const deleted = await prisma.session.deleteMany({
    where: {
      createdAt: { lt: expiryDate },
    },
  });

  logger.info(`Cleaned up ${deleted.count} expired sessions`);
}

async function updateSearchIndexes() {
  // Update search indexes
  logger.info('Updating search indexes...');
}

async function generateSitemap() {
  // Generate sitemap
  logger.info('Generating sitemap...');
}

async function backupDatabase() {
  // Backup database
  logger.info('Backing up database...');
}

async function syncInventory() {
  // Sync inventory with external systems
  logger.info('Syncing inventory...');
}

// Job scheduling
export function scheduleJobs() {
  // Schedule booking reminders (daily at 9 AM)
  bookingQueue.add(
    'check-reminders',
    { type: 'reminder-check' },
    { repeat: { cron: '0 9 * * *' } }
  );

  // Schedule review requests (daily at 10 AM)
  bookingQueue.add(
    'review-requests',
    { type: 'review-check' },
    { repeat: { cron: '0 10 * * *' } }
  );

  // Schedule maintenance jobs
  maintenanceQueue.add(
    'cleanup-sessions',
    { type: 'cleanup-expired-sessions' },
    { repeat: { cron: '0 2 * * *' } } // 2 AM daily
  );

  maintenanceQueue.add(
    'update-indexes',
    { type: 'update-search-indexes' },
    { repeat: { cron: '0 3 * * *' } } // 3 AM daily
  );

  maintenanceQueue.add(
    'generate-sitemap',
    { type: 'generate-sitemap' },
    { repeat: { cron: '0 4 * * *' } } // 4 AM daily
  );

  maintenanceQueue.add(
    'sync-inventory',
    { type: 'sync-inventory' },
    { repeat: { cron: '*/30 * * * *' } } // Every 30 minutes
  );

  // Schedule analytics jobs
  analyticsQueue.add(
    'daily-revenue-report',
    { type: 'revenue-report' },
    { repeat: { cron: '0 1 * * *' } } // 1 AM daily
  );

  logger.info('Jobs scheduled successfully');
}

// Queue event handlers
const queues = [emailQueue, bookingQueue, notificationQueue, analyticsQueue, maintenanceQueue];

queues.forEach(queue => {
  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed in queue ${queue.name}`);
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed in queue ${queue.name}:`, err);
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} stalled in queue ${queue.name}`);
  });
});

// Export job creation functions
export const JobQueue = {
  // Email jobs
  sendEmail: (data: any) => emailQueue.add('send-email', data),
  
  // Booking jobs
  sendBookingConfirmation: (bookingId: string) => 
    bookingQueue.add('booking-confirmation', { type: 'confirmation', data: { bookingId } }),
  
  sendBookingReminder: (bookingId: string, daysUntilCheckIn: number) =>
    bookingQueue.add('booking-reminder', { type: 'reminder', data: { bookingId, daysUntilCheckIn } }),
  
  requestReview: (bookingId: string) =>
    bookingQueue.add('review-request', { type: 'review-request', data: { bookingId } }),
  
  // Notification jobs
  sendNotification: (userId: string, data: any) =>
    notificationQueue.add('send-notification', { userId, data }),
  
  // Analytics jobs
  trackSearch: (data: any) =>
    analyticsQueue.add('search-analytics', { type: 'search-analytics', data }),
  
  trackBooking: (data: any) =>
    analyticsQueue.add('booking-analytics', { type: 'booking-analytics', data }),
};