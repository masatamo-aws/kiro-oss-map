/**
 * Kiro OSS Map v2.1.0 - 認証サービス テストセットアップ
 * Jest テスト環境初期化・共通設定
 */

import { config } from 'dotenv';

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

// 未処理の Promise 拒否をキャッチ
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Jest グローバル設定
beforeAll(async () => {
  // テスト開始前の共通処理
  console.log('🧪 Starting Auth Service Tests...');
});

afterAll(async () => {
  // テスト終了後の共通処理
  console.log('✅ Auth Service Tests Completed');
});

// 各テストファイル実行前
beforeEach(() => {
  // 各テスト前の共通処理
  jest.clearAllMocks();
});

// 各テストファイル実行後
afterEach(() => {
  // 各テスト後の共通処理
});

// Jest マッチャー拡張
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT`,
        pass: false,
      };
    }
  }
});

// TypeScript 型定義拡張
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidJWT(): R;
    }
  }
}

export {};