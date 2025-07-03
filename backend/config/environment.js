// Environment configuration for LastMinuteStay
// Worker3: Emergency 24H Release - Deployment Error Prevention Compliant

const requiredEnvVars = [
  // Supabase (IPv6 compliant with Supavisor URLs)
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  
  // Database (IPv6 migration compliant)
  'POSTGRES_URL', // Supavisor URL
  'POSTGRES_PRISMA_URL', // Supavisor URL
  'POSTGRES_URL_NON_POOLING', // Supavisor URL
  
  // Stripe Payment
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  
  // Email Service
  'RESEND_API_KEY',
  
  // Monitoring
  'SENTRY_DSN',
];

const optionalEnvVars = [
  'NODE_ENV',
  'PORT',
  'VERCEL_GIT_COMMIT_SHA',
];

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check Supavisor URL compliance (IPv6 migration)
  const dbUrls = [
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL', 
    'POSTGRES_URL_NON_POOLING'
  ];
  
  dbUrls.forEach(varName => {
    const url = process.env[varName];
    if (url && !url.includes('aws-0-')) {
      warnings.push(`${varName} should use Supavisor URL (contains 'aws-0-') for IPv6 compliance`);
    }
  });

  // Validate Stripe keys
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    warnings.push('STRIPE_SECRET_KEY should start with sk_');
  }

  if (process.env.STRIPE_PUBLISHABLE_KEY && !process.env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    warnings.push('STRIPE_PUBLISHABLE_KEY should start with pk_');
  }

  // Validate URLs
  try {
    if (process.env.SUPABASE_URL) {
      new URL(process.env.SUPABASE_URL);
    }
  } catch (error) {
    warnings.push('SUPABASE_URL is not a valid URL');
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
  }

  console.log('✅ Environment validation completed');
  return { missing, warnings };
}

/**
 * Get environment configuration
 */
function getConfig() {
  return {
    // App
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT) || 3001,
    
    // Supabase (IPv6 compliant)
    supabase: {
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: process.env.SUPABASE_ANON_KEY,
    },
    
    // Database (IPv6 migration compliant)
    database: {
      url: process.env.POSTGRES_URL,
      prismaUrl: process.env.POSTGRES_PRISMA_URL,
      nonPoolingUrl: process.env.POSTGRES_URL_NON_POOLING,
    },
    
    // Stripe
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    
    // Email
    email: {
      resendApiKey: process.env.RESEND_API_KEY,
      fromAddress: 'noreply@lastminutestay.jp',
    },
    
    // Monitoring
    monitoring: {
      sentryDsn: process.env.SENTRY_DSN,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
    },
    
    // CORS (deployment compliant)
    cors: {
      origins: [
        'http://localhost:3000',
        'https://*.vercel.app',
        'https://lastminutestay.jp',
        'https://www.lastminutestay.jp',
      ],
      credentials: true,
    },
  };
}

/**
 * Print configuration summary (without sensitive data)
 */
function printConfigSummary() {
  const config = getConfig();
  
  console.log('\n📋 Configuration Summary:');
  console.log(`  Environment: ${config.NODE_ENV}`);
  console.log(`  Port: ${config.PORT}`);
  console.log(`  Supabase URL: ${config.supabase.url ? '✓ Set' : '❌ Missing'}`);
  console.log(`  Database URL: ${config.database.url ? '✓ Set (IPv6 compliant)' : '❌ Missing'}`);
  console.log(`  Stripe: ${config.stripe.secretKey ? '✓ Configured' : '❌ Missing'}`);
  console.log(`  Email: ${config.email.resendApiKey ? '✓ Configured' : '❌ Missing'}`);
  console.log(`  Monitoring: ${config.monitoring.sentryDsn ? '✓ Enabled' : '⚠️  Disabled'}`);
  console.log(`  CORS Origins: ${config.cors.origins.length} configured\n`);
}

module.exports = {
  validateEnvironment,
  getConfig,
  printConfigSummary,
  requiredEnvVars,
  optionalEnvVars,
};