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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);

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

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}