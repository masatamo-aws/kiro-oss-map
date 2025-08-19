/**
 * Kiro OSS Map v2.1.0 - 地図サービス Redisサービス
 * タイルキャッシュ・スタイルキャッシュ・メタデータ管理
 */

import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { RedisConfig } from '../../../shared/types/common.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * Redis接続エラー
 */
export class RedisError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'RedisError';
  }
}

/**
 * タイルメタデータ
 */
export interface TileMetadata {
  format: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType: string;
  cacheHit?: boolean;
}

/**
 * スタイルメタデータ
 */
export interface StyleMetadata {
  id: string;
  name: string;
  version: string;
  lastModified: Date;
  size: number;
  checksum: string;
}

/**
 * 地図サービス用Redisサービス
 */
export class RedisService {
  private client: any = null;
  private isConnected = false;

  constructor(
    private config: RedisConfig,
    private logger: Logger
  ) {}

  /**
   * Redis接続
   */
  async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to Redis...');

      const options: RedisClientOptions = {
        socket: {
          host: this.config.host,
          port: this.config.port,
          connectTimeout: 10000
        },
        database: this.config.database || 0
      };

      if (this.config.password) {
        options.password = this.config.password;
      }

      this.client = createClient(options);

      // エラーハンドリング
      this.client.on('error', (error: any) => {
        this.logger.error('Redis client error', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.debug('Redis client connected');
      });

      this.client.on('ready', () => {
        this.logger.debug('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        this.logger.debug('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();

      // 接続テスト
      await this.client.ping();

      this.logger.info('Redis connected successfully', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database
      });

    } catch (error) {
      this.logger.error('Failed to connect to Redis', error as Error);
      throw new RedisError('Redis connection failed', error as Error);
    }
  }

  /**
   * Redis切断
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      this.logger.info('Disconnecting from Redis...');
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      this.logger.info('Redis disconnected');
    }
  }

  /**
   * キー生成（プレフィックス付き）
   */
  private getKey(key: string): string {
    const prefix = this.config.keyPrefix || 'map:';
    return `${prefix}${key}`;
  }

  /**
   * タイルキャッシュ保存
   */
  async cacheTile(
    z: number, 
    x: number, 
    y: number, 
    style: string, 
    format: string, 
    data: Buffer, 
    metadata: TileMetadata,
    ttlSeconds: number = 86400
  ): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const tileKey = this.getKey(`tile:${style}:${z}:${x}:${y}:${format}`);
      const metaKey = this.getKey(`tile_meta:${style}:${z}:${x}:${y}:${format}`);
      
      // タイルデータとメタデータを並列保存
      await Promise.all([
        this.client.setEx(tileKey, ttlSeconds, data),
        this.client.setEx(metaKey, ttlSeconds, JSON.stringify(metadata))
      ]);
      
      this.logger.debug('Tile cached', {
        z, x, y, style, format,
        size: data.length,
        ttl: ttlSeconds
      });
    } catch (error) {
      this.logger.error('Failed to cache tile', error as Error, { z, x, y, style, format });
      throw new RedisError('Tile cache failed', error as Error);
    }
  }

  /**
   * タイルキャッシュ取得
   */
  async getCachedTile(
    z: number, 
    x: number, 
    y: number, 
    style: string, 
    format: string
  ): Promise<{ data: Buffer; metadata: TileMetadata } | null> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const tileKey = this.getKey(`tile:${style}:${z}:${x}:${y}:${format}`);
      const metaKey = this.getKey(`tile_meta:${style}:${z}:${x}:${y}:${format}`);
      
      // タイルデータとメタデータを並列取得
      const [tileData, metaData] = await Promise.all([
        this.client.getBuffer(tileKey),
        this.client.get(metaKey)
      ]);
      
      if (!tileData || !metaData) {
        return null;
      }

      const metadata = JSON.parse(metaData) as TileMetadata;
      metadata.cacheHit = true;
      
      this.logger.debug('Tile cache hit', {
        z, x, y, style, format,
        size: tileData.length
      });

      return { data: tileData, metadata };
    } catch (error) {
      this.logger.error('Failed to get cached tile', error as Error, { z, x, y, style, format });
      throw new RedisError('Tile cache retrieval failed', error as Error);
    }
  }

  /**
   * タイルキャッシュ削除
   */
  async deleteCachedTile(z: number, x: number, y: number, style: string, format: string): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const tileKey = this.getKey(`tile:${style}:${z}:${x}:${y}:${format}`);
      const metaKey = this.getKey(`tile_meta:${style}:${z}:${x}:${y}:${format}`);
      
      await this.client.del([tileKey, metaKey]);
      
      this.logger.debug('Tile cache deleted', { z, x, y, style, format });
    } catch (error) {
      this.logger.error('Failed to delete cached tile', error as Error, { z, x, y, style, format });
      throw new RedisError('Tile cache deletion failed', error as Error);
    }
  }

  /**
   * スタイル範囲のタイルキャッシュ削除
   */
  async deleteCachedTilesForStyle(style: string): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const pattern = this.getKey(`tile:${style}:*`);
      const metaPattern = this.getKey(`tile_meta:${style}:*`);
      
      const [tileKeys, metaKeys] = await Promise.all([
        this.client.keys(pattern),
        this.client.keys(metaPattern)
      ]);
      
      const allKeys = [...tileKeys, ...metaKeys];
      
      if (allKeys.length > 0) {
        await this.client.del(allKeys);
        this.logger.info('Style tile cache cleared', {
          style,
          deletedKeys: allKeys.length
        });
      }
    } catch (error) {
      this.logger.error('Failed to delete style tile cache', error as Error, { style });
      throw new RedisError('Style tile cache deletion failed', error as Error);
    }
  }

  /**
   * スタイルメタデータ保存
   */
  async cacheStyleMetadata(styleId: string, metadata: StyleMetadata, ttlSeconds: number = 3600): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const key = this.getKey(`style_meta:${styleId}`);
      await this.client.setEx(key, ttlSeconds, JSON.stringify(metadata));
      
      this.logger.debug('Style metadata cached', {
        styleId,
        version: metadata.version,
        ttl: ttlSeconds
      });
    } catch (error) {
      this.logger.error('Failed to cache style metadata', error as Error, { styleId });
      throw new RedisError('Style metadata cache failed', error as Error);
    }
  }

  /**
   * スタイルメタデータ取得
   */
  async getCachedStyleMetadata(styleId: string): Promise<StyleMetadata | null> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const key = this.getKey(`style_meta:${styleId}`);
      const data = await this.client.get(key);
      
      if (!data) {
        return null;
      }

      const metadata = JSON.parse(data) as StyleMetadata;
      
      this.logger.debug('Style metadata cache hit', {
        styleId,
        version: metadata.version
      });

      return metadata;
    } catch (error) {
      this.logger.error('Failed to get cached style metadata', error as Error, { styleId });
      throw new RedisError('Style metadata cache retrieval failed', error as Error);
    }
  }

  /**
   * タイル統計記録
   */
  async recordTileRequest(style: string, z: number, format: string, cacheHit: boolean): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const statsKey = this.getKey(`stats:${date}`);
      
      const pipeline = this.client.multi();
      
      // 総リクエスト数
      pipeline.hIncrBy(statsKey, 'total_requests', 1);
      
      // スタイル別リクエスト数
      pipeline.hIncrBy(statsKey, `style:${style}`, 1);
      
      // ズームレベル別リクエスト数
      pipeline.hIncrBy(statsKey, `zoom:${z}`, 1);
      
      // フォーマット別リクエスト数
      pipeline.hIncrBy(statsKey, `format:${format}`, 1);
      
      // キャッシュヒット率
      if (cacheHit) {
        pipeline.hIncrBy(statsKey, 'cache_hits', 1);
      } else {
        pipeline.hIncrBy(statsKey, 'cache_misses', 1);
      }
      
      // 統計の有効期限設定（30日）
      pipeline.expire(statsKey, 30 * 24 * 3600);
      
      await pipeline.exec();
      
      this.logger.debug('Tile request recorded', {
        style, z, format, cacheHit, date
      });
    } catch (error) {
      this.logger.error('Failed to record tile request', error as Error, {
        style, z, format, cacheHit
      });
      // 統計記録の失敗は致命的ではないので例外を投げない
    }
  }

  /**
   * タイル統計取得
   */
  async getTileStats(date?: string): Promise<Record<string, string>> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const statsKey = this.getKey(`stats:${targetDate}`);
      
      const stats = await this.client.hGetAll(statsKey);
      
      this.logger.debug('Tile stats retrieved', {
        date: targetDate,
        statsCount: Object.keys(stats).length
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to get tile stats', error as Error, { date });
      throw new RedisError('Tile stats retrieval failed', error as Error);
    }
  }

  /**
   * 汎用キャッシュ設定
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const redisKey = this.getKey(key);
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setEx(redisKey, ttlSeconds, serializedValue);
      } else {
        await this.client.set(redisKey, serializedValue);
      }

      this.logger.debug('Cache set', { key, ttl: ttlSeconds });
    } catch (error) {
      this.logger.error('Failed to set cache', error as Error, { key });
      throw new RedisError('Cache set failed', error as Error);
    }
  }

  /**
   * 汎用キャッシュ取得
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const redisKey = this.getKey(key);
      const value = await this.client.get(redisKey);
      
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      this.logger.error('Failed to get cache', error as Error, { key });
      throw new RedisError('Cache get failed', error as Error);
    }
  }

  /**
   * キャッシュ削除
   */
  async delete(key: string): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const redisKey = this.getKey(key);
      await this.client.del(redisKey);
      this.logger.debug('Cache deleted', { key });
    } catch (error) {
      this.logger.error('Failed to delete cache', error as Error, { key });
      throw new RedisError('Cache deletion failed', error as Error);
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      if (!this.client || !this.isConnected) {
        return {
          status: 'unhealthy',
          details: { error: 'Redis not connected' }
        };
      }

      const startTime = Date.now();
      const pong = await this.client.ping();
      const responseTime = Date.now() - startTime;

      // Redis情報取得
      const info = await this.client.info('server');
      const serverInfo = this.parseRedisInfo(info);

      return {
        status: 'healthy',
        details: {
          responseTime,
          ping: pong,
          version: serverInfo.redis_version,
          uptime: serverInfo.uptime_in_seconds,
          connectedClients: serverInfo.connected_clients,
          usedMemory: serverInfo.used_memory_human
        }
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error as Error);
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      };
    }
  }

  /**
   * Redis INFO解析
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = isNaN(Number(value)) ? value : Number(value);
        }
      }
    }
    
    return result;
  }

  /**
   * 接続状態確認
   */
  /**
   * Ping（簡易実装）
   */
  async ping(): Promise<string> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return 'PONG';
  }

  /**
   * ヘルスチェック
   */
  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export default RedisService;