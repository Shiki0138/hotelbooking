// Production Database Configuration with Connection Pooling
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const envManager = require('../../production-config/env-manager');

// Production-optimized connection pool
class ProductionDatabasePool {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Get database config from environment manager
      const dbConfig = envManager.getDatabaseConfig();
      
      // Production pool configuration
      this.pool = new Pool({
        ...dbConfig,
        
        // Connection pool settings
        max: dbConfig.max || 20,                    // Maximum pool size
        min: dbConfig.min || 5,                     // Minimum pool size
        idleTimeoutMillis: 30000,                   // Close idle clients after 30s
        connectionTimeoutMillis: 2000,              // Return error after 2s if cannot connect
        maxUses: 7500,                              // Close connection after 7500 uses
        
        // Connection settings
        statement_timeout: 30000,                    // 30s statement timeout
        query_timeout: 30000,                       // 30s query timeout
        
        // SSL configuration for production
        ssl: {
          rejectUnauthorized: true,
          ca: process.env.DB_SSL_CA || fs.readFileSync('/etc/ssl/certs/ca-certificates.crt').toString()
        },
        
        // Application name for monitoring
        application_name: 'hotelbooking-production',
        
        // Enable keep-alive
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      });

      // Connection event handlers
      this.pool.on('connect', (client) => {
        console.log('New database connection established');
        
        // Set session parameters for each new connection
        client.query('SET statement_timeout = 30000');
        client.query('SET lock_timeout = 10000');
        client.query('SET idle_in_transaction_session_timeout = 60000');
        
        // Enable query statistics
        client.query('SET track_activities = ON');
        client.query('SET track_counts = ON');
      });

      this.pool.on('error', (err, client) => {
        console.error('Unexpected database error on idle client', err);
        this.handleConnectionError(err);
      });

      this.pool.on('remove', (client) => {
        console.log('Database connection removed from pool');
      });

      // Test connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('✅ Production database pool initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize database pool:', error);
      throw error;
    }
  }

  async testConnection() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      console.log('Database connection test:', result.rows[0]);
      return true;
    } finally {
      client.release();
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, text.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`Query error after ${duration}ms:`, error.message);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async handleConnectionError(error) {
    console.error('Database connection error:', error);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
      
      setTimeout(async () => {
        try {
          await this.testConnection();
          this.reconnectAttempts = 0;
          console.log('✅ Successfully reconnected to database');
        } catch (err) {
          await this.handleConnectionError(err);
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached. Manual intervention required.');
      // Send alert to monitoring system
      process.emit('critical-error', {
        type: 'database-connection-failed',
        error: error.message
      });
    }
  }

  async getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  async healthCheck() {
    try {
      const client = await this.pool.connect();
      try {
        // Check basic connectivity
        await client.query('SELECT 1');
        
        // Check pool stats
        const stats = await this.getPoolStats();
        
        // Check for connection saturation
        const utilizationRate = (stats.total - stats.idle) / stats.total;
        
        return {
          status: 'healthy',
          stats,
          utilizationRate,
          warnings: utilizationRate > 0.8 ? ['High connection pool utilization'] : []
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async shutdown() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database pool closed');
    }
  }
}

// Create singleton instance
const productionPool = new ProductionDatabasePool();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received: closing database pool');
  await productionPool.shutdown();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received: closing database pool');
  await productionPool.shutdown();
});

// Export utility functions
module.exports = {
  pool: productionPool,
  
  // Initialize pool
  async initialize() {
    await productionPool.initialize();
  },
  
  // Direct query
  async query(text, params) {
    return await productionPool.query(text, params);
  },
  
  // Get client for manual transaction control
  async getClient() {
    return await productionPool.getClient();
  },
  
  // Transaction helper
  async transaction(callback) {
    return await productionPool.transaction(callback);
  },
  
  // Health check
  async healthCheck() {
    return await productionPool.healthCheck();
  },
  
  // Pool statistics
  async getPoolStats() {
    return await productionPool.getPoolStats();
  }
};