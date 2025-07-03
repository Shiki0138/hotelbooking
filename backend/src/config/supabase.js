const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Enhanced environment variable handling with fallbacks
const supabaseUrl = process.env.SUPABASE_URL || 'https://demo-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'demo-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key';

// Development mode fallback warnings
const isDevelopment = process.env.NODE_ENV !== 'production';
if (isDevelopment) {
  const demoValues = {
    'SUPABASE_URL': 'https://demo-project.supabase.co',
    'SUPABASE_ANON_KEY': 'demo-anon-key',
    'SUPABASE_SERVICE_ROLE_KEY': 'demo-service-key'
  };
  
  Object.entries(demoValues).forEach(([key, demoValue]) => {
    if (!process.env[key] || process.env[key] === demoValue) {
      console.warn(`⚠️  Using demo ${key}. Set real values for production.`);
    }
  });
} else {
  // Production mode - strict validation
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  });
}

// Database configuration for IPv6 support (Vercel deployment)
const dbConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-my-custom-header': 'lastminutestay' }
  }
};

// Public client for general operations
const supabase = createClient(supabaseUrl, supabaseAnonKey, dbConfig);

// Admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  ...dbConfig,
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test database connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection
};