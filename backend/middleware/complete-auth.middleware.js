/**
 * 完全システム認証ミドルウェア
 * Worker3: プロダクションレベル完成目標
 * Created: 2025-07-02
 */

const jwt = require('jsonwebtoken');
const supabase = require('../services/supabase-client');
const rateLimit = require('express-rate-limit');

/**
 * JWT認証ミドルウェア（必須）
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'アクセストークンが必要です',
      code: 'NO_TOKEN'
    });
  }

  verifyAndSetUser(token, req, res, next, true);
}

/**
 * JWT認証ミドルウェア（オプション）
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  verifyAndSetUser(token, req, res, next, false);
}

/**
 * 管理者権限チェック
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: '認証が必要です',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  if (req.user.subscription_tier !== 'admin' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '管理者権限が必要です',
      code: 'INSUFFICIENT_PRIVILEGES'
    });
  }

  next();
}

/**
 * セッション検証ミドルウェア
 */
async function validateSession(req, res, next) {
  if (!req.user) {
    return next();
  }

  try {
    const sessionToken = extractSessionToken(req);
    
    if (sessionToken) {
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !session) {
        return res.status(401).json({
          success: false,
          error: 'セッションが無効です',
          code: 'INVALID_SESSION'
        });
      }

      // セッション情報をリクエストに追加
      req.session = session;

      // 最終アクティビティ時刻更新
      await supabase
        .from('user_sessions')
        .update({ 
          last_activity_at: new Date().toISOString(),
          ip_address: getClientIp(req),
          user_agent: req.get('User-Agent')
        })
        .eq('id', session.id);
    }

    next();
  } catch (error) {
    console.error('セッション検証エラー:', error);
    res.status(500).json({
      success: false,
      error: 'セッション検証に失敗しました',
      code: 'SESSION_VALIDATION_ERROR'
    });
  }
}

/**
 * API レート制限
 */
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // 認証済みユーザーはユーザーIDベース、未認証はIPベース
      return req.user?.id || getClientIp(req);
    }
  });
};

// 各種レート制限設定
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15分
  20, // 20回まで
  '認証リクエストが制限されています。15分後に再試行してください。'
);

const apiRateLimit = createRateLimit(
  60 * 1000, // 1分
  100, // 100回まで
  'APIリクエストが制限されています。1分後に再試行してください。'
);

const priceCheckRateLimit = createRateLimit(
  60 * 1000, // 1分
  10, // 10回まで
  '価格チェックリクエストが制限されています。1分後に再試行してください。'
);

/**
 * アクセス権限チェック
 */
function checkPermission(resource, action = 'read') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '認証が必要です',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    try {
      const hasPermission = await verifyPermission(req.user, resource, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `${resource}への${action}権限がありません`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      console.error('権限チェックエラー:', error);
      res.status(500).json({
        success: false,
        error: '権限チェックに失敗しました',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * セキュリティヘッダー設定
 */
function securityHeaders(req, res, next) {
  // CORS ヘッダー
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://lastminutestay.vercel.app',
    'https://hotelbookingsystem-seven.vercel.app'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // セキュリティヘッダー
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS（HTTPSの場合のみ）
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // CSP設定
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.rakuten.co.jp https://*.supabase.co",
    "frame-ancestors 'none'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  next();
}

/**
 * ログイン試行回数制限
 */
const loginAttemptLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 5回まで
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.body.email || getClientIp(req);
  },
  onLimitReached: async (req) => {
    const email = req.body.email;
    const ip = getClientIp(req);
    
    console.warn(`ログイン試行回数上限: ${email} from ${ip}`);
    
    // セキュリティログ記録
    await logSecurityEvent({
      event_type: 'login_attempt_limit_exceeded',
      user_email: email,
      ip_address: ip,
      user_agent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  },
  message: {
    success: false,
    error: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
    code: 'LOGIN_ATTEMPTS_EXCEEDED'
  }
});

// ========================================
// ヘルパー関数
// ========================================

/**
 * トークン抽出
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Cookieからも確認
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }

  return null;
}

/**
 * セッショントークン抽出
 */
function extractSessionToken(req) {
  return req.headers['x-session-token'] || req.cookies?.session_token;
}

/**
 * JWT検証とユーザー情報設定
 */
async function verifyAndSetUser(token, req, res, next, required = true) {
  try {
    // JWT検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // ユーザー情報取得
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        subscription_tier,
        notification_enabled,
        is_active,
        last_login_at
      `)
      .eq('id', decoded.sub || decoded.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      if (required) {
        return res.status(401).json({
          success: false,
          error: 'ユーザーが見つからないか無効です',
          code: 'INVALID_USER'
        });
      } else {
        req.user = null;
        return next();
      }
    }

    // ユーザー情報をリクエストに設定
    req.user = user;

    // ログイン時刻更新（1時間に1回まで）
    const lastLoginHour = user.last_login_at ? 
      new Date(user.last_login_at).getTime() : 0;
    const currentHour = new Date().getTime();
    
    if (currentHour - lastLoginHour > 60 * 60 * 1000) { // 1時間
      await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString(),
          login_count: (user.login_count || 0) + 1
        })
        .eq('id', user.id);
    }

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'トークンの有効期限が切れています',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: '無効なトークンです',
        code: 'INVALID_TOKEN'
      });
    }

    console.error('認証エラー:', error);
    
    if (required) {
      return res.status(500).json({
        success: false,
        error: '認証処理に失敗しました',
        code: 'AUTHENTICATION_ERROR'
      });
    } else {
      req.user = null;
      next();
    }
  }
}

/**
 * 権限検証
 */
async function verifyPermission(user, resource, action) {
  // 管理者は全権限
  if (user.subscription_tier === 'admin' || user.role === 'admin') {
    return true;
  }

  // プレミアムユーザーの特別権限
  if (user.subscription_tier === 'premium') {
    return true;
  }

  // 基本的な読み取り権限
  if (action === 'read') {
    return true;
  }

  // その他の権限は個別チェック
  const permissions = {
    'watchlist': ['create', 'read', 'update', 'delete'],
    'notifications': ['read', 'update'],
    'price_history': ['read'],
    'profile': ['read', 'update']
  };

  return permissions[resource]?.includes(action) || false;
}

/**
 * クライアントIP取得
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * セキュリティイベントログ
 */
async function logSecurityEvent(eventData) {
  try {
    // 将来的にはセキュリティログ専用テーブルに記録
    console.warn('セキュリティイベント:', eventData);
  } catch (error) {
    console.error('セキュリティログ記録エラー:', error);
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  validateSession,
  checkPermission,
  securityHeaders,
  loginAttemptLimit,
  authRateLimit,
  apiRateLimit,
  priceCheckRateLimit
};