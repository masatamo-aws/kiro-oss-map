/**
 * Kiro OSS Map v2.1.0 - 検索サービス メトリクスAPI
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

  return router;
}