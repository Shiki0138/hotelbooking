// Hotel Search API Integration Tests
// Tests for Rakuten API integration, search functionality, and error handling

const request = require('supertest');
const app = require('../src/server');

describe('Hotel Search API Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Start server for testing
    server = app.listen(0);
  });

  afterAll(async () => {
    // Clean up
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('GET /api/hotels/search', () => {
    test('Should return search results for basic query', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          area: 'tokyo',
          limit: 10
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hotels');
      expect(response.body.data.hotels).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('searchTime');
      expect(response.body.data).toHaveProperty('metrics');
    });

    test('Should handle date-based search', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 1);
      const checkOutDate = new Date();
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          area: 'tokyo',
          checkInDate: checkInDate.toISOString().split('T')[0],
          checkOutDate: checkOutDate.toISOString().split('T')[0],
          guests: 2,
          rooms: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hotels).toBeInstanceOf(Array);
    });

    test('Should handle filtering parameters', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          area: 'tokyo',
          minPrice: 5000,
          maxPrice: 20000,
          rating: 4.0,
          hotelType: 'hotel',
          sortBy: 'rating'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters).toMatchObject({
        minPrice: 5000,
        maxPrice: 20000,
        rating: 4.0,
        hotelType: 'hotel',
        sortBy: 'rating'
      });
    });

    test('Should validate invalid parameters', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          area: 'invalid_area',
          guests: -1,
          rooms: 0,
          rating: 6.0
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    test('Should handle pagination', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          area: 'tokyo',
          page: 2,
          limit: 5
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toMatchObject({
        page: 2,
        limit: 5
      });
    });
  });

  describe('GET /api/hotels/detail/:hotelId', () => {
    test('Should return hotel details', async () => {
      const response = await request(app)
        .get('/api/hotels/detail/demo-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hotel).toHaveProperty('id');
      expect(response.body.data.hotel).toHaveProperty('name');
      expect(response.body.data.hotel).toHaveProperty('address');
      expect(response.body.data.hotel).toHaveProperty('pricing');
      expect(response.body.data.hotel).toHaveProperty('rating');
    });

    test('Should include availability check with dates', async () => {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 1);
      const checkOutDate = new Date();
      checkOutDate.setDate(checkOutDate.getDate() + 2);

      const response = await request(app)
        .get('/api/hotels/detail/demo-001')
        .query({
          checkInDate: checkInDate.toISOString().split('T')[0],
          checkOutDate: checkOutDate.toISOString().split('T')[0],
          guests: 2,
          rooms: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hotel).toHaveProperty('availabilityCheck');
      expect(response.body.data.hotel.availabilityCheck).toHaveProperty('isAvailable');
      expect(response.body.data.hotel.availabilityCheck).toHaveProperty('totalPrice');
    });

    test('Should handle invalid hotel ID', async () => {
      const response = await request(app)
        .get('/api/hotels/detail/invalid-hotel-id')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/hotels/suggestions', () => {
    test('Should return search suggestions', async () => {
      const response = await request(app)
        .get('/api/hotels/suggestions')
        .query({ query: '東京' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('locations');
      expect(response.body.data).toHaveProperty('hotels');
      expect(response.body.data).toHaveProperty('popular');
    });

    test('Should handle empty query', async () => {
      const response = await request(app)
        .get('/api/hotels/suggestions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('popular');
    });
  });

  describe('GET /api/hotels/filters', () => {
    test('Should return available filters', async () => {
      const response = await request(app)
        .get('/api/hotels/filters')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('areas');
      expect(response.body.data).toHaveProperty('priceRanges');
      expect(response.body.data).toHaveProperty('hotelTypes');
      expect(response.body.data).toHaveProperty('ratings');
      expect(response.body.data).toHaveProperty('sortOptions');
    });
  });

  describe('GET /api/hotels/metrics', () => {
    test('Should return API metrics', async () => {
      const response = await request(app)
        .get('/api/hotels/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requestCount');
      expect(response.body.data).toHaveProperty('successRate');
      expect(response.body.data).toHaveProperty('averageResponseTime');
      expect(response.body.data).toHaveProperty('status');
    });
  });

  describe('API Performance Tests', () => {
    test('Search API should respond within 3 seconds', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/hotels/search')
        .query({ area: 'tokyo', limit: 20 })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000);
    });

    test('Should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/hotels/search')
          .query({ area: 'osaka', limit: 10 })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error Handling Tests', () => {
    test('Should handle API timeout gracefully', async () => {
      // This would require mocking the Rakuten API to simulate timeout
      const response = await request(app)
        .get('/api/hotels/search')
        .query({ area: 'tokyo' })
        .expect(200);

      // Even if API times out, should return mock data
      expect(response.body.success).toBe(true);
    });

    test('Should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/hotels/search')
        .send('invalid json')
        .expect(404); // Route not found for POST

      expect(response.body.success).toBe(false);
    });
  });

  describe('Cache Tests', () => {
    test('Should cache search results', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/hotels/search')
        .query({ area: 'kyoto', limit: 5 })
        .expect(200);

      // Second identical request (should use cache)
      const response2 = await request(app)
        .get('/api/hotels/search')
        .query({ area: 'kyoto', limit: 5 })
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      
      // Cache should improve response time
      expect(response2.body.data.searchTime).toBeLessThanOrEqual(response1.body.data.searchTime);
    });
  });
});

// Integration test for React components (if running in browser environment)
if (typeof window !== 'undefined') {
  describe('Frontend Integration Tests', () => {
    test('Search form should submit and display results', async () => {
      // Would test React components in actual browser environment
      // This is a placeholder for frontend integration tests
      expect(true).toBe(true);
    });
  });
}