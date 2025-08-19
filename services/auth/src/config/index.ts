/**
 * Kiro OSS Map v2.1.0 - 認証サービス設定
 * 環境変数ベースの設定管理
 */

import { config as dotenvConfig } from 'dotenv';
import { ServiceConfig, Environment, DatabaseConfig, RedisConfig } from '../../../shared/types/common';

// 環境変数読み込み
dotenvConfig();

/**
 * 認証サービス設定
 */
export interface AuthServiceConfig extends ServiceConfig {
  jwt: {
    secret: string;
    refreshSecret: string;
    issuer: string;
    audience: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: string;
  };
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  };
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number; // 分
    passwordResetExpiry: number; // 分
  };
}

/**
 * 環境変数から設定を構築
 */
function createConfig(): AuthServiceConfig {
  const environment = (process.env.NODE_ENV as Environment) || Environment.DEVELOPMENT;
  
  return {
    name: 'auth-service',
    version: '2.1.0',
    port: parseInt(process.env.PORT || '3001', 10),
    environment,

    // データベース設定
    database: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'kiro_auth',
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      ssl: process.env.DATABASE_SSL === 'true',
      poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10)
    },

    // Redis設定
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DATABASE || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'auth:'
    },

    // JWT設定
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
      issuer: process.env.JWT_ISSUER || 'kiro-auth-service',
      audience: process.env.JWT_AUDIENCE || 'kiro-services',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },

    // CORS設定
    cors: {
      allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'https://kiro-map.com',
        'https://*.kiro-map.com'
      ]
    },

    // メール設定
    email: {
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      },
      from: process.env.EMAIL_FROM || 'noreply@kiro-map.com'
    },

    // OAuth設定
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback'
      }
    },

    // セキュリティ設定
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '30', 10),
      passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || '60', 10)
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
function validateConfig(config: AuthServiceConfig): void {
  const errors: string[] = [];

  // 必須設定チェック
  if (!config.jwt.secret || config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
    errors.push('JWT_SECRET must be set to a secure value');
  }

  if (!config.jwt.refreshSecret || config.jwt.refreshSecret === 'your-super-secret-refresh-key-change-in-production') {
    errors.push('JWT_REFRESH_SECRET must be set to a secure value');
  }

  if (!config.database?.password) {
    errors.push('DATABASE_PASSWORD must be set');
  }

  // 本番環境での追加チェック
  if (config.environment === Environment.PRODUCTION) {
    if (config.jwt.secret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }

    if (!config.email.smtp.auth.user || !config.email.smtp.auth.pass) {
      errors.push('SMTP credentials must be set in production');
    }

    if (!config.oauth.google.clientId || !config.oauth.google.clientSecret) {
      console.warn('Google OAuth credentials not set - OAuth login will be disabled');
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
  console.log('Auth Service Configuration:', {
    name: config.name,
    version: config.version,
    port: config.port,
    environment: config.environment,
    database: {
      host: config.database?.host,
      port: config.database?.port,
      database: config.database?.database
    },
    redis: {
      host: config.redis?.host,
      port: config.redis?.port,
      database: config.redis?.database
    }
  });
}