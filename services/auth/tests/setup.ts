/**
 * Kiro OSS Map v2.2.0 - 認証サービス テストセットアップ
 * Jest テスト環境初期化・共通設定・品質向上
 */

import { config } from 'dotenv';
import { customMatchers } from './helpers/test-helpers';

// テスト用環境変数読み込み
config({ path: '.env.test' });

// テスト用環境変数設定
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_NAME = 'kiro_auth_test';
process.env.REDIS_DATABASE = '1';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';

// ログレベル設定（テスト時は静かに）
process.env.LOG_LEVEL = 'error';

// タイムゾーン設定
process.env.TZ = 'UTC';

// テスト品質向上設定
process.env.TEST_COVERAGE_THRESHOLD = '80';
process.env.TEST_TIMEOUT = '30000';

// 未処理の Promise 拒否をキャッチ（テスト環境では厳格に）
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // テスト環境では即座に終了
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// テストメトリクス収集
const testMetrics = {
  startTime: Date.now(),
  suiteCount: 0,
  testCount: 0,
  passedTests: 0,
  failedTests: 0,
  slowTests: [],
};

// Jest マッチャー拡張（改良版）
const extendedMatchers = {
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    return {
      message: () => pass 
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`,
      pass,
    };
  },
  
  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);
    
    return {
      message: () => pass
        ? `expected ${received} not to be a valid JWT`
        : `expected ${received} to be a valid JWT`,
      pass,
    };
  },
  
  ...customMatchers,
};

// TypeScript 型定義拡張
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidJWT(): R;
      toBeValidEmail(): R;
      toBeValidPassword(): R;
      toHaveValidTimestamp(): R;
      toMatchApiResponse(): R;
      toHaveValidPagination(): R;
    }
  }
  
  namespace NodeJS {
    interface Global {
      testHelpers: {
        waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
        sleep: (ms: number) => Promise<void>;
        generateRandomString: (length?: number) => string;
      };
    }
  }
}

// グローバルテストヘルパー
(global as any).testHelpers = {
  async waitFor(condition: () => boolean, timeout: number = 5000) {
    const startTime = Date.now();
    while (!condition() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },
  
  async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  generateRandomString(length: number = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  },
};

export {};