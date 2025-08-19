/**
 * Kiro OSS Map v2.1.0 - 認証サービス ヘルスチェックルート
 * 基本・詳細ヘルスチェック・依存関係監視
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { Logger } from '../../../shared/utils/logger';

/**
 * ヘルスチェックルート作成
 */
export function healthRoutes(
  databaseService: DatabaseService,
  redisService: RedisService,
  logger: Logger
): Router {
  const router = Router();

  /**
   * 基本ヘルスチェック
   * GET /health
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      
      // 基本的な生存確認
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        uptime: process.uptime(),
        responseTime: Date.now() - startTime
      };

      res.status(200).json(health);
    } catch (error) {
      logger.error('Basic health check failed', error as Error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        error: (error as Error).message
      });
    }
  });

  /**
   * 詳細ヘルスチェック
   * GET /health/detailed
   */
  router.get('/detailed', async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      
      // 並列で依存関係チェック
      const [databaseHealth, redisHealth] = await Promise.allSettled([
        databaseService.healthCheck(),
        redisService.healthCheck()
      ]);

      // システム情報
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        uptime: process.uptime(),
        responseTime: Date.now() - startTime,
        
        // システム情報
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        },

        // 依存関係
        dependencies: {
          database: databaseHealth.status === 'fulfilled' ? 
            databaseHealth.value : { status: 'unhealthy', error: databaseHealth.reason?.message },
          redis: redisHealth.status === 'fulfilled' ? 
            redisHealth.value : { status: 'unhealthy', error: redisHealth.reason?.message }
        }
      };

      // 依存関係の状態に基づいて全体ステータス決定
      const allHealthy = 
        (databaseHealth.status === 'fulfilled' && databaseHealth.value.status === 'healthy') &&
        (redisHealth.status === 'fulfilled' && redisHealth.value.status === 'healthy');

      if (!allHealthy) {
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);

    } catch (error) {
      logger.error('Detailed health check failed', error as Error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        error: (error as Error).message
      });
    }
  });

  /**
   * 準備状態チェック（Kubernetes Readiness Probe用）
   * GET /health/ready
   */
  router.get('/ready', async (req: Request, res: Response) => {
    try {
      // 必須依存関係の準備状態チェック
      const isDatabaseReady = databaseService.isHealthy();
      const isRedisReady = redisService.isHealthy();

      const ready = {
        status: isDatabaseReady && isRedisReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        checks: {
          database: isDatabaseReady ? 'ready' : 'not_ready',
          redis: isRedisReady ? 'ready' : 'not_ready'
        }
      };

      const statusCode = ready.status === 'ready' ? 200 : 503;
      res.status(statusCode).json(ready);

    } catch (error) {
      logger.error('Readiness check failed', error as Error);
      
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        error: (error as Error).message
      });
    }
  });

  /**
   * 生存確認（Kubernetes Liveness Probe用）
   * GET /health/live
   */
  router.get('/live', (req: Request, res: Response) => {
    // 基本的な生存確認のみ（依存関係は確認しない）
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      version: '2.1.0',
      uptime: process.uptime()
    });
  });

  /**
   * 依存関係個別チェック
   * GET /health/dependencies/:service
   */
  router.get('/dependencies/:service', async (req: Request, res: Response) => {
    const { service } = req.params;

    try {
      let result;

      switch (service) {
        case 'database':
          result = await databaseService.healthCheck();
          break;
        case 'redis':
          result = await redisService.healthCheck();
          break;
        default:
          return res.status(404).json({
            error: 'Unknown dependency service',
            availableServices: ['database', 'redis']
          });
      }

      const statusCode = result.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        service,
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error(`Dependency check failed for ${service}`, error as Error);
      
      res.status(503).json({
        service,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
    }
  });

  return router;
}

export default healthRoutes;