import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Core components
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { CacheService } from './services/cache.service';

// Routes
import authRoutes from './routes/auth.routes';
import hotelRoutes from './routes/hotel.routes';
import affiliateRoutes from './routes/affiliate.routes';
import healthRoutes from './routes/health.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
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

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/affiliate', affiliateRoutes);

// Health check endpoints
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'LastMinuteStay Backend API',
    version: '1.0.0'
  });
});

app.get('/health', (_req, res) => {
  res.redirect('/api/health');
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    // Initialize cache service
    const cacheService = new CacheService();
    
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info('Environment:', process.env.NODE_ENV || 'development');
    });
    
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
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

export { app, io };