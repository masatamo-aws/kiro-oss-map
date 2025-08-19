/**
 * Kiro OSS Map v2.1.0 - Redis サービス
 * キャッシュ・セッション管理
 */

import { createClient, RedisClientType } from 'redis';
import { RedisConfig } from '../config/index.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * Redis サービス
 */
export class RedisService {
  private client: RedisClientType | null = null;
  private config: RedisConfig;
  private logger: Logger;

  constructor(config: RedisConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Redis接続
   */
  async connect(): Promise<void> {
    try {
      const options = {
        socket: {
          host: this.config.host,
          port: this.config.port
        },
        password: this.config.password,
        database: this.config.database
      };

      this.client = createClient(options);

      this.client.on('error', (error) => {
        this.logger.error('Redis client error', error);
      });

      this.client.on('connect', () => {
        this.logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        this.logger.info('Redis client ready');
      });

      this.client.on('end', () => {
        this.logger.info('Redis client disconnected');
      });

      await this.client.connect();
      await this.client.ping();

      this.logger.info('Redis connected successfully', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database
      });

    } catch (error) {
      this.logger.error('Failed to connect to Redis', error as Error);
      // 開発環境では接続エラーを許容
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Redis connection failed - running in mock mode');
        this.client = null;
      } else {
        throw error;
      }
    }
  }

  /**
   * Redis切断
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.logger.info('Redis disconnected');
    }
  }

  /**
   * ヘルスチェック
   */
  async ping(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }

    await this.client.ping();
  }

  /**
   * キー設定
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) {
      this.logger.warn('Redis not connected - skipping set operation');
      return;
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    
    if (ttl) {
      await this.client.setEx(fullKey, ttl, value);
    } else {
      await this.client.set(fullKey, value);
    }
  }

  /**
   * キー取得
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) {
      this.logger.warn('Redis not connected - returning null');
      return null;
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    return await this.client.get(fullKey);
  }

  /**
   * キー削除
   */
  async del(key: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Redis not connected - skipping delete operation');
      return;
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    await this.client.del(fullKey);
  }

  /**
   * キー存在確認
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    const result = await this.client.exists(fullKey);
    return result === 1;
  }

  /**
   * TTL設定
   */
  async expire(key: string, ttl: number): Promise<void> {
    if (!this.client) {
      this.logger.warn('Redis not connected - skipping expire operation');
      return;
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    await this.client.expire(fullKey, ttl);
  }

  /**
   * 統計情報取得
   */
  async getStats(): Promise<any> {
    if (!this.client) {
      return {
        status: 'disconnected',
        memory: 0,
        keys: 0
      };
    }

    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbSize();
      
      return {
        status: 'connected',
        memory: this.parseMemoryInfo(info),
        keys: dbSize
      };
    } catch (error) {
      this.logger.error('Failed to get Redis stats', error as Error);
      return {
        status: 'error',
        error: (error as Error).message
      };
    }
  }

  /**
   * メモリ情報解析
   */
  private parseMemoryInfo(info: string): number {
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}