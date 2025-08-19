/**
 * Kiro OSS Map v2.1.0 - 検索サービス ヘルスチェックAPI
 * サービス状態監視・診断機能
 */

import { Router, Request, Response } from 'express';
import { SearchService } from '../services/search.js';
import { GeocodingService } from '../services/geocoding.js';
import { POIService } from '../services/poi.js';
import { ElasticsearchService } from '../services/elasticsearch.js';
import { RedisService } from '../services/redis.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * ヘルスチェック結果インターface
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      error?: string;
      details?: any;
    };
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

/**
 * ヘルスチェックルーター作成
 */
export function healthRoutes(
  searchService: SearchService,
  geocodingService: GeocodingService,
  poiService: POIService,
  elasticsearchService: ElasticsearchService,
  redisService: RedisService,
  logger: Logger
): Router {
  const router = Router();
  const startTime = Date.now();

  /**
   * 基本ヘルスチェック
   * GET /health
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const health = await performHealthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);

    } catch (error) {
      logger.error('Health check failed', error as Error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        error: 'Health check failed',
        services: {},
        system: {
          memory: { used: 0, total: 0, percentage: 0 },
          cpu: { usage: 0 }
        }
      });
    }
  });

  /**
   * 詳細ヘルスチェック
   * GET /health/detailed
   */
  router.get('/detailed', async (req: Request, res: Response) => {
    try {
      const health = await performDetailedHealthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);

    } catch (error) {
      logger.error('Detailed health check failed', error as Error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        error: 'Detailed health check failed',
        services: {},
        system: {
          memory: { used: 0, total: 0, percentage: 0 },
          cpu: { usage: 0 }
        }
      });
    }
  });

  /**
   * Liveness Probe (Kubernetes用)
   * GET /health/live
   */
  router.get('/live', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000)
    });
  });

  /**
   * Readiness Probe (Kubernetes用)
   * GET /health/ready
   */
  router.get('/ready', async (req: Request, res: Response) => {
    try {
      // 重要なサービスの準備状態をチェック
      const checks = await Promise.allSettled([
        checkRedisHealth(),
        checkElasticsearchHealth()
      ]);

      const allReady = checks.every(result => 
        result.status === 'fulfilled' && result.value.status === 'up'
      );

      if (allReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - startTime) / 1000)
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - startTime) / 1000),
          checks: checks.map((result, index) => ({
            service: ['redis', 'elasticsearch'][index],
            status: result.status === 'fulfilled' ? result.value.status : 'down',
            error: result.status === 'rejected' ? result.reason.message : undefined
          }))
        });
      }

    } catch (error) {
      logger.error('Readiness check failed', error as Error);
      
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        error: 'Readiness check failed'
      });
    }
  });

  /**
   * 基本ヘルスチェック実行
   */
  async function performHealthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      checkRedisHealth(),
      checkElasticsearchHealth()
    ]);

    const services: HealthStatus['services'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Redis チェック結果
    const redisResult = checks[0];
    if (redisResult.status === 'fulfilled') {
      services.redis = redisResult.value;
      if (redisResult.value.status === 'down') {
        overallStatus = 'degraded';
      }
    } else {
      services.redis = {
        status: 'down',
        error: redisResult.reason.message
      };
      overallStatus = 'degraded';
    }

    // Elasticsearch チェック結果
    const elasticsearchResult = checks[1];
    if (elasticsearchResult.status === 'fulfilled') {
      services.elasticsearch = elasticsearchResult.value;
      if (elasticsearchResult.value.status === 'down') {
        overallStatus = 'degraded';
      }
    } else {
      services.elasticsearch = {
        status: 'down',
        error: elasticsearchResult.reason.message
      };
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services,
      system: getSystemInfo()
    };
  }

  /**
   * 詳細ヘルスチェック実行
   */
  async function performDetailedHealthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      checkRedisHealth(),
      checkElasticsearchHealth(),
      checkSearchServiceHealth(),
      checkGeocodingServiceHealth(),
      checkPOIServiceHealth()
    ]);

    const services: HealthStatus['services'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    const serviceNames = ['redis', 'elasticsearch', 'search', 'geocoding', 'poi'];
    
    checks.forEach((result, index) => {
      const serviceName = serviceNames[index];
      
      if (result.status === 'fulfilled') {
        services[serviceName] = result.value;
        if (result.value.status === 'down') {
          overallStatus = index < 2 ? 'degraded' : 'degraded';
        }
      } else {
        services[serviceName] = {
          status: 'down',
          error: result.reason.message
        };
        overallStatus = index < 2 ? 'degraded' : 'degraded';
      }
    });

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services,
      system: getSystemInfo()
    };
  }

  /**
   * Redis ヘルスチェック
   */
  async function checkRedisHealth() {
    const start = Date.now();
    
    try {
      await redisService.ping();
      
      return {
        status: 'up' as const,
        responseTime: Date.now() - start,
        details: {
          connected: true
        }
      };
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  /**
   * Elasticsearch ヘルスチェック
   */
  async function checkElasticsearchHealth() {
    const start = Date.now();
    
    try {
      await elasticsearchService.healthCheck();
      
      return {
        status: 'up' as const,
        responseTime: Date.now() - start,
        details: {
          connected: true
        }
      };
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  /**
   * Search Service ヘルスチェック
   */
  async function checkSearchServiceHealth() {
    const start = Date.now();
    
    try {
      const stats = await searchService.getStats();
      
      return {
        status: 'up' as const,
        responseTime: Date.now() - start,
        details: stats
      };
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  /**
   * Geocoding Service ヘルスチェック
   */
  async function checkGeocodingServiceHealth() {
    const start = Date.now();
    
    try {
      const stats = await geocodingService.getStats();
      
      return {
        status: 'up' as const,
        responseTime: Date.now() - start,
        details: stats
      };
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  /**
   * POI Service ヘルスチェック
   */
  async function checkPOIServiceHealth() {
    const start = Date.now();
    
    try {
      const stats = await poiService.getStats();
      
      return {
        status: 'up' as const,
        responseTime: Date.now() - start,
        details: stats
      };
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        error: (error as Error).message
      };
    }
  }

  /**
   * システム情報取得
   */
  function getSystemInfo() {
    const memUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000 // マイクロ秒を秒に変換
      }
    };
  }

  return router;
}