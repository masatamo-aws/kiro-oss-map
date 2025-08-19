/**
 * Kiro OSS Map v2.1.0 - 認証サービス Redisサービス
 * Redis接続・セッション管理・キャッシュ操作
 */

import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { RedisConfig } from '../../../shared/types/common';
import { Logger } from '../../../shared/utils/logger';

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
 * セッションデータ
 */
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  loginAt: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Redisサービス
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
      this.client?.on('error', (error: any) => {
        this.logger.error('Redis client error', error);
        this.isConnected = false;
      });

      this.client?.on('connect', () => {
        this.logger.debug('Redis client connected');
      });

      this.client?.on('ready', () => {
        this.logger.debug('Redis client ready');
        this.isConnected = true;
      });

      this.client?.on('end', () => {
        this.logger.debug('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client?.connect();

      // 接続テスト
      await this.client?.ping();

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
    const prefix = this.config.keyPrefix || 'auth:';
    return `${prefix}${key}`;
  }

  /**
   * セッション保存
   */
  async setSession(sessionId: string, data: SessionData, ttlSeconds: number = 3600): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const key = this.getKey(`session:${sessionId}`);
      const value = JSON.stringify(data);
      
      await this.client.setEx(key, ttlSeconds, value);
      
      this.logger.debug('Session saved', {
        sessionId: sessionId.substring(0, 8) + '...',
        userId: data.userId,
        ttl: ttlSeconds
      });
    } catch (error) {
      this.logger.error('Failed to save session', error as Error, { sessionId });
      throw new RedisError('Session save failed', error as Error);
    }
  }

  /**
   * セッション取得
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const key = this.getKey(`session:${sessionId}`);
      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      const data = JSON.parse(value) as SessionData;
      
      this.logger.debug('Session retrieved', {
        sessionId: sessionId.substring(0, 8) + '...',
        userId: data.userId
      });

      return data;
    } catch (error) {
      this.logger.error('Failed to get session', error as Error, { sessionId });
      throw new RedisError('Session retrieval failed', error as Error);
    }
  }

  /**
   * セッション削除
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const key = this.getKey(`session:${sessionId}`);
      await this.client.del(key);
      
      this.logger.debug('Session deleted', {
        sessionId: sessionId.substring(0, 8) + '...'
      });
    } catch (error) {
      this.logger.error('Failed to delete session', error as Error, { sessionId });
      throw new RedisError('Session deletion failed', error as Error);
    }
  }

  /**
   * ユーザーの全セッション削除
   */
  async deleteUserSessions(userId: string): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const pattern = this.getKey('session:*');
      const keys = await this.client.keys(pattern);
      
      const userSessions: string[] = [];
      
      for (const key of keys) {
        const value = await this.client.get(key);
        if (value) {
          const data = JSON.parse(value) as SessionData;
          if (data.userId === userId) {
            userSessions.push(key);
          }
        }
      }

      if (userSessions.length > 0) {
        await this.client.del(userSessions);
        this.logger.debug('User sessions deleted', {
          userId,
          sessionCount: userSessions.length
        });
      }
    } catch (error) {
      this.logger.error('Failed to delete user sessions', error as Error, { userId });
      throw new RedisError('User sessions deletion failed', error as Error);
    }
  }

  /**
   * ログイン試行回数記録
   */
  async recordLoginAttempt(identifier: string, ttlSeconds: number = 900): Promise<number> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const key = this.getKey(`login_attempts:${identifier}`);
      const attempts = await this.client.incr(key);
      
      if (attempts === 1) {
        await this.client.expire(key, ttlSeconds);
      }

      this.logger.debug('Login attempt recorded', {
        identifier: identifier.substring(0, 8) + '...',
        attempts
      });

      return attempts;
    } catch (error) {
      this.logger.error('Failed to record login attempt', error as Error, { identifier });
      throw new RedisError('Login attempt recording failed', error as Error);
    }
  }

  /**
   * ログイン試行回数取得
   */
  async getLoginAttempts(identifier: string): Promise<number> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const key = this.getKey(`login_attempts:${identifier}`);
      const attempts = await this.client.get(key);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      this.logger.error('Failed to get login attempts', error as Error, { identifier });
      throw new RedisError('Login attempts retrieval failed', error as Error);
    }
  }

  /**
   * ログイン試行回数リセット
   */
  async resetLoginAttempts(identifier: string): Promise<void> {
    if (!this.client) {
      throw new RedisError('Redis not connected');
    }

    try {
      const key = this.getKey(`login_attempts:${identifier}`);
      await this.client.del(key);
      
      this.logger.debug('Login attempts reset', {
        identifier: identifier.substring(0, 8) + '...'
      });
    } catch (error) {
      this.logger.error('Failed to reset login attempts', error as Error, { identifier });
      throw new RedisError('Login attempts reset failed', error as Error);
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
  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export default RedisService;