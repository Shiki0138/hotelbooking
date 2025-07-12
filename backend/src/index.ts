// メインサーバー実装を使用
import './server';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

// Middleware
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { aiTimeoutMiddleware } from './middleware/aiTimeout';
import { rateLimiter } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth.routes';
import hotelRoutes from './routes/hotel.routes';
import affiliateRoutes from './routes/affiliate.routes';
import healthRoutes from './routes/health.routes';
// Conditional imports for optional routes (will be created later)
// import autocompleteRoutes from './routes/autocomplete.routes';
// import bookingRoutes from './routes/booking.routes';
// import weatherRoutes from './routes/weather.routes';
// import imageRoutes from './routes/image.routes';
// import geocodingRoutes from './routes/geocoding.routes';
// import currencyRoutes from './routes/currency.routes';
// import aiRoutes from './routes/ai.routes';
import userPreferenceRoutes from './routes/userPreferenceRoutes';
const userPreferenceMatchingRoutes = require('./routes/userPreferenceMatchingRoutes');
import watchlistRoutes from './routes/watchlistRoutes';
import segmentRoutes from './routes/segmentRoutes';
import pricePredictionRoutes from './routes/pricePredictionRoutes';
import locationRoutes from './routes/locationRoutes';
import adminRoutes from './routes/admin';

// Services
import { CacheService } from './services/cache.service';
// import { SearchOptimizationService } from './services/searchOptimization.service';
// import { RealtimeSearchService } from './services/realtimeSearch.service';
// import { AutocompleteService } from './services/autocomplete.service';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
  }
});

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:8080',  // Frontend dev server (Vite)
    'http://localhost:3000',  // Alternative frontend port
    'http://127.0.0.1:8080',  // IPv4 localhost
    'http://127.0.0.1:3000',  // IPv4 localhost alternative
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
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(rateLimiter);

// API Routes with /api prefix
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/affiliate', affiliateRoutes);

// Optional routes (commented out until implemented)
// app.use('/api/autocomplete', autocompleteRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/weather', weatherRoutes);
// app.use('/api/images', imageRoutes);
// app.use('/api/geocoding', geocodingRoutes);
// app.use('/api/currency', currencyRoutes);

// AI routes with timeout middleware (commented out until implemented)
// app.use('/api/ai', aiTimeoutMiddleware, aiRoutes);

// User preference routes (search history, favorites, etc.)
app.use('/api/user-preferences', userPreferenceRoutes);

// User preference matching routes
app.use('/api/user-matching', userPreferenceMatchingRoutes);

// Watchlist routes
app.use('/api/watchlist', watchlistRoutes);

// Segment routes
app.use('/api/segments', segmentRoutes);

// Price prediction routes
app.use('/api/price-predictions', pricePredictionRoutes);

// Location search routes
app.use('/api/locations', locationRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Hotel inventory management routes
// app.use('/api/inventory', hotelInventoryRoutes);

// Revenue management routes
// app.use('/api/revenue', revenueManagementRoutes);

// Refund management routes
// app.use('/api/refunds', refundRoutes);

// Two-factor authentication routes
// app.use('/api/2fa', twoFactorAuthRoutes);

// CMS routes
// app.use('/api/cms', cmsRoutes);

// OTA integration routes
// app.use('/api/ota', otaRoutes);

// Group booking routes
// app.use('/api/group-bookings', groupBookingRoutes);

// Business Intelligence routes
// app.use('/api/bi', businessIntelligenceRoutes);

// SEO routes
// app.use('/api/seo', seoRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'LastMinuteStay Backend API',
    database: 'connected',
    version: '1.0.0'
  });
});

// Legacy health endpoint for compatibility
app.get('/health', (_req, res) => {
  res.redirect('/api/health');
});

// setupSwagger(app);

app.use(errorHandler);

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    // Initialize cache service
    const cacheService = new CacheService();
    
    // Simple server startup
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      socket.on('subscribe:availability', (roomId: string) => {
        socket.join(`room:${roomId}`);
      });
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };