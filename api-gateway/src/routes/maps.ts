/**
 * Maps API routes for Kiro OSS Map API Gateway
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';

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

const router = Router();

// Get available map styles
router.get('/styles', 
  requirePermission('maps:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const styles = [
      {
        id: 'standard',
        name: 'Standard',
        description: 'Default OpenStreetMap style',
        previewUrl: 'https://api.kiro-map.com/v2/maps/styles/standard/preview.png',
        isDefault: true
      },
      {
        id: 'satellite',
        name: 'Satellite',
        description: 'Satellite imagery view',
        previewUrl: 'https://api.kiro-map.com/v2/maps/styles/satellite/preview.png',
        isDefault: false
      },
      {
        id: 'terrain',
        name: 'Terrain',
        description: 'Topographic terrain view',
        previewUrl: 'https://api.kiro-map.com/v2/maps/styles/terrain/preview.png',
        isDefault: false
      }
    ];

    res.json({
      styles,
      total: styles.length
    });
  })
);

// Get map style definition
router.get('/styles/:styleId',
  requirePermission('maps:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { styleId } = req.params;

    // TODO: Implement actual style serving
    const styleDefinition = getMapStyle(styleId);
    
    if (!styleDefinition) {
      res.status(404).json({
        error: 'Style not found',
        message: `Map style '${styleId}' does not exist`,
        availableStyles: ['standard', 'satellite', 'terrain']
      });
      return;
    }

    res.json(styleDefinition);
  })
);

// Get map tiles
router.get('/tiles/:z/:x/:y',
  requirePermission('maps:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { z, x, y } = req.params;

    // Validate tile coordinates
    const zoom = parseInt(z);
    const tileX = parseInt(x);
    const tileY = parseInt(y);

    if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
      throw new ValidationError('Invalid tile coordinates');
    }

    if (zoom < 0 || zoom > 18) {
      throw new ValidationError('Zoom level must be between 0 and 18');
    }

    // Mock tile response
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'X-Tile-Coordinates': `${z}/${x}/${y}`
    });

    // Return a simple response for testing
    res.status(200).send('Mock tile data');
  })
);

// Helper functions
function getMapStyle(styleId: string): any {
  const styles: Record<string, any> = {
    standard: {
      id: 'standard',
      name: 'Standard',
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://api.kiro-map.com/v2/maps/tiles/{z}/{x}/{y}?style=standard'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm'
        }
      ]
    }
  };

  return styles[styleId];
}

export { router as mapsRoutes };