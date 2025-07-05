import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import hotelRoutes from './routes/hotelRoutes';
import roomRoutes from './routes/roomRoutes';
import bookingRoutes from './routes/bookingRoutes';
import authRoutes from './routes/authRoutes';
import monitoringRoutes from './routes/monitoringRoutes';
import searchRoutes from './routes/searchRoutes';
import autocompleteRoutes from './routes/autocompleteRoutes';
import weatherRoutes from './routes/weatherRoutes';
import imageRoutes from './routes/imageRoutes';
import geocodingRoutes from './routes/geocodingRoutes';
import currencyRoutes from './routes/currencyRoutes';
import affiliateRoutes from './routes/affiliateRoutes';
import { initializeRedis } from './services/cacheService';
import { initializePrisma } from './services/databaseService';
import { setupSwagger } from './utils/swagger';
import { SearchOptimizationService } from './services/searchOptimizationService';
import { RealtimeSearchService } from './services/realtimeSearchService';
import { AutocompleteService } from './services/autocompleteService';
import aiRoutes from './routes/aiRoutes';
import { aiTimeoutMiddleware } from './middleware/aiTimeout';
import userPreferenceRoutes from './routes/userPreferenceRoutes';
const userPreferenceMatchingRoutes = require('./routes/userPreferenceMatchingRoutes');
import watchlistRoutes from './routes/watchlistRoutes';
import segmentRoutes from './routes/segmentRoutes';
import pricePredictionRoutes from './routes/pricePredictionRoutes';

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
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/autocomplete', autocompleteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/affiliate', affiliateRoutes);

// AI routes with timeout middleware
app.use('/api/ai', aiTimeoutMiddleware, aiRoutes);

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

setupSwagger(app);

app.use(errorHandler);

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    await initializePrisma();
    await initializeRedis();
    
    // Initialize search optimization
    const searchOptimization = new SearchOptimizationService();
    await searchOptimization.initializeSearchIndexes();
    
    // Initialize realtime search
    const realtimeSearch = new RealtimeSearchService(io);
    
    // Initialize autocomplete service
    const autocompleteService = new AutocompleteService();
    
    // Pre-warm caches
    Promise.all([
      searchOptimization.prewarmSearchCache(),
      autocompleteService.prewarmAutocompleteCache()
    ]).catch(err => 
      logger.error('Failed to pre-warm caches', err)
    );
    
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
    
    // Broadcast search trends every minute
    setInterval(() => {
      realtimeSearch.broadcastSearchTrends().catch(err =>
        logger.error('Failed to broadcast trends', err)
      );
    }, 60000);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };