/**
 * Kiro OSS Map v2.1.0 - 認証サービス メトリクスルート
 * Prometheusメトリクス・サマリー・統計情報
 */

import { Router, Request, Response } from 'express';
import { MetricsCollector } from '../middleware/metrics';
import { Logger } from '../../../shared/utils/logger';

/**
 * メトリクスルート作成
 */
export function metricsRoutes(
  metricsCollector: MetricsCollector,
  logger: Logger
): Router {
  const router = Router();

  /**
   * Prometheusメトリクス
   * GET /metrics
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const metrics = await metricsCollector.getMetrics();
      
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.status(200).send(metrics);
      
      logger.debug('Prometheus metrics served');
    } catch (error) {
      logger.error('Failed to get Prometheus metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to retrieve metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * メトリクスサマリー（JSON形式）
   * GET /metrics/summary
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const summary = await metricsCollector.getMetricsSummary();
      
      res.status(200).json({
        success: true,
        data: summary,
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });
      
      logger.debug('Metrics summary served');
    } catch (error) {
      logger.error('Failed to get metrics summary', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_SUMMARY_ERROR',
          message: 'Failed to retrieve metrics summary',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * 認証統計
   * GET /metrics/auth
   */
  router.get('/auth', async (req: Request, res: Response) => {
    try {
      const summary = await metricsCollector.getMetricsSummary();
      const authMetrics = summary.metrics?.auth || {};
      
      const authStats = {
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        statistics: {
          loginAttempts: authMetrics.loginAttempts || {
            success: 0,
            failure: 0,
            successRate: '0%'
          },
          activeSessions: authMetrics.activeSessions || 0,
          // 追加の認証統計を計算
          totalAttempts: (authMetrics.loginAttempts?.success || 0) + 
                        (authMetrics.loginAttempts?.failure || 0),
          failureRate: authMetrics.loginAttempts?.failure && 
                      (authMetrics.loginAttempts.success + authMetrics.loginAttempts.failure) > 0 ?
                      ((authMetrics.loginAttempts.failure / 
                        (authMetrics.loginAttempts.success + authMetrics.loginAttempts.failure)) * 100).toFixed(2) + '%' : '0%'
        }
      };

      res.status(200).json({
        success: true,
        data: authStats,
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });
      
      logger.debug('Auth metrics served');
    } catch (error) {
      logger.error('Failed to get auth metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_METRICS_ERROR',
          message: 'Failed to retrieve auth metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * システム統計
   * GET /metrics/system
   */
  router.get('/system', async (req: Request, res: Response) => {
    try {
      const summary = await metricsCollector.getMetricsSummary();
      const systemMetrics = summary.metrics?.system || {};
      
      // 追加のシステム情報
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const systemStats = {
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        system: {
          uptime: systemMetrics.uptime || process.uptime(),
          memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
            // 使用率計算
            heapUsagePercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%'
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
            total: cpuUsage.user + cpuUsage.system
          },
          process: {
            pid: process.pid,
            ppid: process.ppid,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            title: process.title
          }
        }
      };

      res.status(200).json({
        success: true,
        data: systemStats,
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });
      
      logger.debug('System metrics served');
    } catch (error) {
      logger.error('Failed to get system metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_METRICS_ERROR',
          message: 'Failed to retrieve system metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * データベース統計
   * GET /metrics/database
   */
  router.get('/database', async (req: Request, res: Response) => {
    try {
      const summary = await metricsCollector.getMetricsSummary();
      const dbMetrics = summary.metrics?.database || {};
      
      const dbStats = {
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '2.1.0',
        database: {
          activeConnections: dbMetrics.activeConnections || 0,
          queryCount: dbMetrics.queryCount || 0,
          // 接続プール情報は実際のサービスから取得
          connectionPool: {
            status: 'available' // 実際の実装では DatabaseService から取得
          }
        }
      };

      res.status(200).json({
        success: true,
        data: dbStats,
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });
      
      logger.debug('Database metrics served');
    } catch (error) {
      logger.error('Failed to get database metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_METRICS_ERROR',
          message: 'Failed to retrieve database metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * メトリクスリセット（開発・テスト用）
   * POST /metrics/reset
   */
  router.post('/reset', (req: Request, res: Response) => {
    try {
      // 本番環境では無効化
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Metrics reset not allowed in production',
            timestamp: new Date().toISOString()
          }
        });
      }

      metricsCollector.reset();
      
      res.status(200).json({
        success: true,
        data: {
          message: 'Metrics reset successfully',
          timestamp: new Date().toISOString()
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });
      
      logger.info('Metrics reset');
    } catch (error) {
      logger.error('Failed to reset metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_RESET_ERROR',
          message: 'Failed to reset metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return router;
}

export default metricsRoutes;