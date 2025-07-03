// Enhanced Authentication Controller
// Complete API endpoints for authentication with security features

const authService = require('../services/authService');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

class EnhancedAuthController {
  constructor() {
    this.loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });

    this.registerLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 registrations per hour per IP
      message: {
        success: false,
        error: 'Too many registration attempts. Please try again in 1 hour.'
      }
    });

    console.log('🔐 EnhancedAuthController initialized');
  }

  // User Registration
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, name, phone } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Rate limiting check
      if (req.rateLimit && req.rateLimit.remaining <= 0) {
        return res.status(429).json({
          success: false,
          error: 'Registration rate limit exceeded'
        });
      }

      const result = await authService.register({
        email,
        password,
        name,
        phone
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Log successful registration
      await authService.logSecurityEvent('user_registered', {
        email,
        ipAddress,
        userAgent
      });

      res.status(201).json({
        success: true,
        message: result.message,
        user: {
          id: result.user.id,
          email: result.user.email,
          emailVerified: result.user.email_confirmed_at !== null
        }
      });

    } catch (error) {
      console.error('Registration controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }
  }

  // User Login
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, rememberMe } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.login(email, password, userAgent, ipAddress);

      if (!result.success) {
        return res.status(401).json(result);
      }

      // Set secure cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 days or 1 day
      };

      res.cookie('sessionToken', result.sessionId, cookieOptions);
      res.cookie('accessToken', result.accessToken, cookieOptions);

      // Log successful login
      await authService.logSecurityEvent('user_login', {
        userId: result.user.id,
        email,
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.user_metadata?.name,
          emailVerified: result.user.email_confirmed_at !== null,
          lastLogin: new Date().toISOString()
        },
        session: {
          accessToken: result.accessToken,
          expiresAt: result.session.expires_at
        }
      });

    } catch (error) {
      console.error('Login controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.'
      });
    }
  }

  // Password Reset Request
  async requestPasswordReset(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });

      // Log password reset request
      await authService.logSecurityEvent('password_reset_requested', {
        email,
        ipAddress,
        success: result.success
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: 'Password reset request failed. Please try again.'
      });
    }
  }

  // Update Password
  async updatePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { newPassword } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.updatePassword(userId, newPassword);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Log password change
      await authService.logSecurityEvent('password_changed', {
        userId,
        ipAddress
      });

      res.json({
        success: true,
        message: 'Password updated successfully. Please log in again.'
      });

    } catch (error) {
      console.error('Password update error:', error);
      res.status(500).json({
        success: false,
        error: 'Password update failed. Please try again.'
      });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      const sessionToken = req.cookies.sessionToken || req.headers.authorization?.replace('Bearer ', '');
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (sessionToken) {
        await authService.logout(sessionToken);
      }

      // Clear cookies
      res.clearCookie('sessionToken');
      res.clearCookie('accessToken');

      // Log logout
      if (userId) {
        await authService.logSecurityEvent('user_logout', {
          userId,
          ipAddress
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  // Get Current User
  async getCurrentUser(req, res) {
    try {
      const sessionToken = req.cookies.sessionToken || req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken) {
        return res.status(401).json({
          success: false,
          error: 'No session token provided'
        });
      }

      const user = await authService.getUserBySession(sessionToken);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired session'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.user_id,
          email: user.users.email,
          name: user.name,
          phone: user.phone,
          emailVerified: user.users.email_verified,
          preferences: user.preferences,
          lastLogin: user.last_login,
          createdAt: user.created_at
        }
      });

    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user information'
      });
    }
  }

  // Update User Profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, phone, preferences } = req.body;
      const userId = req.user.id;

      const { error } = await require('../config/supabase').supabase
        .from('user_profiles')
        .update({
          name,
          phone,
          preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        error: 'Profile update failed'
      });
    }
  }

  // Verify Email
  async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required'
        });
      }

      const { data, error } = await require('../config/supabase').supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired verification token'
        });
      }

      res.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Email verification failed'
      });
    }
  }

  // Get User Sessions
  async getUserSessions(req, res) {
    try {
      const userId = req.user.id;

      const { data, error } = await require('../config/supabase').supabase
        .from('user_sessions')
        .select('id, user_agent, ip_address, created_at, expires_at')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        sessions: data.map(session => ({
          id: session.id,
          deviceInfo: this.parseUserAgent(session.user_agent),
          ipAddress: session.ip_address,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          isCurrent: req.sessionId === session.id
        }))
      });

    } catch (error) {
      console.error('Get user sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user sessions'
      });
    }
  }

  // Revoke Session
  async revokeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const { error } = await require('../config/supabase').supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });

    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke session'
      });
    }
  }

  // Get Authentication Metrics
  async getMetrics(req, res) {
    try {
      const metrics = authService.getMetrics();

      // Add additional metrics
      const { data: activeUsers } = await require('../config/supabase').supabase
        .from('user_sessions')
        .select('user_id', { count: 'exact', head: true })
        .gt('expires_at', new Date().toISOString());

      const { data: totalUsers } = await require('../config/supabase').supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true });

      res.json({
        success: true,
        metrics: {
          ...metrics,
          activeUsers: activeUsers?.length || 0,
          totalUsers: totalUsers?.length || 0,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get auth metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get authentication metrics'
      });
    }
  }

  // Utility method to parse user agent
  parseUserAgent(userAgent) {
    if (!userAgent) return 'Unknown Device';

    // Simple user agent parsing
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';

    return 'Desktop Browser';
  }

  // Rate limiters as middleware
  getLoginLimiter() {
    return this.loginLimiter;
  }

  getRegisterLimiter() {
    return this.registerLimiter;
  }
}

module.exports = new EnhancedAuthController();