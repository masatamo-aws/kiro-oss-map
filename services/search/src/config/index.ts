/**
 * Kiro OSS Map v2.1.0 - 検索サービス設定
 * 環境変数ベースの設定管理
 */

import { config as dotenvConfig } from 'dotenv';

// 環境変数読み込み
dotenvConfig();

/**
 * Elasticsearch設定
 */
export interface ElasticsearchConfig {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

/**
 * Redis設定
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  keyPrefix: string;
}

/**
 * 検索サービス設定
 */
export interface SearchServiceConfig {
  name: string;
  version: string;
  port: number;
  environment: string;
  elasticsearch: ElasticsearchConfig;
  redis: RedisConfig;
  cors: {
    allowedOrigins: string[];
  };
}

/**
 * 環境変数から設定を構築
 */
function createConfig(): SearchServiceConfig {
  return {
    name: 'search-service',
    version: '2.1.0',
    port: parseInt(process.env.PORT || '3003', 10),
    environment: process.env.NODE_ENV || 'development',

    // Elasticsearch設定
    elasticsearch: {
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_USERNAME ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD || ''
      } : undefined,
      tls: {
        rejectUnauthorized: process.env.ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED !== 'false'
      }
    },

    // Redis設定
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DATABASE || '1', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'search:'
    },

    // CORS設定
    cors: {
      allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'https://kiro-map.com',
        'https://*.kiro-map.com'
      ]
    }
  };
}

export const config = createConfig();

// 開発環境でのデバッグ情報
if (config.environment === 'development') {
  console.log('Search Service Configuration:', {
    name: config.name,
    version: config.version,
    port: config.port,
    environment: config.environment,
    elasticsearch: {
      node: config.elasticsearch.node
    },
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      database: config.redis.database
    }
  });
}