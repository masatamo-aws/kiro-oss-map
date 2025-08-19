/**
 * Kiro OSS Map v2.1.0 - POI検索API
 * Point of Interest 検索・カテゴリ管理
 */

import { Router, Request, Response } from 'express';
import { POIService } from '../services/poi.js';
import { MetricsCollector } from '../middleware/metrics.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * POIルーター作成
 */
export function poiRoutes(
  poiService: POIService,
  metricsCollector: MetricsCollector,
  logger: Logger
): Router {
  const router = Router();

  /**
   * POI検索
   * GET /poi?lat=35.6812&lng=139.7671&category=restaurant&radius=1000&limit=10
   */
  router.get('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { lat, lng, category, radius, limit, minRating, priceLevel, openNow } = req.query;

      if (!lat || !lng) {
        metricsCollector.recordRequest('poi_search', Date.now() - startTime, 400);
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_COORDINATES',
            message: 'Latitude and longitude parameters are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        metricsCollector.recordRequest('poi_search', Date.now() - startTime, 400);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COORDINATES',
            message: 'Invalid latitude or longitude values',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info('POI search request', { lat: latitude, lng: longitude, category });

      const options = {
        category: category as string,
        radius: radius ? parseInt(radius as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        priceLevel: priceLevel ? parseInt(priceLevel as string, 10) : undefined,
        openNow: openNow === 'true'
      };

      const results = await poiService.searchPOI(latitude, longitude, options);

      metricsCollector.recordRequest('poi_search', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          location: { lat: latitude, lng: longitude },
          options,
          results,
          count: results.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('POI search failed', error as Error);
      metricsCollector.recordRequest('poi_search', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'POI_SEARCH_ERROR',
          message: 'POI search request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * カテゴリ別POI検索
   * GET /poi/category/:category?lat=35.6812&lng=139.7671&radius=5000
   */
  router.get('/category/:category', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { category } = req.params;
      const { lat, lng, radius } = req.query;

      logger.info('Category POI search request', { category, lat, lng, radius });

      const latitude = lat ? parseFloat(lat as string) : undefined;
      const longitude = lng ? parseFloat(lng as string) : undefined;
      const searchRadius = radius ? parseInt(radius as string, 10) : 5000;

      const results = await poiService.searchByCategory(
        category,
        latitude,
        longitude,
        searchRadius
      );

      metricsCollector.recordRequest('poi_category_search', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          category,
          location: latitude && longitude ? { lat: latitude, lng: longitude } : null,
          radius: searchRadius,
          results,
          count: results.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Category POI search failed', error as Error);
      metricsCollector.recordRequest('poi_category_search', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'POI_CATEGORY_SEARCH_ERROR',
          message: 'Category POI search request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * POI詳細取得
   * GET /poi/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { id } = req.params;

      logger.info('POI details request', { id });

      const result = await poiService.getPOIDetails(id);

      if (!result) {
        metricsCollector.recordRequest('poi_details', Date.now() - startTime, 404);
        return res.status(404).json({
          success: false,
          error: {
            code: 'POI_NOT_FOUND',
            message: `POI not found: ${id}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      metricsCollector.recordRequest('poi_details', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('POI details request failed', error as Error);
      metricsCollector.recordRequest('poi_details', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'POI_DETAILS_ERROR',
          message: 'POI details request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * POIカテゴリ一覧
   * GET /poi/categories
   */
  router.get('/categories', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      logger.debug('Getting POI categories');

      const categories = await poiService.getCategories();

      metricsCollector.recordRequest('poi_categories', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          categories,
          count: categories.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get POI categories', error as Error);
      metricsCollector.recordRequest('poi_categories', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'POI_CATEGORIES_ERROR',
          message: 'Failed to get POI categories',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * POI統計
   * GET /poi/stats
   */
  router.get('/stats', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      logger.debug('Getting POI statistics');

      const stats = await poiService.getStats();

      metricsCollector.recordRequest('poi_stats', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get POI statistics', error as Error);
      metricsCollector.recordRequest('poi_stats', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get POI statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return router;
}