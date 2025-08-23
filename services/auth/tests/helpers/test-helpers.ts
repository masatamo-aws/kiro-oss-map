/**
 * Test Helpers - v2.2.0 Enhanced
 * テスト用ヘルパー関数とユーティリティ
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

export interface TestUser {
  id?: number;
  email: string;
  password: string;
  name: string;
  role?: string;
  isActive?: boolean;
}

export interface TestToken {
  token: string;
  payload: any;
  expiresAt: Date;
}

/**
 * テスト用ユーザー生成
 */
export class TestUserFactory {
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const randomId = Math.floor(Math.random() * 10000);
    
    return {
      email: `test-user-${randomId}@example.com`,
      password: 'TestPassword123!',
      name: `Test User ${randomId}`,
      role: 'user',
      isActive: true,
      ...overrides
    };
  }

  static createUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array(count).fill(null).map(() => this.createUser(overrides));
  }

  static createAdminUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'admin',
      email: `admin-${Date.now()}@example.com`,
      name: 'Admin User',
      ...overrides
    });
  }
}

/**
 * JWT トークン生成・検証ヘルパー
 */
export class TokenHelper {
  private static readonly SECRET = process.env.JWT_SECRET || 'test-secret';

  static generateToken(payload: any, options: any = {}): TestToken {
    const defaultOptions = {
      expiresIn: '1h',
      issuer: 'kiro-oss-map',
      audience: 'kiro-users'
    };

    const tokenOptions = { ...defaultOptions, ...options };
    const token = jwt.sign(payload, this.SECRET, tokenOptions);
    
    const decoded = jwt.decode(token) as any;
    const expiresAt = new Date(decoded.exp * 1000);

    return {
      token,
      payload: decoded,
      expiresAt
    };
  }

  static generateExpiredToken(payload: any): TestToken {
    return this.generateToken(payload, { expiresIn: '-1h' });
  }

  static generateInvalidToken(): string {
    return 'invalid.token.here';
  }

  static verifyToken(token: string): any {
    return jwt.verify(token, this.SECRET);
  }

  static generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }
}

/**
 * パスワードハッシュヘルパー
 */
export class PasswordHelper {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateWeakPasswords(): string[] {
    return [
      '123456',
      'password',
      'abc123',
      'qwerty',
      '12345678',
      'password123',
      'admin',
      'letmein'
    ];
  }

  static generateStrongPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // 最低1つずつ必要な文字種を含める
    password += 'A'; // 大文字
    password += 'a'; // 小文字
    password += '1'; // 数字
    password += '!'; // 特殊文字
    
    // 残りをランダムに生成
    for (let i = 4; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // シャッフル
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

/**
 * データベースヘルパー
 */
export class DatabaseHelper {
  static async cleanupTestUsers(): Promise<void> {
    // テスト用ユーザーをクリーンアップ
    // 実際の実装では、データベース接続を使用してテストデータを削除
    console.log('Cleaning up test users...');
  }

  static async createTestUser(user: TestUser): Promise<TestUser> {
    // テスト用ユーザーをデータベースに作成
    // 実際の実装では、データベース接続を使用してユーザーを作成
    const hashedPassword = await PasswordHelper.hashPassword(user.password);
    
    return {
      ...user,
      id: Math.floor(Math.random() * 10000),
      password: hashedPassword
    };
  }

  static async findUserByEmail(email: string): Promise<TestUser | null> {
    // メールアドレスでユーザーを検索
    // 実際の実装では、データベースクエリを実行
    return null;
  }
}

/**
 * APIテストヘルパー
 */
export class ApiTestHelper {
  static createAuthHeaders(token: string): { [key: string]: string } {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  static createCSRFHeaders(csrfToken: string): { [key: string]: string } {
    return {
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json'
    };
  }

  static generateMaliciousInputs(): string[] {
    return [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      '{{7*7}}',
      '${7*7}',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")'
    ];
  }

  static generateSQLInjectionPayloads(): string[] {
    return [
      "admin'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'/**/OR/**/1=1--",
      "' OR 1=1#",
      "' OR 'a'='a",
      "1' OR '1'='1' --",
      "' OR 1=1 LIMIT 1 --"
    ];
  }
}

/**
 * パフォーマンステストヘルパー
 */
export class PerformanceHelper {
  static measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      
      try {
        const result = await fn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        resolve({ result, duration });
      } catch (error) {
        reject(error);
      }
    });
  }

  static async runConcurrentTests<T>(
    testFn: () => Promise<T>,
    concurrency: number
  ): Promise<{ results: T[]; totalTime: number; averageTime: number }> {
    const startTime = performance.now();
    
    const promises = Array(concurrency).fill(null).map(() => testFn());
    const results = await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / concurrency;
    
    return { results, totalTime, averageTime };
  }

  static createLoadTestScenario(
    testFn: () => Promise<any>,
    duration: number,
    requestsPerSecond: number
  ): Promise<{ totalRequests: number; successfulRequests: number; failedRequests: number }> {
    return new Promise((resolve) => {
      const interval = 1000 / requestsPerSecond;
      const startTime = Date.now();
      let totalRequests = 0;
      let successfulRequests = 0;
      let failedRequests = 0;

      const intervalId = setInterval(async () => {
        const currentTime = Date.now();
        
        if (currentTime - startTime >= duration) {
          clearInterval(intervalId);
          resolve({ totalRequests, successfulRequests, failedRequests });
          return;
        }

        totalRequests++;
        
        try {
          await testFn();
          successfulRequests++;
        } catch (error) {
          failedRequests++;
        }
      }, interval);
    });
  }
}

/**
 * セキュリティテストヘルパー
 */
export class SecurityTestHelper {
  static generateBruteForceAttempts(targetEmail: string, count: number = 10): Array<{ email: string; password: string }> {
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
    ];

    return Array(count).fill(null).map((_, index) => ({
      email: targetEmail,
      password: commonPasswords[index % commonPasswords.length]
    }));
  }

  static generateRateLimitTestRequests<T>(
    requestFn: () => Promise<T>,
    count: number
  ): Promise<T>[] {
    return Array(count).fill(null).map(() => requestFn());
  }

  static createSessionFixationPayload(): { [key: string]: string } {
    return {
      'X-Forwarded-For': '127.0.0.1',
      'X-Real-IP': '127.0.0.1',
      'User-Agent': 'Mozilla/5.0 (compatible; SecurityTest/1.0)',
      'Cookie': 'sessionId=fixed-session-id-for-testing'
    };
  }
}

/**
 * モックヘルパー
 */
export class MockHelper {
  static mockRedisClient() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      flushall: jest.fn()
    };
  }

  static mockDatabaseClient() {
    return {
      query: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      transaction: jest.fn()
    };
  }

  static mockEmailService() {
    return {
      sendEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendVerificationEmail: jest.fn()
    };
  }
}

/**
 * テスト設定ヘルパー
 */
export class TestConfigHelper {
  static getTestConfig() {
    return {
      database: {
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432'),
        database: process.env.TEST_DB_NAME || 'kiro_test',
        username: process.env.TEST_DB_USER || 'test',
        password: process.env.TEST_DB_PASS || 'test'
      },
      redis: {
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
        database: parseInt(process.env.TEST_REDIS_DB || '1')
      },
      jwt: {
        secret: process.env.TEST_JWT_SECRET || 'test-secret',
        expiresIn: '1h'
      }
    };
  }

  static setupTestEnvironment() {
    // テスト環境の設定
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.BCRYPT_ROUNDS = '4'; // テスト用に軽量化
  }

  static teardownTestEnvironment() {
    // テスト環境のクリーンアップ
    delete process.env.JWT_SECRET;
    delete process.env.BCRYPT_ROUNDS;
  }
}