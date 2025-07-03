// Enhanced Authentication Service
// Complete Supabase authentication with session management and security

const { supabase, supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'demo-jwt-secret-change-in-production';
    this.sessionTimeout = process.env.SESSION_TIMEOUT || '7d';
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    
    console.log('🔐 AuthService initialized with enhanced security features');
  }

  // User Registration with validation
  async register(userData) {
    try {
      const { email, password, name, phone } = userData;

      // Input validation
      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (!this.validatePassword(password)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, number and special character');
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('auth.users')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            email_verified: false,
            created_at: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        throw new Error(error.message);
      }

      // Create user profile in custom table
      if (data.user) {
        await this.createUserProfile(data.user.id, { name, email, phone });
      }

      return {
        success: true,
        user: data.user,
        message: 'Registration successful. Please check your email for verification.'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // User Login with rate limiting and security
  async login(email, password, userAgent, ipAddress) {
    try {
      // Check rate limiting
      const isRateLimited = await this.checkRateLimit(email, ipAddress);
      if (isRateLimited) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        await this.recordFailedLogin(email, ipAddress);
        throw new Error('Invalid email or password');
      }

      // Create session record
      const sessionData = await this.createSession(data.user.id, userAgent, ipAddress);

      // Update last login
      await this.updateLastLogin(data.user.id, ipAddress);

      // Clear failed login attempts
      await this.clearFailedAttempts(email);

      return {
        success: true,
        user: data.user,
        session: data.session,
        sessionId: sessionData.id,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Password Reset
  async requestPasswordReset(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log password reset request
      await this.logSecurityEvent('password_reset_requested', { email });

      return {
        success: true,
        message: 'Password reset email sent successfully'
      };

    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update Password
  async updatePassword(userId, newPassword) {
    try {
      if (!this.validatePassword(newPassword)) {
        throw new Error('Password does not meet security requirements');
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      // Invalidate all sessions except current
      await this.invalidateUserSessions(userId);

      // Log password change
      await this.logSecurityEvent('password_changed', { userId });

      return {
        success: true,
        message: 'Password updated successfully'
      };

    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Session Management
  async createSession(userId, userAgent, ipAddress) {
    try {
      const sessionToken = this.generateSecureToken();
      const refreshToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          refresh_token: refreshToken,
          expires_at: expiresAt.toISOString(),
          user_agent: userAgent,
          ip_address: ipAddress
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;

    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  }

  // Verify Session
  async verifySession(sessionToken) {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          *,
          users:user_id (
            id,
            email,
            name,
            email_verified
          )
        `)
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        sessionId: data.id,
        userId: data.user_id,
        user: data.users,
        expiresAt: data.expires_at
      };

    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }

  // Logout and invalidate session
  async logout(sessionToken) {
    try {
      // Remove session from database
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', sessionToken);

      if (error) {
        console.error('Session deletion error:', error);
      }

      // Sign out from Supabase
      await supabase.auth.signOut();

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Rate Limiting
  async checkRateLimit(email, ipAddress) {
    try {
      const { data } = await supabase
        .from('failed_login_attempts')
        .select('attempts, last_attempt')
        .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
        .gte('last_attempt', new Date(Date.now() - this.lockoutDuration).toISOString());

      if (!data || data.length === 0) {
        return false;
      }

      const totalAttempts = data.reduce((sum, record) => sum + record.attempts, 0);
      return totalAttempts >= this.maxLoginAttempts;

    } catch (error) {
      console.error('Rate limit check error:', error);
      return false;
    }
  }

  // Record failed login attempt
  async recordFailedLogin(email, ipAddress) {
    try {
      const { data, error } = await supabase
        .from('failed_login_attempts')
        .upsert({
          email,
          ip_address: ipAddress,
          attempts: 1,
          last_attempt: new Date().toISOString()
        }, {
          onConflict: 'email,ip_address',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Failed login recording error:', error);
      }

    } catch (error) {
      console.error('Failed login recording error:', error);
    }
  }

  // Clear failed login attempts
  async clearFailedAttempts(email) {
    try {
      await supabase
        .from('failed_login_attempts')
        .delete()
        .eq('email', email);

    } catch (error) {
      console.error('Clear failed attempts error:', error);
    }
  }

  // Create user profile
  async createUserProfile(userId, profileData) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          preferences: {},
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Profile creation error:', error);
      }

    } catch (error) {
      console.error('Profile creation error:', error);
    }
  }

  // Update last login
  async updateLastLogin(userId, ipAddress) {
    try {
      await supabase
        .from('user_profiles')
        .update({
          last_login: new Date().toISOString(),
          last_login_ip: ipAddress
        })
        .eq('user_id', userId);

    } catch (error) {
      console.error('Last login update error:', error);
    }
  }

  // Invalidate user sessions
  async invalidateUserSessions(userId, exceptSessionId = null) {
    try {
      let query = supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (exceptSessionId) {
        query = query.neq('id', exceptSessionId);
      }

      await query;

    } catch (error) {
      console.error('Session invalidation error:', error);
    }
  }

  // Security event logging
  async logSecurityEvent(eventType, eventData) {
    try {
      await supabase
        .from('security_logs')
        .insert({
          event_type: eventType,
          event_data: eventData,
          timestamp: new Date().toISOString(),
          ip_address: eventData.ipAddress || null
        });

    } catch (error) {
      console.error('Security logging error:', error);
    }
  }

  // Utility methods
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // JWT Token methods for stateless authentication
  generateJWT(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'user'
      },
      this.jwtSecret,
      {
        expiresIn: this.sessionTimeout,
        issuer: 'hotel-booking-system',
        audience: 'hotel-booking-users'
      }
    );
  }

  verifyJWT(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  // Cleanup expired sessions (cron job)
  async cleanupExpiredSessions() {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Session cleanup error:', error);
      } else {
        console.log('✅ Expired sessions cleaned up');
      }

    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  // Get user by session
  async getUserBySession(sessionToken) {
    try {
      const session = await this.verifySession(sessionToken);
      if (!session) {
        return null;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          users:user_id (
            email,
            email_verified,
            created_at
          )
        `)
        .eq('user_id', session.userId)
        .single();

      if (error) {
        console.error('User fetch error:', error);
        return null;
      }

      return {
        ...data,
        auth: session.user
      };

    } catch (error) {
      console.error('Get user by session error:', error);
      return null;
    }
  }

  // Get metrics for monitoring
  getMetrics() {
    return {
      service: 'AuthService',
      maxLoginAttempts: this.maxLoginAttempts,
      lockoutDuration: this.lockoutDuration,
      sessionTimeout: this.sessionTimeout,
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = new AuthService();