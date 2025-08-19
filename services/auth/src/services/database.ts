/**
 * Kiro OSS Map v2.1.0 - 認証サービス データベースサービス
 * PostgreSQL接続・管理・ヘルスチェック
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { DatabaseConfig } from '../../../shared/types/common';
import { Logger } from '../../../shared/utils/logger';

/**
 * データベース接続エラー
 */
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * データベースサービス
 */
export class DatabaseService {
  private pool: Pool | null = null;
  private isConnected = false;

  constructor(
    private config: DatabaseConfig,
    private logger: Logger
  ) {}

  /**
   * データベース接続
   */
  async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to PostgreSQL database...');

      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: this.config.poolSize || 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: 30000,
        query_timeout: 30000
      };

      this.pool = new Pool(poolConfig);

      // 接続テスト
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      this.logger.info('Database connected successfully', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database
      });

      // エラーハンドリング
      this.pool.on('error', (error) => {
        this.logger.error('Database pool error', error);
        this.isConnected = false;
      });

    } catch (error) {
      this.logger.error('Failed to connect to database', error as Error);
      throw new DatabaseError('Database connection failed', error as Error);
    }
  }

  /**
   * データベース切断
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      this.logger.info('Disconnecting from database...');
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      this.logger.info('Database disconnected');
    }
  }

  /**
   * クエリ実行
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new DatabaseError('Database not connected');
    }

    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      const result = await client.query(text, params);
      
      const duration = Date.now() - startTime;
      this.logger.debug('Database query executed', {
        query: text.substring(0, 100),
        duration,
        rowCount: result.rowCount
      });

      return result.rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Database query failed', error as Error, {
        query: text.substring(0, 100),
        params: params?.slice(0, 5), // 最初の5個のパラメータのみログ
        duration
      });
      throw new DatabaseError('Query execution failed', error as Error);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * トランザクション実行
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new DatabaseError('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      this.logger.debug('Transaction completed successfully');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction rolled back', error as Error);
      throw new DatabaseError('Transaction failed', error as Error);
    } finally {
      client.release();
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      if (!this.pool || !this.isConnected) {
        return {
          status: 'unhealthy',
          details: { error: 'Database not connected' }
        };
      }

      const startTime = Date.now();
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      const responseTime = Date.now() - startTime;

      // 接続プール情報
      const poolInfo = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      return {
        status: 'healthy',
        details: {
          responseTime,
          currentTime: result[0]?.current_time,
          version: result[0]?.version?.split(' ')[0], // PostgreSQL version only
          pool: poolInfo
        }
      };
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      };
    }
  }

  /**
   * データベース初期化（テーブル作成）
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing database schema...');

    const schema = `
      -- ユーザーテーブル
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT true,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token VARCHAR(255),
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        last_login_at TIMESTAMP,
        login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- セッションテーブル
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token_hash VARCHAR(255) NOT NULL,
        refresh_token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- OAuth プロバイダーテーブル
      CREATE TABLE IF NOT EXISTS oauth_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        provider_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(provider, provider_user_id)
      );

      -- インデックス作成
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider, provider_user_id);

      -- 更新日時自動更新トリガー
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_oauth_providers_updated_at BEFORE UPDATE ON oauth_providers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await this.query(schema);
      this.logger.info('Database schema initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database schema', error as Error);
      throw new DatabaseError('Schema initialization failed', error as Error);
    }
  }

  /**
   * 接続状態確認
   */
  isHealthy(): boolean {
    return this.isConnected && this.pool !== null;
  }

  /**
   * 接続プール情報取得
   */
  getPoolInfo() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

export default DatabaseService;