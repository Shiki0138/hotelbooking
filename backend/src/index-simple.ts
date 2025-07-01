import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'connected',
    message: 'LastMinuteStay Backend is running!'
  });
});

// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    services: {
      database: 'connected',
      cache: 'available',
      api: 'ready'
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic hotel search endpoint (mock data)
app.get('/api/hotels', (req, res) => {
  const mockHotels = [
    {
      id: 1,
      name: '東京ステーションホテル',
      location: '東京駅',
      price: 25000,
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    },
    {
      id: 2,
      name: '新宿グランドホテル',
      location: '新宿',
      price: 18000,
      rating: 4.2,
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80'
    }
  ];

  res.json({
    success: true,
    data: mockHotels,
    total: mockHotels.length
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LastMinuteStay Backend Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 API test: http://localhost:${PORT}/api/test`);
  console.log(`🏨 Hotels endpoint: http://localhost:${PORT}/api/hotels`);
  console.log(`🌟 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
});

export default app;