/**
 * Kiro OSS Map v2.1.0 - 検索API
 * 基本検索・オートコンプリート機能
 */

import { Router, Request, Response } from 'express';
import { SearchService } from '../services/search.js';
import { MetricsCollector } from '../middleware/metrics.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * 検索ルーター作成
 */
export function searchRoutes(
  searchService: SearchService,
  metricsCollector: MetricsCollector,
  logger: Logger
): Router {
  const router = Router();

  /**
   * 基本検索
   * GET /search?q=query&limit=10&offset=0&type=place
   */
  router.get('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { q: query, limit, offset, type, bounds } = req.query;

      if (!query || typeof query !== 'string') {
        metricsCollector.recordRequest('search', Date.now() - startTime, 400);
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QUERY',
            message: 'Query parameter is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info('Search request', { query, limit, offset, type });

      const options = {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        type: type as string,
        bounds: bounds ? JSON.parse(bounds as string) : undefined
      };

      const results = await searchService.search(query, options);

      metricsCollector.recordRequest('search', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          query,
          results,
          count: results.length,
          options
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Search failed', error as Error);
      metricsCollector.recordRequest('search', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Search request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * オートコンプリート
   * GET /search/autocomplete?q=query&limit=5
   */
  router.get('/autocomplete', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { q: query, limit } = req.query;

      if (!query || typeof query !== 'string') {
        metricsCollector.recordRequest('autocomplete', Date.now() - startTime, 400);
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QUERY',
            message: 'Query parameter is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.debug('Autocomplete request', { query, limit });

      const limitNum = limit ? parseInt(limit as string, 10) : 5;
      const suggestions = await searchService.autocomplete(query, limitNum);

      metricsCollector.recordRequest('autocomplete', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          query,
          suggestions,
          count: suggestions.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Autocomplete failed', error as Error);
      metricsCollector.recordRequest('autocomplete', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'AUTOCOMPLETE_ERROR',
          message: 'Autocomplete request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * 検索統計
   * GET /search/stats
   */
  router.get('/stats', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      logger.debug('Getting search statistics');

      const stats = await searchService.getStats();

      metricsCollector.recordRequest('search_stats', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get search statistics', error as Error);
      metricsCollector.recordRequest('search_stats', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get search statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return router;
}