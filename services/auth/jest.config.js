/**
 * Kiro OSS Map v2.1.0 - 認証サービス Jest設定
 * TypeScript・ESM・テスト環境設定
 */

export default {
  // 基本設定
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  
  // TypeScript設定
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2022'
      }
    }]
  },
  
  // モジュール解決
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // テストファイル
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/*.{test,spec}.ts',
    '<rootDir>/tests/**/*.{test,spec}.ts'
  ],
  
  // 除外ファイル
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // カバレッジ設定
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // セットアップ
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // タイムアウト
  testTimeout: 30000,
  
  // 並列実行
  maxWorkers: '50%',
  
  // 詳細出力
  verbose: true,
  
  // エラー時の詳細表示
  errorOnDeprecated: true,
  
  // グローバル設定
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // 環境変数
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};