// Health check endpoint for Vercel Functions
export default function handler(req, res) {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    service: 'hotel-booking-api',
    version: '1.0.0'
  };

  try {
    res.status(200).json(health);
  } catch (error) {
    health.message = error.message;
    res.status(503).json(health);
  }
}