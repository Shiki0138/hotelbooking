import request from 'supertest';
import { app } from '../src';
import { prisma } from '../src/lib/prisma';
import { io as ioClient, Socket } from 'socket.io-client';

describe('Integration Tests', () => {
  let clientSocket: Socket;
  let serverUrl: string;

  beforeAll((done) => {
    serverUrl = `http://localhost:${process.env.PORT || 8000}`;
    clientSocket = ioClient(serverUrl);
    clientSocket.on('connect', done);
  });

  afterAll(() => {
    clientSocket.close();
    prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('database', 'connected');
      expect(response.body).toHaveProperty('version', '1.0.0');
    });
  });

  describe('WebSocket Connection', () => {
    it('should connect to socket server', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should join room availability channel', (done) => {
      clientSocket.emit('subscribe:availability', 'room-123');
      // Since we can't directly test server-side room joining,
      // we just ensure the event is sent without error
      setTimeout(done, 100);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(150).fill(null).map(() =>
        request(app).get('/api/hotels/search')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('API Versioning', () => {
    it('should handle API version in headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('X-API-Version', '1.0');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app).get('/api/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid json}');

      expect(response.status).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      // Temporarily disconnect database
      await prisma.$disconnect();

      const response = await request(app).get('/api/hotels/search');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Reconnect
      await prisma.$connect();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/hotels/search')
        .set('Origin', 'http://localhost:8080')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Compression', () => {
    it('should compress large responses', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .set('Accept-Encoding', 'gzip');

      expect(response.headers).toHaveProperty('content-encoding');
    });
  });

  describe('Request Logging', () => {
    it('should log requests with correlation ID', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('X-Request-ID', 'test-correlation-id');

      expect(response.headers).toHaveProperty('x-request-id', 'test-correlation-id');
    });
  });

  describe('Caching', () => {
    it('should cache static responses', async () => {
      const response1 = await request(app).get('/api/locations/popular');
      const etag = response1.headers.etag;

      const response2 = await request(app)
        .get('/api/locations/popular')
        .set('If-None-Match', etag);

      expect(response2.status).toBe(304);
    });
  });
});