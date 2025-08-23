/**
 * Kiro OSS Map v2.1.0 - 認証サービス 統合テスト
 * 認証API・ユーザー管理・セキュリティテスト
 */

import request from 'supertest';
import { AuthService } from '../src/index';
import { DatabaseService } from '../src/services/database';
import { RedisService } from '../src/services/redis';
import { createLogger } from '../../shared/utils/logger';

describe('Auth Service Integration Tests', () => {
  let app: any;
  let authService: AuthService;
  let databaseService: DatabaseService;
  let redisService: RedisService;
  let logger = createLogger('auth-service-test', '2.1.0');

  // テスト用ユーザーデータ
  const testUser = {
    email: 'test@example.com',
    password: 'TestPass123!',
    name: 'Test User'
  };

  let userAccessToken: string;
  let userRefreshToken: string;
  let userId: string;

  beforeAll(async () => {
    // テスト用サービス初期化
    authService = new AuthService();
    await authService.initialize();
    app = authService.getApp();

    // データベース・Redis接続
    databaseService = new DatabaseService({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'kiro_auth_test',
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      ssl: false,
      poolSize: 5
    }, logger);

    redisService = new RedisService({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      database: parseInt(process.env.REDIS_DATABASE || '1'),
      keyPrefix: 'test:'
    }, logger);

    await databaseService.connect();
    await redisService.connect();

    // テスト用データベース初期化
    await databaseService.initialize();
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    await databaseService.query('DELETE FROM users WHERE email LIKE $1', ['%@example.com']);
    
    // 接続クローズ
    await databaseService.disconnect();
    await redisService.disconnect();
    await authService.shutdown();
  });

  beforeEach(async () => {
    // 各テスト前にRedisクリア
    await redisService.delete('*');
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: testUser.email,
        name: testUser.name,
        role: 'user',
        isActive: true,
        emailVerified: false
      });
      expect(response.body.data.user.id).toBeValidUUID();
      expect(response.body.data.tokens.accessToken).toBeValidJWT();
      expect(response.body.data.tokens.refreshToken).toBeValidJWT();

      // テスト用に保存
      userId = response.body.data.user.id;
      userAccessToken = response.body.data.tokens.accessToken;
      userRefreshToken = response.body.data.tokens.refreshToken;
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'weak@example.com',
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens.accessToken).toBeValidJWT();
      expect(response.body.data.tokens.refreshToken).toBeValidJWT();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should implement rate limiting', async () => {
      // 複数回失敗ログインを試行
      const promises = Array(6).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send({
            email: 'ratelimit@example.com',
            password: 'WrongPassword123!'
          })
      );

      const responses = await Promise.all(promises);
      
      // 最後のリクエストはレート制限でブロックされるはず
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: userRefreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeValidJWT();
      expect(response.body.data.tokens.refreshToken).toBeValidJWT();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFRESH_ERROR');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /users/me', () => {
    beforeEach(async () => {
      // 新しいトークンを取得
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      userAccessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: testUser.email,
        name: testUser.name,
        role: 'user'
      });
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get('/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('PUT /users/me', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Test User'
      };

      const response = await request(app)
        .put('/users/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
    });

    it('should reject invalid email update', async () => {
      const response = await request(app)
        .put('/users/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /users/me/password', () => {
    it('should change password successfully', async () => {
      const newPassword = 'NewTestPass123!';

      const response = await request(app)
        .put('/users/me/password')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Password changed successfully');

      // 新しいパスワードでログインできることを確認
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // テストデータを元に戻す
      testUser.password = newPassword;
    });

    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .put('/users/me/password')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          currentPassword: 'WrongCurrentPass123!',
          newPassword: 'NewTestPass123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });
  });

  describe('Health Checks', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('auth-service');
      expect(response.body.version).toBe('2.1.0');
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.dependencies).toHaveProperty('database');
      expect(response.body.dependencies).toHaveProperty('redis');
      expect(response.body.system).toHaveProperty('memory');
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.checks.database).toBe('ready');
      expect(response.body.checks.redis).toBe('ready');
    });
  });

  describe('Metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('auth_service_http_requests_total');
    });

    it('should return metrics summary', async () => {
      const response = await request(app)
        .get('/metrics/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('service');
      expect(response.body.data).toHaveProperty('metrics');
    });
  });
});

// パフォーマンステスト
describe('Auth Service Performance Tests', () => {
  let app: any;
  let authService: AuthService;

  beforeAll(async () => {
    authService = new AuthService();
    await authService.initialize();
    app = authService.getApp();
  });

  afterAll(async () => {
    await authService.shutdown();
  });

  it('should handle concurrent login requests', async () => {
    const concurrentRequests = 10;
    const startTime = Date.now();

    const promises = Array(concurrentRequests).fill(null).map((_, index) =>
      request(app)
        .post('/auth/register')
        .send({
          email: `concurrent${index}@example.com`,
          password: 'TestPass123!',
          name: `Concurrent User ${index}`
        })
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 全てのリクエストが成功することを確認
    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    // パフォーマンス確認（10秒以内）
    expect(duration).toBeLessThan(10000);
    
    console.log(`Concurrent requests completed in ${duration}ms`);
  });
});