// Database configuration and initialization
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lastminutestay',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database with schema
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('Database initialized successfully');
    
    // Create initial test data
    await createTestData();
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Create test data for development
async function createTestData() {
  try {
    // Check if data already exists
    const { rows } = await pool.query('SELECT COUNT(*) FROM hotels');
    if (parseInt(rows[0].count) > 0) {
      console.log('Test data already exists');
      return;
    }
    
    console.log('Creating test data...');
    
    // Insert test hotels
    const hotels = [
      {
        name: 'Tokyo Station Hotel',
        lat: 35.6812, lng: 139.7671,
        address: '1-9-1 Marunouchi, Chiyoda-ku',
        city: 'Tokyo',
        rating: 4.5
      },
      {
        name: 'Shinjuku Grand Hotel',
        lat: 35.6896, lng: 139.6995,
        address: '2-14-5 Kabukicho, Shinjuku-ku',
        city: 'Tokyo',
        rating: 4.2
      },
      {
        name: 'Shibuya Excel Hotel',
        lat: 35.6595, lng: 139.7004,
        address: '1-12-2 Dogenzaka, Shibuya-ku',
        city: 'Tokyo',
        rating: 4.3
      },
      {
        name: 'Asakusa View Hotel',
        lat: 35.7147, lng: 139.7937,
        address: '3-17-1 Nishi-Asakusa, Taito-ku',
        city: 'Tokyo',
        rating: 4.0
      },
      {
        name: 'Roppongi Plaza Hotel',
        lat: 35.6626, lng: 139.7296,
        address: '3-15-17 Roppongi, Minato-ku',
        city: 'Tokyo',
        rating: 4.4
      }
    ];
    
    for (const hotel of hotels) {
      const hotelResult = await pool.query(`
        INSERT INTO hotels (name, location, address, city, rating, amenities)
        VALUES ($1, ST_MakePoint($3, $2)::geography, $4, $5, $6, $7)
        RETURNING id
      `, [
        hotel.name,
        hotel.lat,
        hotel.lng,
        hotel.address,
        hotel.city,
        hotel.rating,
        JSON.stringify({
          wifi: true,
          parking: Math.random() > 0.5,
          breakfast: Math.random() > 0.3,
          gym: Math.random() > 0.6,
          pool: Math.random() > 0.7
        })
      ]);
      
      const hotelId = hotelResult.rows[0].id;
      
      // Create rooms for each hotel
      const roomTypes = [
        { type: 'Single', capacity: 1, basePrice: 8000 },
        { type: 'Double', capacity: 2, basePrice: 12000 },
        { type: 'Twin', capacity: 2, basePrice: 13000 },
        { type: 'Suite', capacity: 4, basePrice: 25000 }
      ];
      
      for (const roomType of roomTypes) {
        const roomResult = await pool.query(`
          INSERT INTO rooms (hotel_id, room_type, capacity, base_price)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [hotelId, roomType.type, roomType.capacity, roomType.basePrice]);
        
        const roomId = roomResult.rows[0].id;
        
        // Create availability for next 30 days
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          
          // Random availability and pricing
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const priceMultiplier = isWeekend ? 1.3 : 1.0;
          const availableCount = Math.floor(Math.random() * 5) + 1;
          
          await pool.query(`
            INSERT INTO availability (room_id, date, available_count, price, last_minute_discount)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            roomId,
            date.toISOString().split('T')[0],
            availableCount,
            roomType.basePrice * priceMultiplier,
            0 // Will be updated by price optimizer
          ]);
        }
      }
    }
    
    console.log('Test data created successfully');
    
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  }
}

// Connection test
async function testConnection() {
  try {
    const { rows } = await pool.query('SELECT NOW()');
    console.log('Database connected:', rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

module.exports = {
  pool,
  initializeDatabase,
  testConnection
};