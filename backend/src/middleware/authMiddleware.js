const { supabase, supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    // Get token from various sources
    let token = req.cookies['sb-access-token'] || 
                req.headers.authorization?.replace('Bearer ', '') || 
                req.headers['x-access-token'];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token not provided' 
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      // Try to refresh if token is expired
      const refreshToken = req.cookies['sb-refresh-token'];
      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ 
          refresh_token: refreshToken 
        });

        if (!refreshError && refreshData.session) {
          // Set new tokens
          res.cookie('sb-access-token', refreshData.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
          });

          res.cookie('sb-refresh-token', refreshData.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
          });

          // Retry with new token
          const { data: { user: newUser } } = await supabaseAdmin.auth.getUser(refreshData.session.access_token);
          req.user = newUser;
          return next();
        }
      }

      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during authentication' 
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies['sb-access-token'] || 
                req.headers.authorization?.replace('Bearer ', '') || 
                req.headers['x-access-token'];

    if (token) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user
    next();
  }
};

// Check if user has specific role
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Get user metadata from Supabase
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (!profile || !roles.includes(profile.role)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Insufficient permissions' 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };
};

// CSRF protection
const csrfProtection = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionCsrf = req.session?.csrfToken;

    if (!csrfToken || csrfToken !== sessionCsrf) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid CSRF token' 
      });
    }
  }
  next();
};

// Rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) return next();

    const userId = req.user.id;
    const now = Date.now();
    const userRequests = requests.get(userId) || [];
    
    // Filter out old requests
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ 
        success: false, 
        error: 'Too many requests. Please try again later.' 
      });
    }
    
    recentRequests.push(now);
    requests.set(userId, recentRequests);
    
    next();
  };
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  csrfProtection,
  userRateLimit
};