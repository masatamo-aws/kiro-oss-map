/**
 * Kiro OSS Map v2.1.0 - 地図サービス設定
 * 環境変数ベースの設定管理
 */

import { config as dotenvConfig } from 'dotenv';
import { ServiceConfig, Environment, RedisConfig } from '../../../shared/types/common.js';

// 環境変数読み込み
dotenvConfig();

/**
 * ストレージ設定
 */
export interface StorageConfig {
  type: 'local' | 's3' | 'gcs';
  local?: {
    basePath: string;
    tilesPath: string;
    stylesPath: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  };
  gcs?: {
    bucket: string;
    keyFilename: string;
    projectId: string;
  };
}

/**
 * タイル設定
 */
export interface TileConfig {
  formats: string[];
  maxZoom: number;
  minZoom: number;
  tileSize: number;
  defaultFormat: string;
  quality: {
    jpeg: number;
    webp: number;
  };
  cache: {
    ttl: number;
    maxSize: string;
  };
}

/**
 * CDN設定
 */
export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'gcp';
  baseUrl?: string;
  purgeApiKey?: string;
  zoneId?: string;
}

/**
 * 地図サービス設定
 */
export interface MapServiceConfig extends ServiceConfig {
  storage: StorageConfig;
  tiles: TileConfig;
  cdn: CDNConfig;
  cors: {
    allowedOrigins: string[];
  };
  processing: {
    maxConcurrentJobs: number;
    timeoutMs: number;
  };
}

/**
 * 環境変数から設定を構築
 */
function createConfig(): MapServiceConfig {
  const environment = (process.env.NODE_ENV as Environment) || Environment.DEVELOPMENT;
  
  return {
    name: 'map-service',
    version: '2.1.0',
    port: parseInt(process.env.PORT || '3002', 10),
    environment,

    // Redis設定
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DATABASE || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'map:'
    },

    // ストレージ設定
    storage: {
      type: (process.env.STORAGE_TYPE as 'local' | 's3' | 'gcs') || 'local',
      local: {
        basePath: process.env.STORAGE_LOCAL_BASE_PATH || './data',
        tilesPath: process.env.STORAGE_LOCAL_TILES_PATH || './data/tiles',
        stylesPath: process.env.STORAGE_LOCAL_STYLES_PATH || './data/styles'
      },
      s3: {
        bucket: process.env.S3_BUCKET || '',
        region: process.env.S3_REGION || 'us-east-1',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        endpoint: process.env.S3_ENDPOINT
      },
      gcs: {
        bucket: process.env.GCS_BUCKET || '',
        keyFilename: process.env.GCS_KEY_FILENAME || '',
        projectId: process.env.GCS_PROJECT_ID || ''
      }
    },

    // タイル設定
    tiles: {
      formats: (process.env.TILE_FORMATS || 'png,jpg,webp').split(','),
      maxZoom: parseInt(process.env.TILE_MAX_ZOOM || '18', 10),
      minZoom: parseInt(process.env.TILE_MIN_ZOOM || '0', 10),
      tileSize: parseInt(process.env.TILE_SIZE || '256', 10),
      defaultFormat: process.env.TILE_DEFAULT_FORMAT || 'png',
      quality: {
        jpeg: parseInt(process.env.TILE_JPEG_QUALITY || '85', 10),
        webp: parseInt(process.env.TILE_WEBP_QUALITY || '80', 10)
      },
      cache: {
        ttl: parseInt(process.env.TILE_CACHE_TTL || '86400', 10), // 24時間
        maxSize: process.env.TILE_CACHE_MAX_SIZE || '1GB'
      }
    },

    // CDN設定
    cdn: {
      enabled: process.env.CDN_ENABLED === 'true',
      provider: (process.env.CDN_PROVIDER as 'cloudflare' | 'aws' | 'gcp') || 'cloudflare',
      baseUrl: process.env.CDN_BASE_URL,
      purgeApiKey: process.env.CDN_PURGE_API_KEY,
      zoneId: process.env.CDN_ZONE_ID
    },

    // CORS設定
    cors: {
      allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'https://kiro-map.com',
        'https://*.kiro-map.com'
      ]
    },

    // 処理設定
    processing: {
      maxConcurrentJobs: parseInt(process.env.PROCESSING_MAX_CONCURRENT_JOBS || '4', 10),
      timeoutMs: parseInt(process.env.PROCESSING_TIMEOUT_MS || '30000', 10)
    },

    // 監視設定
    monitoring: {
      prometheus: {
        enabled: process.env.PROMETHEUS_ENABLED !== 'false',
        port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
        path: process.env.PROMETHEUS_PATH || '/metrics'
      },
      jaeger: {
        enabled: process.env.JAEGER_ENABLED === 'true',
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
      }
    }
  };
}

/**
 * 設定検証
 */
function validateConfig(config: MapServiceConfig): void {
  const errors: string[] = [];

  // ストレージ設定チェック
  if (config.storage.type === 's3') {
    if (!config.storage.s3?.bucket) {
      errors.push('S3_BUCKET must be set when using S3 storage');
    }
    if (!config.storage.s3?.accessKeyId || !config.storage.s3?.secretAccessKey) {
      errors.push('S3 credentials must be set when using S3 storage');
    }
  }

  if (config.storage.type === 'gcs') {
    if (!config.storage.gcs?.bucket) {
      errors.push('GCS_BUCKET must be set when using GCS storage');
    }
    if (!config.storage.gcs?.keyFilename) {
      errors.push('GCS_KEY_FILENAME must be set when using GCS storage');
    }
  }

  // タイル設定チェック
  if (config.tiles.maxZoom < config.tiles.minZoom) {
    errors.push('TILE_MAX_ZOOM must be greater than or equal to TILE_MIN_ZOOM');
  }

  if (config.tiles.maxZoom > 22) {
    errors.push('TILE_MAX_ZOOM cannot exceed 22');
  }

  // CDN設定チェック
  if (config.cdn.enabled) {
    if (!config.cdn.baseUrl) {
      errors.push('CDN_BASE_URL must be set when CDN is enabled');
    }
  }

  // 本番環境での追加チェック
  if (config.environment === Environment.PRODUCTION) {
    if (config.storage.type === 'local') {
      console.warn('Using local storage in production - consider using S3 or GCS');
    }

    if (!config.cdn.enabled) {
      console.warn('CDN is disabled in production - consider enabling for better performance');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// 設定作成と検証
export const config = createConfig();
validateConfig(config);

// 開発環境でのデバッグ情報
if (config.environment === Environment.DEVELOPMENT) {
  console.log('Map Service Configuration:', {
    name: config.name,
    version: config.version,
    port: config.port,
    environment: config.environment,
    storage: {
      type: config.storage.type,
      ...(config.storage.type === 'local' && {
        basePath: config.storage.local?.basePath
      })
    },
    redis: {
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      database: config.redis?.database || 0
    },
    tiles: {
      formats: config.tiles.formats,
      maxZoom: config.tiles.maxZoom,
      defaultFormat: config.tiles.defaultFormat
    }
  });
}