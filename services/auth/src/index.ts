/**
 * Kiro OSS Map v2.1.0 - 認証サービス
 * マイクロサービス認証システムのエントリーポイント
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/index';
import { createLogger, createLoggerMiddleware, createErrorLoggerMiddleware, setupProcessLoggers } from '../../shared/utils/logger';
import { createJwtAuthMiddleware } from '../../shared/middleware/auth';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
import { MetricsCollector } from './middleware/metrics';

/**
 * 認証サービスアプリケーション
 */
class AuthService {
  private app: express.Application;
  private logger = createLogger('auth-service', '2.1.0');
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private metricsCollector: MetricsCollector;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService(config.database!, this.logger);
    this.redisService = new RedisService(config.redis!, this.logger);
    this.metricsCollector = new MetricsCollector('auth-service');
  }

  /**
   * アプリケーション初期化
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Auth Service...');

      // 外部サービス接続
      await this.connectServices();

      // ミドルウェア設定
      this.setupMiddleware();

      // ルート設定
      this.setupRoutes();

      // エラーハンドリング設定
      this.setupErrorHandling();

      // プロセスイベント設定
      setupProcessLoggers(this.logger);

      this.logger.info('Auth Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Auth Service', error as Error);
      throw error;
    }
  }

  /**
   * 外部サービス接続
   */
  private async connectServices(): Promise<void> {
    this.logger.info('Connecting to external services...');

    // データベース接続
    await this.databaseService.connect();
    this.logger.info('Database connected successfully');

    // Redis接続
    await this.redisService.connect();
    this.logger.info('Redis connected successfully');
  }

  /**
   * ミドルウェア設定
   */
  private setupMiddleware(): void {
    this.logger.info('Setting up middleware...');

    // セキュリティミドルウェア
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS設定
    this.app.use(cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
    }));

    // 圧縮
    this.app.use(compression());

    // JSON解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // レート制限
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分
      max: 100, // リクエスト数制限
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP',
          timestamp: new Date().toISOString()
        }
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // ログミドルウェア
    this.app.use(createLoggerMiddleware(this.logger));

    // メトリクス収集
    this.app.use(this.metricsCollector.middleware());
  }

  /**
   * ルート設定
   */
  private setupRoutes(): void {
    this.logger.info('Setting up routes...');

    // ヘルスチェック
    this.app.use('/health', healthRoutes(this.databaseService, this.redisService, this.logger));

    // メトリクス
    this.app.use('/metrics', metricsRoutes(this.metricsCollector, this.logger));

    // 認証API
    this.app.use('/auth', authRoutes(this.databaseService, this.redisService, this.logger));

    // ユーザーAPI
    this.app.use('/users', userRoutes(this.databaseService, this.redisService, this.logger));

    // 404ハンドラー
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  /**
   * エラーハンドリング設定
   */
  private setupErrorHandling(): void {
    // エラーログミドルウェア
    this.app.use(createErrorLoggerMiddleware(this.logger));

    // グローバルエラーハンドラー
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', error);

      // 本番環境では詳細なエラー情報を隠す
      const isDevelopment = config.environment === 'development';
      
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Internal server error',
          timestamp: new Date().toISOString(),
          ...(isDevelopment && { stack: error.stack })
        }
      });
    });
  }

  /**
   * サーバー起動
   */
  async start(): Promise<void> {
    const port = config.port;
    
    this.app.listen(port, () => {
      this.logger.info(`Auth Service started on port ${port}`, {
        port,
        environment: config.environment,
        version: '2.1.0'
      });
    });
  }

  /**
   * グレースフルシャットダウン
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Auth Service...');

    try {
      // 外部サービス切断
      await this.redisService.disconnect();
      await this.databaseService.disconnect();

      this.logger.info('Auth Service shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
    }
  }

  /**
   * Expressアプリケーション取得（テスト用）
   */
  getApp(): express.Application {
    return this.app;
  }
}

/**
 * メイン実行
 */
async function main(): Promise<void> {
  const authService = new AuthService();

  try {
    await authService.initialize();
    await authService.start();

    // グレースフルシャットダウン設定
    process.on('SIGTERM', async () => {
      await authService.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await authService.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Auth Service:', error);
    process.exit(1);
  }
}

// 直接実行時のみmain関数を呼び出し
if (require.main === module) {
  main().catch(console.error);
}

export { AuthService };
export default AuthService;