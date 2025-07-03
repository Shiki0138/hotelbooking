const { supabase, supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// User registration
const register = async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber } = req.body;

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phoneNumber
        }
      }
    });

    if (authError) {
      return res.status(400).json({ 
        success: false, 
        error: authError.message 
      });
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        phone_number: phoneNumber
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail registration if profile creation fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
        phoneNumber
      },
      session: authData.session
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during registration' 
    });
  }
};

// User login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Set secure cookie
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: profile?.full_name,
        phoneNumber: profile?.phone_number
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during login' 
    });
  }
};

// User logout
const logout = async (req, res) => {
  try {
    const token = req.cookies['sb-access-token'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      await supabase.auth.signOut();
    }

    res.clearCookie('sb-access-token');
    res.clearCookie('sb-refresh-token');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during logout' 
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'User profile not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        phoneNumber: profile.phone_number,
        createdAt: profile.created_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phoneNumber } = req.body;

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phoneNumber: data.phone_number
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Password reset request
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Update password
const updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies['sb-refresh-token'] || req.body.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token not provided' 
      });
    }

    const { data, error } = await supabase.auth.refreshSession({ 
      refresh_token: refreshToken 
    });

    if (error) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid refresh token' 
      });
    }

    // Set new tokens in cookies
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  requestPasswordReset,
  updatePassword,
  refreshToken
};