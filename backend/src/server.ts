import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数の読み込み
dotenv.config();

// ルートのインポート
import hotelRoutes from './routes/hotel.routes';
import userRoutes from './routes/userRoutes';
import healthRoutes from './routes/health.routes';

// ミドルウェアのインポート
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';

// ユーティリティのインポート
import { logger } from './utils/logger';
import { CacheService } from './services/cache.service';

const app = express();
const PORT = process.env.PORT || 8000;

// グローバルミドルウェア
app.use(helmet({
  contentSecurityPolicy: false, // API用に調整
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS設定
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://hotelbooking-delta.vercel.app',
      'https://lastminutestay.com'
    ];
    
    // 開発環境ではすべてのオリジンを許可
    if (process.env.NODE_ENV === 'development' || !origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// リクエストロギング
app.use(requestLogger);

// グローバルレート制限
app.use('/api/', rateLimiter());

// APIルート
app.use('/api/health', healthRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/users', userRoutes);

// 静的ファイル（本番環境用）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  
  // SPAのためのフォールバック
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
});

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`API Base URL: http://localhost:${PORT}/api`);
});

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // キャッシュサービスのクリーンアップ
  const cache = new CacheService();
  await cache.disconnect();
  
  process.exit(0);
});

// 未処理のPromiseリジェクション
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 未処理の例外
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;