/**
 * Kiro OSS Map v2.1.0 - メトリクスAPI
 * Prometheus形式メトリクス出力・監視データ提供
 */

import { Router, Request, Response } from 'express';
import { MetricsCollector } from '../middleware/metrics.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * メトリクスルーター作成
 */
export function metricsRoutes(
  metricsCollector: MetricsCollector,
  logger: Logger
): Router {
  const router = Router();

  /**
   * Prometheusメトリクス出力
   * GET /metrics
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      logger.debug('Generating Prometheus metrics');

      const metrics = await metricsCollector.getPrometheusMetrics();

      res.set({
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.send(metrics);

    } catch (error) {
      logger.error('Failed to generate metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to generate metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * JSON形式メトリクス出力
   * GET /metrics/json
   */
  router.get('/json', async (req: Request, res: Response) => {
    try {
      logger.debug('Generating JSON metrics');

      const metrics = await metricsCollector.getJSONMetrics();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to generate JSON metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to generate JSON metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * サービス統計情報
   * GET /metrics/stats
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      logger.debug('Getting service statistics');

      const stats = await metricsCollector.getServiceStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get service statistics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get service statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * パフォーマンス情報
   * GET /metrics/performance
   */
  router.get('/performance', async (req: Request, res: Response) => {
    try {
      logger.debug('Getting performance metrics');

      const performance = await metricsCollector.getPerformanceMetrics();

      res.json({
        success: true,
        data: performance,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get performance metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_ERROR',
          message: 'Failed to get performance metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * エラー統計情報
   * GET /metrics/errors
   */
  router.get('/errors', async (req: Request, res: Response) => {
    try {
      logger.debug('Getting error statistics');

      const errors = await metricsCollector.getErrorStats();

      res.json({
        success: true,
        data: errors,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get error statistics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'ERROR_STATS_ERROR',
          message: 'Failed to get error statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * リアルタイム統計情報
   * GET /metrics/realtime
   */
  router.get('/realtime', async (req: Request, res: Response) => {
    try {
      logger.debug('Getting realtime metrics');

      const realtime = await metricsCollector.getRealtimeMetrics();

      res.json({
        success: true,
        data: realtime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get realtime metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'REALTIME_ERROR',
          message: 'Failed to get realtime metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * メトリクスリセット（開発・テスト用）
   * POST /metrics/reset
   */
  router.post('/reset', async (req: Request, res: Response) => {
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

      logger.info('Resetting metrics');

      await metricsCollector.reset();

      res.json({
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to reset metrics', error as Error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_ERROR',
          message: 'Failed to reset metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return router;
}