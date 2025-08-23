import request from 'supertest';
import { performance } from 'perf_hooks';
import app from '../src/index';

describe('Search Service Performance Tests', () => {
  describe('Search Response Time Tests', () => {
    test('Basic search should respond within 1000ms', async () => {
      const start = performance.now();
      const response = await request(app)
        .get('/api/v2/search?q=tokyo')
        .expect(200);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000);
      expect(response.body.success).toBe(true);
    });

    test('Geocoding should respond within 800ms', async () => {
      const start = performance.now();
      const response = await request(app)
        .get('/api/v2/geocoding?q=tokyo station')
        .expect(200);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(800);
      expect(response.body.success).toBe(true);
    });

    test('POI search should respond within 1200ms', async () => {
      const start = performance.now();
      const response = await request(app)
        .get('/api/v2/poi?category=restaurant&lat=35.6762&lon=139.6503')
        .expect(200);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Search Cache Performance', () => {
    test('Cached search results should be faster', async () => {
      const query = 'shibuya';
      
      // First search (uncached)
      const start1 = performance.now();
      await request(app)
        .get(`/api/v2/search?q=${query}`)
        .expect(200);
      const end1 = performance.now();
      const uncachedTime = end1 - start1;
      
      // Second search (cached)
      const start2 = performance.now();
      await request(app)
        .get(`/api/v2/search?q=${query}`)
        .expect(200);
      const end2 = performance.now();
      const cachedTime = end2 - start2;
      
      expect(cachedTime).toBeLessThan(uncachedTime * 0.3); // Cached should be at least 70% faster
    });
  });

  describe('Concurrent Search Tests', () => {
    test('Should handle 20 concurrent search requests', async () => {
      const queries = ['tokyo', 'osaka', 'kyoto', 'hiroshima', 'sendai'];
      const promises = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .get(`/api/v2/search?q=${queries[i % queries.length]}`)
          .expect(200)
      );
      
      const start = performance.now();
      const responses = await Promise.all(promises);
      const end = performance.now();
      
      expect(responses).toHaveLength(20);
      expect(end - start).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('Memory Usage Tests', () => {
    test('Memory should not leak during multiple searches', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple searches
      for (let i = 0; i < 20; i++) {
        await request(app)
          .get(`/api/v2/search?q=test${i}`)
          .expect(200);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be less than 30MB
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024);
    });
  });

  describe('Error Handling Performance', () => {
    test('Invalid requests should fail fast', async () => {
      const start = performance.now();
      await request(app)
        .get('/api/v2/search?q=')
        .expect(400);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50); // Should fail within 50ms
    });
  });
});