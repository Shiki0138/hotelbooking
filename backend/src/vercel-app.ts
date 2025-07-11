import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import hotelRoutes from './routes/hotelRoutes';
import authRoutes from './routes/authRoutes';
import rakutenRoutes from './routes/rakutenRoutes';
// Additional routes can be enabled as needed
// import bookingRoutes from './routes/bookingRoutes';
// import weatherRoutes from './routes/weatherRoutes';
// import currencyRoutes from './routes/currencyRoutes';
// import hotelInventoryRoutes from './routes/hotelInventoryRoutes';
// import revenueManagementRoutes from './routes/revenueManagementRoutes';
// import refundRoutes from './routes/refundRoutes';
// import twoFactorAuthRoutes from './routes/twoFactorAuthRoutes';
// import cmsRoutes from './routes/cmsRoutes';
// import otaRoutes from './routes/otaRoutes';
// import groupBookingRoutes from './routes/groupBookingRoutes';
// import businessIntelligenceRoutes from './routes/businessIntelligenceRoutes';
// import seoRoutes from './routes/seoRoutes';

dotenv.config();

const app: Express = express();

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    /^https:\/\/.*\.vercel\.app$/,
    process.env.FRONTEND_URL || 'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(rateLimiter);

// API Routes - Core functionality only
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rakuten', rakutenRoutes);

// Additional routes can be enabled as needed:
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/weather', weatherRoutes);
// app.use('/api/currency', currencyRoutes);
// app.use('/api/refunds', refundRoutes);
// app.use('/api/2fa', twoFactorAuthRoutes);
// app.use('/api/cms', cmsRoutes);
// app.use('/api/ota', otaRoutes);
// app.use('/api/group-bookings', groupBookingRoutes);
// app.use('/api/bi', businessIntelligenceRoutes);
// app.use('/api/seo', seoRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'LastMinuteStay Backend API',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Legacy health endpoint
app.get('/health', (_req, res) => {
  res.redirect('/api/health');
});

// Error handler
app.use(errorHandler);

// Export for Vercel
export default app;