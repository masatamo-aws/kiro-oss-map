import request from 'supertest';
import { performance } from 'perf_hooks';
import app from '../src/index';

describe('Map Service Performance Tests', () => {
  describe('Response Time Tests', () => {
    test('Health endpoint should respond within 100ms', async () => {
      const start = performance.now();
      const response = await request(app)
        .get('/health')
        .expect(200);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100);
      expect(response.body.success).toBe(true);
    });

    test('Tiles endpoint should respond within 500ms', async () => {
      const start = performance.now();
      const response = await request(app)
        .get('/api/v2/tiles/1/0/0')
        .expect(200);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(500);
    });

    test('Styles endpoint should respond within 200ms', async () => {
      const start = performance.now();
      const response = await request(app)
        .get('/api/v2/styles')
        .expect(200);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Memory Usage Tests', () => {
    test('Memory usage should remain stable during tile requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make multiple tile requests
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get(`/api/v2/tiles/1/${i}/0`)
          .expect(200);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be less than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Request Tests', () => {
    test('Should handle 50 concurrent requests', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .get(`/api/v2/tiles/1/${i % 5}/${i % 5}`)
          .expect(200)
      );
      
      const start = performance.now();
      const responses = await Promise.all(promises);
      const end = performance.now();
      
      expect(responses).toHaveLength(50);
      expect(end - start).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Cache Performance Tests', () => {
    test('Cached tiles should respond faster than uncached', async () => {
      // First request (uncached)
      const start1 = performance.now();
      await request(app)
        .get('/api/v2/tiles/1/0/0')
        .expect(200);
      const end1 = performance.now();
      const uncachedTime = end1 - start1;
      
      // Second request (cached)
      const start2 = performance.now();
      await request(app)
        .get('/api/v2/tiles/1/0/0')
        .expect(200);
      const end2 = performance.now();
      const cachedTime = end2 - start2;
      
      expect(cachedTime).toBeLessThan(uncachedTime * 0.5); // Cached should be at least 50% faster
    });
  });
});