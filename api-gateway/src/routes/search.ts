/**
 * Search API routes for Kiro OSS Map API Gateway
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';

const router = Router();

// Geocoding search
router.get('/geocode',
  requirePermission('search:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = 10 } = req.query;

    if (!q) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter "q" is required',
        example: '/api/v2/search/geocode?q=Tokyo Station'
      });
      return;
    }

    const query = q as string;
    const resultLimit = Math.min(parseInt(limit as string) || 10, 50);

    // Mock geocoding results
    const results = [
      {
        id: '1',
        name: '東京駅',
        address: '東京都千代田区丸の内1丁目',
        coordinates: {
          latitude: 35.6812,
          longitude: 139.7671
        },
        category: 'station',
        importance: 0.9

// エラー処理ミドルウェア
const handleAsyncError = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 共通エラーレスポンス
const sendErrorResponse = (res: Response, statusCode: number, message: string, details?: any) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString()
  });
};
      }
    ];

    res.json({
      query,
      results: results.slice(0, resultLimit),
      total: results.length,
      limit: resultLimit
    });
  })
);

// Reverse geocoding
router.get('/reverse',
  requirePermission('search:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      throw new ValidationError('Latitude and longitude parameters are required');
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ValidationError('Invalid latitude or longitude');
    }

    // Mock reverse geocoding result
    const result = {
      name: '東京都千代田区丸の内',
      address: '東京都千代田区丸の内1丁目',
      coordinates: {
        latitude,
        longitude
      }
    };

    res.json({
      coordinates: { latitude, longitude },
      result
    });
  })
);

// Autocomplete search
router.get('/autocomplete',
  requirePermission('search:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = 5 } = req.query;

    if (!q) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter "q" is required',
        example: '/api/v2/search/autocomplete?q=Tokyo'
      });
      return;
    }

    const query = q as string;
    const resultLimit = Math.min(parseInt(limit as string) || 5, 20);

    // Mock autocomplete suggestions
    const suggestions = ['東京駅', '東京タワー', '東京スカイツリー'];

    res.json({
      query,
      suggestions: suggestions.slice(0, resultLimit),
      total: suggestions.length
    });
  })
);

// Search categories
router.get('/categories',
  requirePermission('search:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const categories = [
      { id: 'restaurant', name: 'レストラン', icon: '🍽️' },
      { id: 'hotel', name: 'ホテル', icon: '🏨' },
      { id: 'station', name: '駅', icon: '🚉' }
    ];

    res.json({
      categories,
      total: categories.length
    });
  })
);

export { router as searchRoutes };