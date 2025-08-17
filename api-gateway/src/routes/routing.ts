/**
 * Routing API routes for Kiro OSS Map API Gateway
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';

const router = Router();

// Calculate route
router.post('/calculate',
  requirePermission('routing:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { origin, destination, profile = 'driving' } = req.body;

    // Validate required parameters
    if (!origin || !destination) {
      throw new ValidationError('Origin and destination are required');
    }

    // Validate coordinates
    validateCoordinates(origin, 'origin');
    validateCoordinates(destination, 'destination');

    // Mock route calculation
    const mockRoute = {
      geometry: {
        type: 'LineString',
        coordinates: [origin, destination]
      },
      distance: 5420.3, // meters
      duration: 1234.5, // seconds
      steps: [
        {
          geometry: {
            type: 'LineString',
            coordinates: [origin, destination]
          },
          maneuver: {
            type: 'depart',
            instruction: 'Head north',
            bearing_after: 0,
            location: origin
          },
          distance: 5420.3,
          duration: 1234.5,
          name: 'Sample Street'
        }
      ]
    };

    res.json({
      routes: [mockRoute],
      waypoints: [
        { location: origin, name: 'Origin' },
        { location: destination, name: 'Destination' }
      ],
      code: 'Ok'
    });
  })
);

// Get route profiles
router.get('/profiles',
  requirePermission('routing:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const profiles = [
      {
        id: 'driving',
        name: '自動車',
        description: '自動車での最適ルート',
        icon: '🚗'
      },
      {
        id: 'walking',
        name: '徒歩',
        description: '歩行者向けルート',
        icon: '🚶'
      }
    ];

    res.json({
      profiles,
      total: profiles.length
    });
  })
);

// Helper functions
function validateCoordinates(coords: any, fieldName: string): void {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) {
    throw new ValidationError(`${fieldName} must be an array of [longitude, latitude]`);
  }

  const [lng, lat] = coords;
  
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    throw new ValidationError(`${fieldName} coordinates must be numbers`);
  }

  if (lat < -90 || lat > 90) {
    throw new ValidationError(`${fieldName} latitude must be between -90 and 90`);
  }

  if (lng < -180 || lng > 180) {
    throw new ValidationError(`${fieldName} longitude must be between -180 and 180`);
  }
}

export { router as routingRoutes };