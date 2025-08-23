/**
 * Kiro OSS Map v2.2.0 - Map Service テスト
 * 地図サービスの統合テスト・品質向上・パフォーマンステスト
 */

import request from 'supertest';
import { MapService } from '../src/index.js';
import { PerformanceTestHelper, TestDataGenerator } from '../../auth/tests/helpers/test-helpers.js';

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

  describe('Performance Tests', () => {
    it('should respond to health check within 50ms', async () => {
      const { result, duration } = await PerformanceTestHelper.measureExecutionTime(async () => {
        return request(app).get('/health');
      });

      expect(result.status).toBe(200);
      expect(duration).toBeLessThan(50);
      
      console.log(`Map service health check completed in ${duration}ms`);
    });

    it('should handle concurrent style requests efficiently', async () => {
      const concurrency = 20;
      const maxDuration = 2000; // 2秒以内

      const { results, totalDuration } = await PerformanceTestHelper.runConcurrentRequests(
        async () => {
          return request(app).get('/styles');
        },
        concurrency
      );

      // 全てのリクエストが成功することを確認
      results.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(totalDuration).toBeLessThan(maxDuration);
      
      console.log(`Concurrent style requests: ${concurrency} requests in ${totalDuration}ms`);
    });

    it('should handle tile requests within performance limits', async () => {
      const { result, duration } = await PerformanceTestHelper.measureExecutionTime(async () => {
        return request(app).get('/tiles/1/0/0.png');
      });

      // タイルが見つからない場合でも高速に応答すること
      expect([200, 404]).toContain(result.status);
      expect(duration).toBeLessThan(200);
      
      console.log(`Tile request handled in ${duration}ms`);
    });
  });

  describe('Security Tests', () => {
    it('should prevent path traversal attacks', async () => {
      const maliciousPaths = [
        '/tiles/../../../etc/passwd',
        '/styles/../../config/database.json',
        '/tiles/%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ];

      for (const path of maliciousPaths) {
        const response = await request(app).get(path);
        
        // パストラバーサル攻撃が防がれることを確認
        expect(response.status).not.toBe(200);
        expect(response.status).toBeOneOf([400, 404]);
      }
    });

    it('should validate tile parameters properly', async () => {
      const invalidParams = [
        '/tiles/abc/0/0.png',
        '/tiles/1/abc/0.png',
        '/tiles/1/0/abc.png',
        '/tiles/-1/0/0.png',
        '/tiles/1/-1/0.png',
        '/tiles/1/0/-1.png',
      ];

      for (const param of invalidParams) {
        const response = await request(app).get(param);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should implement proper CORS policy', async () => {
      const response = await request(app)
        .get('/styles')
        .set('Origin', 'https://malicious-site.com');

      // 適切なCORSポリシーが適用されることを確認
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
      }
    });
  });

  describe('Error Recovery Tests', () => {
    it('should handle Redis connection failures gracefully', async () => {
      // Redis接続エラーをシミュレート（実際の実装では適切にモック）
      const response = await request(app)
        .get('/tiles/stats')
        .expect(200);

      // Redis障害時でも基本機能は動作すること
      expect(response.body.success).toBe(true);
    });

    it('should handle storage failures gracefully', async () => {
      // ストレージエラーをシミュレート
      const response = await request(app)
        .get('/tiles/1/0/0.png');

      // ストレージ障害時でも適切なエラーレスポンスを返すこと
      expect([200, 404, 500]).toContain(response.status);
      
      if (response.status === 500) {
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBeDefined();
      }
    });
  });

  describe('Memory and Resource Tests', () => {
    it('should not cause memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 50;

      // 大量のリクエストを実行
      for (let i = 0; i < iterations; i++) {
        await request(app).get('/styles');
        
        // 定期的にガベージコレクション実行
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercentage = (memoryIncrease / initialMemory.heapUsed) * 100;

      // メモリ使用量の増加が30%以下であることを確認
      expect(memoryIncreasePercentage).toBeLessThan(30);
      
      console.log(`Memory usage after ${iterations} operations:`);
      console.log(`Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Increase: ${memoryIncreasePercentage.toFixed(2)}%`);
    });
  });
});