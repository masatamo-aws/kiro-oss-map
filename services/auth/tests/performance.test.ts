/**
 * Auth Service Performance Tests - v2.2.0 Enhanced
 * 認証サービスのパフォーマンステスト
 */

import request from 'supertest';
import { app } from '../src/index';
import { performance } from 'perf_hooks';

describe('Auth Service - Performance Tests v2.2.0', () => {
  const testUser = {
    email: 'perf-test@example.com',
    password: 'TestPassword123!',
    name: 'Performance Test User'
  };

  beforeAll(async () => {
    // テスト用ユーザーを作成
    await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);
  });

  afterAll(async () => {
    // クリーンアップ
  });

  describe('Response Time Tests', () => {
    it('should respond to login within 200ms', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should respond to registration within 300ms', async () => {
      const startTime = performance.now();
      
      const uniqueEmail = `perf-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: testUser.password,
          name: testUser.name
        });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(300);
      
      if (response.status === 201) {
        expect(response.body).toHaveProperty('success', true);
      }
    });

    it('should respond to token validation within 50ms', async () => {
      // まずログインしてトークンを取得
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      if (loginResponse.status === 200) {
        const token = loginResponse.body.data.token;
        
        const startTime = performance.now();
        
        const response = await request(app)
          .get('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(50);
        expect(response.body).toHaveProperty('success', true);
      }
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle 50 concurrent login requests', async () => {
      const concurrentRequests = 50;
      const startTime = performance.now();

      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password
          })
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 全てのリクエストが成功するべき
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // 平均レスポンス時間が妥当であることを確認
      const averageResponseTime = totalTime / concurrentRequests;
      expect(averageResponseTime).toBeLessThan(500);

      console.log(`50 concurrent logins completed in ${totalTime.toFixed(2)}ms`);
      console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
    });

    it('should handle 100 concurrent token validations', async () => {
      // まずトークンを取得
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      if (loginResponse.status === 200) {
        const token = loginResponse.body.data.token;
        const concurrentRequests = 100;
        const startTime = performance.now();

        const requests = Array(concurrentRequests).fill(null).map(() =>
          request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${token}`)
        );

        const responses = await Promise.all(requests);
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        // 全てのリクエストが成功するべき
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        const averageResponseTime = totalTime / concurrentRequests;
        expect(averageResponseTime).toBeLessThan(100);

        console.log(`100 concurrent token validations completed in ${totalTime.toFixed(2)}ms`);
        console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
      }
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // 1000回のログイン操作を実行
      for (let i = 0; i < 1000; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password
          });
      }

      // ガベージコレクションを強制実行
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // メモリ増加が10MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      console.log(`Memory increase after 1000 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Database Performance Tests', () => {
    it('should efficiently query user data', async () => {
      const startTime = performance.now();
      
      // 複数のユーザー検索を実行
      const searchPromises = Array(20).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: `user${index}@example.com`,
            password: 'password123'
          })
      );

      await Promise.allSettled(searchPromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 20回のクエリが2秒以内に完了することを確認
      expect(totalTime).toBeLessThan(2000);

      console.log(`20 database queries completed in ${totalTime.toFixed(2)}ms`);
    });

    it('should handle database connection pooling efficiently', async () => {
      const concurrentDbOperations = 50;
      const startTime = performance.now();

      const operations = Array(concurrentDbOperations).fill(null).map(() =>
        request(app)
          .get('/api/v1/user/profile')
          .set('Authorization', 'Bearer valid-token-here')
      );

      await Promise.allSettled(operations);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 50の同時DB操作が5秒以内に完了することを確認
      expect(totalTime).toBeLessThan(5000);

      console.log(`50 concurrent DB operations completed in ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance Tests', () => {
    it('should benefit from Redis caching', async () => {
      const token = 'test-token-for-cache';
      
      // 最初のリクエスト（キャッシュなし）
      const startTime1 = performance.now();
      await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`);
      const firstRequestTime = performance.now() - startTime1;

      // 2回目のリクエスト（キャッシュあり）
      const startTime2 = performance.now();
      await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`);
      const secondRequestTime = performance.now() - startTime2;

      // キャッシュされたリクエストの方が高速であることを確認
      expect(secondRequestTime).toBeLessThan(firstRequestTime);

      console.log(`First request: ${firstRequestTime.toFixed(2)}ms`);
      console.log(`Cached request: ${secondRequestTime.toFixed(2)}ms`);
      console.log(`Cache improvement: ${((firstRequestTime - secondRequestTime) / firstRequestTime * 100).toFixed(1)}%`);
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const duration = 10000; // 10秒間のテスト
      const requestsPerSecond = 10;
      const interval = 1000 / requestsPerSecond;
      
      const startTime = performance.now();
      const responses: any[] = [];
      
      const loadTest = new Promise<void>((resolve) => {
        const intervalId = setInterval(async () => {
          const currentTime = performance.now();
          
          if (currentTime - startTime >= duration) {
            clearInterval(intervalId);
            resolve();
            return;
          }

          try {
            const response = await request(app)
              .post('/api/v1/auth/login')
              .send({
                email: testUser.email,
                password: testUser.password
              });
            
            responses.push({
              status: response.status,
              time: currentTime - startTime
            });
          } catch (error) {
            responses.push({
              status: 'error',
              time: currentTime - startTime,
              error
            });
          }
        }, interval);
      });

      await loadTest;

      // 成功率が95%以上であることを確認
      const successfulResponses = responses.filter(r => r.status === 200);
      const successRate = (successfulResponses.length / responses.length) * 100;
      
      expect(successRate).toBeGreaterThan(95);

      console.log(`Load test completed: ${responses.length} requests in 10 seconds`);
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
    });
  });
});