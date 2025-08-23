/**
 * Search Service Tests - v2.2.0 Enhanced
 * 検索サービスの包括的テスト
 */

import request from 'supertest';
import { app } from '../src/index';
import { SearchService } from '../src/services/search';
import { GeocodingService } from '../src/services/geocoding';
import { POIService } from '../src/services/poi';

describe('Search Service - v2.2.0 Enhanced Tests', () => {
  let searchService: SearchService;
  let geocodingService: GeocodingService;
  let poiService: POIService;

  beforeAll(async () => {
    searchService = new SearchService();
    geocodingService = new GeocodingService();
    poiService = new POIService();
  });

  afterAll(async () => {
    // クリーンアップ
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'healthy');
    });

    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('system');
    });
  });

  describe('Search API', () => {
    it('should search for locations successfully', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ q: 'Tokyo Station', limit: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('results');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should handle empty search query', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ q: '', limit: 5 })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate search parameters', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ q: 'test', limit: 1000 }) // 上限超過
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle search with filters', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ 
          q: 'restaurant', 
          limit: 10,
          category: 'food',
          bounds: '35.6762,139.6503,35.6862,139.6603'
        })
        .expect(200);

      expect(response.body.data.results).toBeDefined();
    });
  });

  describe('Geocoding API', () => {
    it('should geocode address successfully', async () => {
      const response = await request(app)
        .get('/api/v1/geocoding')
        .query({ address: '東京駅' })
        .expect(200);

      expect(response.body.data).toHaveProperty('coordinates');
      expect(response.body.data.coordinates).toHaveProperty('lat');
      expect(response.body.data.coordinates).toHaveProperty('lng');
    });

    it('should reverse geocode coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/geocoding/reverse')
        .query({ lat: 35.6762, lng: 139.6503 })
        .expect(200);

      expect(response.body.data).toHaveProperty('address');
    });

    it('should handle invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/geocoding/reverse')
        .query({ lat: 'invalid', lng: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POI API', () => {
    it('should search POIs by category', async () => {
      const response = await request(app)
        .get('/api/v1/poi')
        .query({ 
          category: 'restaurant',
          lat: 35.6762,
          lng: 139.6503,
          radius: 1000
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('pois');
      expect(Array.isArray(response.body.data.pois)).toBe(true);
    });

    it('should get POI details', async () => {
      // まずPOIを検索
      const searchResponse = await request(app)
        .get('/api/v1/poi')
        .query({ 
          category: 'restaurant',
          lat: 35.6762,
          lng: 139.6503,
          radius: 1000,
          limit: 1
        });

      if (searchResponse.body.data.pois.length > 0) {
        const poiId = searchResponse.body.data.pois[0].id;
        
        const response = await request(app)
          .get(`/api/v1/poi/${poiId}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('poi');
        expect(response.body.data.poi).toHaveProperty('id', poiId);
      }
    });

    it('should handle invalid POI ID', async () => {
      const response = await request(app)
        .get('/api/v1/poi/invalid-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Performance Tests', () => {
    it('should respond to search within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/search')
        .query({ q: 'Tokyo', limit: 10 })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/v1/search')
          .query({ q: 'test', limit: 5 })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable', async () => {
      // Redis接続エラーをシミュレート
      jest.spyOn(searchService, 'search').mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/v1/search')
        .query({ q: 'test' })
        .expect(503);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Service unavailable');
    });

    it('should handle rate limiting', async () => {
      // 大量のリクエストを送信してレート制限をテスト
      const requests = Array(101).fill(null).map(() =>
        request(app)
          .get('/api/v1/search')
          .query({ q: 'test' })
      );

      const responses = await Promise.allSettled(requests);
      
      // 一部のリクエストが429 (Too Many Requests) になることを確認
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && 
        (result.value as any).status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Tests', () => {
    it('should sanitize search input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .get('/api/v1/search')
        .query({ q: maliciousInput })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate API key if required', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ q: 'test' })
        .set('X-API-Key', 'invalid-key');

      // API キーが無効な場合は401を返すべき
      if (response.status === 401) {
        expect(response.body).toHaveProperty('success', false);
      }
    });
  });

  describe('Cache Tests', () => {
    it('should cache search results', async () => {
      const query = 'unique-test-query-' + Date.now();
      
      // 最初のリクエスト
      const response1 = await request(app)
        .get('/api/v1/search')
        .query({ q: query })
        .expect(200);

      // 2回目のリクエスト（キャッシュから取得されるべき）
      const startTime = Date.now();
      const response2 = await request(app)
        .get('/api/v1/search')
        .query({ q: query })
        .expect(200);
      const responseTime = Date.now() - startTime;

      // キャッシュされた結果は高速に返されるべき
      expect(responseTime).toBeLessThan(50);
      expect(response1.body).toEqual(response2.body);
    });
  });
});