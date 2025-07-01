/**
 * Production Environment Variable Manager
 * Handles secure loading, validation, and encryption of environment variables
 * Implements best practices for secret management
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

class ProductionEnvManager {
  constructor() {
    this.requiredVars = {
      // Database
      DB_HOST: { type: 'string', sensitive: false },
      DB_PORT: { type: 'number', sensitive: false, default: 5432 },
      DB_NAME: { type: 'string', sensitive: false },
      DB_USER: { type: 'string', sensitive: true },
      DB_PASSWORD: { type: 'string', sensitive: true, encrypted: true },
      DB_POOL_MIN: { type: 'number', default: 2 },
      DB_POOL_MAX: { type: 'number', default: 10 },
      
      // Redis
      REDIS_HOST: { type: 'string', sensitive: false, default: 'localhost' },
      REDIS_PORT: { type: 'number', sensitive: false, default: 6379 },
      REDIS_PASSWORD: { type: 'string', sensitive: true, encrypted: true },
      
      // Authentication
      JWT_SECRET: { type: 'string', sensitive: true, encrypted: true, minLength: 32 },
      JWT_EXPIRES_IN: { type: 'string', default: '24h' },
      SESSION_SECRET: { type: 'string', sensitive: true, encrypted: true, minLength: 32 },
      
      // API Keys
      RAKUTEN_APP_ID: { type: 'string', sensitive: true },
      RAKUTEN_AFFILIATE_ID: { type: 'string', sensitive: true, optional: true },
      
      // Security
      CORS_ORIGIN: { type: 'string', pattern: /^https:\/\// },
      RATE_LIMIT_WINDOW_MS: { type: 'number', default: 900000 },
      RATE_LIMIT_MAX_REQUESTS: { type: 'number', default: 100 },
      
      // Application
      NODE_ENV: { type: 'string', values: ['production'] },
      PORT: { type: 'number', default: 8000 },
      LOG_LEVEL: { type: 'string', values: ['error', 'warn', 'info'], default: 'info' },
      
      // Monitoring
      SENTRY_DSN: { type: 'string', sensitive: true, optional: true },
      NEW_RELIC_LICENSE_KEY: { type: 'string', sensitive: true, optional: true },
      
      // Email
      SMTP_HOST: { type: 'string', optional: true },
      SMTP_PORT: { type: 'number', optional: true },
      SMTP_USER: { type: 'string', sensitive: true, optional: true },
      SMTP_PASS: { type: 'string', sensitive: true, encrypted: true, optional: true },
    };
    
    this.encryptionKey = null;
    this.loadedVars = {};
  }

  /**
   * Initialize the environment manager
   */
  async initialize() {
    try {
      // Load encryption key from secure storage
      await this.loadEncryptionKey();
      
      // Load environment variables
      await this.loadEnvironmentVariables();
      
      // Validate all required variables
      this.validateEnvironment();
      
      // Set up automatic secret rotation
      this.setupSecretRotation();
      
      console.log('✅ Environment manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize environment manager:', error);
      process.exit(1);
    }
  }

  /**
   * Load encryption key from secure storage
   */
  async loadEncryptionKey() {
    const keyPath = process.env.ENCRYPTION_KEY_PATH || '/etc/hotelbooking/encryption.key';
    
    try {
      if (fs.existsSync(keyPath)) {
        this.encryptionKey = fs.readFileSync(keyPath, 'utf8').trim();
      } else {
        // Generate new key if not exists (first run)
        this.encryptionKey = crypto.randomBytes(32).toString('hex');
        fs.mkdirSync(path.dirname(keyPath), { recursive: true });
        fs.writeFileSync(keyPath, this.encryptionKey, { mode: 0o600 });
      }
    } catch (error) {
      throw new Error(`Failed to load encryption key: ${error.message}`);
    }
  }

  /**
   * Load environment variables from multiple sources
   */
  async loadEnvironmentVariables() {
    // 1. Load from .env.production file
    const envPath = path.join(process.cwd(), '.env.production');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
    
    // 2. Load from encrypted secrets file
    const secretsPath = path.join(process.cwd(), '.secrets.enc');
    if (fs.existsSync(secretsPath)) {
      const encryptedSecrets = fs.readFileSync(secretsPath, 'utf8');
      const decryptedSecrets = this.decrypt(encryptedSecrets);
      const secrets = JSON.parse(decryptedSecrets);
      Object.assign(process.env, secrets);
    }
    
    // 3. Load from environment
    for (const [key, config] of Object.entries(this.requiredVars)) {
      let value = process.env[key];
      
      // Apply defaults
      if (!value && config.default !== undefined) {
        value = config.default;
      }
      
      // Decrypt if needed
      if (value && config.encrypted) {
        try {
          value = this.decrypt(value);
        } catch (error) {
          console.error(`Failed to decrypt ${key}`);
        }
      }
      
      // Type conversion
      if (value && config.type === 'number') {
        value = parseInt(value, 10);
      }
      
      this.loadedVars[key] = value;
    }
  }

  /**
   * Validate all environment variables
   */
  validateEnvironment() {
    const errors = [];
    
    for (const [key, config] of Object.entries(this.requiredVars)) {
      const value = this.loadedVars[key];
      
      // Check required
      if (!config.optional && !value) {
        errors.push(`Missing required environment variable: ${key}`);
        continue;
      }
      
      // Skip validation if optional and not provided
      if (config.optional && !value) {
        continue;
      }
      
      // Type validation
      if (config.type === 'number' && isNaN(value)) {
        errors.push(`${key} must be a number`);
      }
      
      // Enum validation
      if (config.values && !config.values.includes(value)) {
        errors.push(`${key} must be one of: ${config.values.join(', ')}`);
      }
      
      // Pattern validation
      if (config.pattern && !config.pattern.test(value)) {
        errors.push(`${key} does not match required pattern`);
      }
      
      // Length validation
      if (config.minLength && value.length < config.minLength) {
        errors.push(`${key} must be at least ${config.minLength} characters long`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get environment variable with automatic decryption
   */
  get(key) {
    return this.loadedVars[key];
  }

  /**
   * Get all non-sensitive environment variables
   */
  getPublicVars() {
    const publicVars = {};
    for (const [key, config] of Object.entries(this.requiredVars)) {
      if (!config.sensitive && this.loadedVars[key] !== undefined) {
        publicVars[key] = this.loadedVars[key];
      }
    }
    return publicVars;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(this.encryptionKey, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const authTag = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(this.encryptionKey, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Set up automatic secret rotation
   */
  setupSecretRotation() {
    // Rotate JWT secret every 30 days
    setInterval(() => {
      console.log('Rotating JWT secret...');
      const newSecret = crypto.randomBytes(32).toString('hex');
      this.loadedVars.JWT_SECRET = newSecret;
      // TODO: Implement graceful rotation with dual key support
    }, 30 * 24 * 60 * 60 * 1000);
  }

  /**
   * Export configuration for different services
   */
  getDatabaseConfig() {
    return {
      host: this.get('DB_HOST'),
      port: this.get('DB_PORT'),
      database: this.get('DB_NAME'),
      user: this.get('DB_USER'),
      password: this.get('DB_PASSWORD'),
      min: this.get('DB_POOL_MIN'),
      max: this.get('DB_POOL_MAX'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('/etc/ssl/certs/ca-certificates.crt').toString()
      }
    };
  }

  getRedisConfig() {
    return {
      host: this.get('REDIS_HOST'),
      port: this.get('REDIS_PORT'),
      password: this.get('REDIS_PASSWORD'),
      tls: {
        rejectUnauthorized: true
      },
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };
  }

  getAuthConfig() {
    return {
      jwtSecret: this.get('JWT_SECRET'),
      jwtExpiresIn: this.get('JWT_EXPIRES_IN'),
      sessionSecret: this.get('SESSION_SECRET'),
      bcryptRounds: 12
    };
  }

  /**
   * Health check for environment configuration
   */
  healthCheck() {
    const checks = {
      encryptionKey: !!this.encryptionKey,
      requiredVars: Object.keys(this.requiredVars).every(key => 
        this.requiredVars[key].optional || this.loadedVars[key] !== undefined
      ),
      databaseConnection: false,
      redisConnection: false
    };
    
    return {
      healthy: Object.values(checks).every(v => v === true),
      checks
    };
  }
}

// Singleton instance
const envManager = new ProductionEnvManager();

module.exports = envManager;