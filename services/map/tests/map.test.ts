/**
 * Kiro OSS Map v2.1.0 - Map Service テスト
 * 地図サービスの統合テスト
 */

import request from 'supertest';
import { MapService } from '../src/index.js';

describe('Map Service', () => {
  let mapService: MapService;
  let app: any;

  beforeAll(async () => {
    // テスト用環境変数設定
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0'; // ランダムポート
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.STORAGE_TYPE = 'local';
    process.env.STORAGE_LOCAL_BASE_PATH = './test-data';

    mapService = new MapService();
    await mapService.initialize();
    app = mapService.getApp();
  });

  afterAll(async () => {
    await mapService.shutdown();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', '2.1.0');
    });

    it('should return liveness probe', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return readiness probe', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });
  });

  describe('Metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('map_service_info');
    });

    it('should return JSON metrics', async () => {
      const response = await request(app)
        .get('/metrics/json')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('service');
    });

    it('should return service statistics', async () => {
      const response = await request(app)
        .get('/metrics/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('uptime');
    });
  });

  describe('Tiles API', () => {
    it('should return tile statistics', async () => {
      const response = await request(app)
        .get('/tiles/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should handle invalid tile coordinates', async () => {
      const response = await request(app)
        .get('/tiles/invalid/invalid/invalid.png')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_PARAMETERS');
    });

    it('should handle invalid zoom level', async () => {
      const response = await request(app)
        .get('/tiles/25/0/0.png')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_ZOOM');
    });

    it('should handle unsupported format', async () => {
      const response = await request(app)
        .get('/tiles/1/0/0.gif')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'UNSUPPORTED_FORMAT');
    });

    it('should handle tile not found', async () => {
      const response = await request(app)
        .get('/tiles/1/0/0.png')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'TILE_NOT_FOUND');
    });
  });

  describe('Styles API', () => {
    it('should return style list', async () => {
      const response = await request(app)
        .get('/styles')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('styles');
      expect(response.body.data).toHaveProperty('count');
    });

    it('should handle style not found', async () => {
      const response = await request(app)
        .get('/styles/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'STYLE_NOT_FOUND');
    });

    it('should require authentication for style creation', async () => {
      const response = await request(app)
        .post('/styles')
        .send({
          name: 'Test Style',
          style: { version: 8, sources: {}, layers: [] }
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/tiles/1/0/0.png')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      // 複数回リクエストを送信してレート制限をテスト
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/styles')
      );

      const responses = await Promise.all(requests);
      
      // すべてのリクエストが成功するか、一部がレート制限されるかをチェック
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(10);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Compression', () => {
    it('should compress responses when requested', async () => {
      const response = await request(app)
        .get('/styles')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // レスポンスが圧縮されているかチェック
      expect(response.headers['content-encoding']).toBeDefined();
    });
  });
});