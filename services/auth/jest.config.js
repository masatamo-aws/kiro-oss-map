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
  moduleNameMapper: {
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
  
  // カバレッジ設定（v2.2.0品質向上）
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'cobertura'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/routes/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
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
  
  // v2.2.0品質向上設定
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // テストレポート
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Auth Service Test Report v2.2.0'
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      suiteName: 'Auth Service Tests'
    }]
  ],
  
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