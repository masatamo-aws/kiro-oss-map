/**
 * Kiro OSS Map v2.1.0 - 検索サービス
 * ジオコーディング・POI検索・Elasticsearch統合のエントリーポイント
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/index';
import { createLogger, createLoggerMiddleware, createErrorLoggerMiddleware, setupProcessLoggers } from '../../../shared/dist/utils/logger';
import { searchRoutes } from './routes/search';
import { geocodingRoutes } from './routes/geocoding';
import { poiRoutes } from './routes/poi';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { SearchService } from './services/search';
import { GeocodingService } from './services/geocoding';
import { POIService } from './services/poi';
import { ElasticsearchService } from './services/elasticsearch';
import { RedisService } from './services/redis';
import { MetricsCollector } from './middleware/metrics';

/**
 * 検索サービスアプリケーション
 */
class SearchServiceApp {
  private app: express.Application;
  private logger = createLogger('search-service', '2.1.0');
  private searchService: SearchService;
  private geocodingService: GeocodingService;
  private poiService: POIService;
  private elasticsearchService: ElasticsearchService;
  private redisService: RedisService;
  private metricsCollector: MetricsCollector;

  constructor() {
    this.app = express();
    this.elasticsearchService = new ElasticsearchService(config.elasticsearch, this.logger);
    this.redisService = new RedisService(config.redis, this.logger);
    this.searchService = new SearchService(this.elasticsearchService, this.redisService, this.logger);
    this.geocodingService = new GeocodingService(this.elasticsearchService, this.redisService, this.logger);
    this.poiService = new POIService(this.elasticsearchService, this.redisService, this.logger);
    this.metricsCollector = new MetricsCollector('search-service');
  }

  /**
   * アプリケーション初期化
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Search Service...');

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

      this.logger.info('Search Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Search Service', error as Error);
      throw error;
    }
  }

  /**
   * 外部サービス接続
   */
  private async connectServices(): Promise<void> {
    this.logger.info('Connecting to external services...');

    // Elasticsearch接続
    await this.elasticsearchService.connect();
    this.logger.info('Elasticsearch connected successfully');

    // Redis接続
    await this.redisService.connect();
    this.logger.info('Redis connected successfully');

    // 検索サービス初期化
    await this.searchService.initialize();
    this.logger.info('Search service initialized');

    // ジオコーディングサービス初期化
    await this.geocodingService.initialize();
    this.logger.info('Geocoding service initialized');

    // POIサービス初期化
    await this.poiService.initialize();
    this.logger.info('POI service initialized');
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
      max: 1000, // 検索は高頻度アクセスのため多めに設定
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

    // 検索専用レート制限（より緩い制限）
    const searchLimit = rateLimit({
      windowMs: 1 * 60 * 1000, // 1分
      max: 100, // 1分間に100検索
      keyGenerator: (req) => `${req.ip}:search`,
      message: {
        success: false,
        error: {
          code: 'SEARCH_RATE_LIMIT_EXCEEDED',
          message: 'Too many search requests',
          timestamp: new Date().toISOString()
        }
      }
    });
    this.app.use('/search', searchLimit);
    this.app.use('/geocoding', searchLimit);
    this.app.use('/poi', searchLimit);

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
    this.app.use('/health', healthRoutes(
      this.searchService,
      this.geocodingService,
      this.poiService,
      this.elasticsearchService,
      this.redisService,
      this.logger
    ));

    // メトリクス
    this.app.use('/metrics', metricsRoutes(this.metricsCollector, this.logger));

    // 検索API
    this.app.use('/search', searchRoutes(
      this.searchService,
      this.metricsCollector,
      this.logger
    ));

    // ジオコーディングAPI
    this.app.use('/geocoding', geocodingRoutes(
      this.geocodingService,
      this.metricsCollector,
      this.logger
    ));

    // POI検索API
    this.app.use('/poi', poiRoutes(
      this.poiService,
      this.metricsCollector,
      this.logger
    ));

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
      this.logger.info(`Search Service started on port ${port}`, {
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
    this.logger.info('Shutting down Search Service...');

    try {
      // 外部サービス切断
      await this.redisService.disconnect();
      await this.elasticsearchService.disconnect();

      this.logger.info('Search Service shutdown completed');
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
  const searchService = new SearchServiceApp();

  try {
    await searchService.initialize();
    await searchService.start();

    // グレースフルシャットダウン設定
    process.on('SIGTERM', async () => {
      await searchService.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await searchService.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Search Service:', error);
    process.exit(1);
  }
}

// 直接実行時のみmain関数を呼び出し
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SearchServiceApp };
export default SearchServiceApp;