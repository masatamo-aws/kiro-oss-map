/**
 * Health check routes for Kiro OSS Map API Gateway
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { databaseService } from '../services/database';
import { redisService } from '../services/redis';

const router = Router();

// Basic health check
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    service: 'kiro-map-api-gateway',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(healthCheck);
}));

// Detailed health check
router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalAPIs: await checkExternalAPIs()
  };

  const allHealthy = Object.values(checks).every(check => check.status === 'ok');
  const status = allHealthy ? 'healthy' : 'degraded';

  res.status(allHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    service: 'kiro-map-api-gateway',
    services: checks
  });
}));

// Database health check
async function checkDatabase(): Promise<{ status: string; responseTime?: number; error?: string; connectionCount?: number }> {
  try {
    const result = await databaseService.healthCheck();
    return {
      status: result.status,
      responseTime: result.responseTime,
      error: result.error,
      connectionCount: result.connectionCount
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Redis health check
async function checkRedis(): Promise<{ status: string; responseTime?: number; error?: string; memoryUsage?: string; connectedClients?: number }> {
  try {
    const result = await redisService.healthCheck();
    return {
      status: result.status,
      responseTime: result.responseTime,
      error: result.error,
      memoryUsage: result.memoryUsage,
      connectedClients: result.connectedClients
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// External APIs health check
async function checkExternalAPIs(): Promise<{ status: string; apis?: any; error?: string }> {
  try {
    // In development/test environment, mock the external API checks
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return {
        status: 'ok',
        apis: {
          nominatim: { status: 'ok', responseTime: 50, note: 'mocked in development' },
          osrm: { status: 'ok', responseTime: 30, note: 'mocked in development' },
          mapTiles: { status: 'ok', responseTime: 25, note: 'mocked in development' }
        }
      };
    }

    // In production, perform actual health checks with timeout
    const apis = await Promise.allSettled([
      checkAPIWithTimeout('https://nominatim.openstreetmap.org/status', 'nominatim'),
      checkAPIWithTimeout('https://router.project-osrm.org/health', 'osrm'),
      checkAPIWithTimeout('https://tile.openstreetmap.org/0/0/0.png', 'mapTiles')
    ]);

    const results: any = {};
    apis.forEach((result, index) => {
      const names = ['nominatim', 'osrm', 'mapTiles'];
      if (result.status === 'fulfilled') {
        results[names[index]] = result.value;
      } else {
        results[names[index]] = { status: 'error', error: 'timeout or connection failed' };
      }
    });

    const allHealthy = Object.values(results).every((api: any) => api.status === 'ok');
    
    return {
      status: allHealthy ? 'ok' : 'degraded',
      apis: results
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Generic API health check with timeout
async function checkAPIWithTimeout(url: string, name: string): Promise<{ status: string; responseTime?: number; name: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const start = Date.now();
    const response = await fetch(url, { 
      method: 'HEAD', // Use HEAD to reduce bandwidth
      signal: controller.signal,
      headers: {
        'User-Agent': 'Kiro-OSS-Map-HealthCheck/2.0.0'
      }
    });
    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;
    
    return {
      name,
      status: response.ok ? 'ok' : 'error',
      responseTime
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      name,
      status: 'error',
      responseTime: 5000 // timeout duration
    };
  }
}

// Legacy function for backward compatibility
async function checkAPI(url: string): Promise<{ status: string; responseTime?: number }> {
  const result = await checkAPIWithTimeout(url, 'legacy');
  return {
    status: result.status,
    responseTime: result.responseTime
  };
}

export { router as healthRoutes };