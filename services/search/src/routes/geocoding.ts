/**
 * Kiro OSS Map v2.1.0 - ジオコーディングAPI
 * 住所⇔座標変換機能
 */

import { Router, Request, Response } from 'express';
import { GeocodingService } from '../services/geocoding.js';
import { MetricsCollector } from '../middleware/metrics.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * ジオコーディングルーター作成
 */
export function geocodingRoutes(
  geocodingService: GeocodingService,
  metricsCollector: MetricsCollector,
  logger: Logger
): Router {
  const router = Router();

  /**
   * ジオコーディング（住所→座標）
   * GET /geocoding?address=Tokyo Station
   */
  router.get('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { address } = req.query;

      if (!address || typeof address !== 'string') {
        metricsCollector.recordRequest('geocoding', Date.now() - startTime, 400);
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ADDRESS',
            message: 'Address parameter is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info('Geocoding request', { address });

      const results = await geocodingService.geocode(address);

      metricsCollector.recordRequest('geocoding', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          address,
          results,
          count: results.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Geocoding failed', error as Error);
      metricsCollector.recordRequest('geocoding', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'GEOCODING_ERROR',
          message: 'Geocoding request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * 逆ジオコーディング（座標→住所）
   * GET /geocoding/reverse?lat=35.6812&lng=139.7671
   */
  router.get('/reverse', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        metricsCollector.recordRequest('reverse_geocoding', Date.now() - startTime, 400);
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
        metricsCollector.recordRequest('reverse_geocoding', Date.now() - startTime, 400);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COORDINATES',
            message: 'Invalid latitude or longitude values',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info('Reverse geocoding request', { lat: latitude, lng: longitude });

      const results = await geocodingService.reverseGeocode(latitude, longitude);

      metricsCollector.recordRequest('reverse_geocoding', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          location: { lat: latitude, lng: longitude },
          results,
          count: results.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Reverse geocoding failed', error as Error);
      metricsCollector.recordRequest('reverse_geocoding', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'REVERSE_GEOCODING_ERROR',
          message: 'Reverse geocoding request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * ジオコーディング統計
   * GET /geocoding/stats
   */
  router.get('/stats', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      logger.debug('Getting geocoding statistics');

      const stats = await geocodingService.getStats();

      metricsCollector.recordRequest('geocoding_stats', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get geocoding statistics', error as Error);
      metricsCollector.recordRequest('geocoding_stats', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get geocoding statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return router;
}