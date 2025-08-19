/**
 * Kiro OSS Map v2.1.0 - 認証サービス 認証ルート
 * ユーザー登録・ログイン・トークン管理・パスワードリセット
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { Logger } from '../../../shared/utils/logger';
import { 
  generateTokens, 
  verifyRefreshToken, 
  hashPassword, 
  verifyPassword,
  generateSecureToken,
  createJwtAuthMiddleware
} from '../../../shared/middleware/auth';
import { UserRole, AuthTokens } from '../../../shared/types/common';
import { config } from '../config/index';

/**
 * 認証ルート作成
 */
export function authRoutes(
  databaseService: DatabaseService,
  redisService: RedisService,
  logger: Logger
): Router {
  const router = Router();

  // JWT認証ミドルウェア
  const jwtAuth = createJwtAuthMiddleware({
    jwtSecret: config.jwt.secret,
    jwtRefreshSecret: config.jwt.refreshSecret,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: config.jwt.expiresIn,
    refreshExpiresIn: config.jwt.refreshExpiresIn
  }, logger);

  /**
   * ユーザー登録
   * POST /auth/register
   */
  router.post('/register', [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
  ], async (req: Request, res: Response) => {
    try {
      // バリデーションエラーチェック
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date().toISOString()
          }
        });
      }

      const { email, password, name } = req.body;

      // 既存ユーザーチェック
      const existingUsers = await databaseService.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
      }

      // パスワードハッシュ化
      const passwordHash = await hashPassword(password, config.security.bcryptRounds);
      const emailVerificationToken = generateSecureToken();

      // ユーザー作成
      const users = await databaseService.query(`
        INSERT INTO users (email, password_hash, name, role, email_verification_token)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name, role, is_active, email_verified, created_at
      `, [email, passwordHash, name, UserRole.USER, emailVerificationToken]);

      const user = users[0];

      // JWT トークン生成
      const tokens = generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role
      }, {
        jwtSecret: config.jwt.secret,
        jwtRefreshSecret: config.jwt.refreshSecret,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        expiresIn: config.jwt.expiresIn,
        refreshExpiresIn: config.jwt.refreshExpiresIn
      });

      // セッション保存
      await redisService.setSession(user.id, {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginAt: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }, 7 * 24 * 3600); // 7日間

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.is_active,
            emailVerified: user.email_verified,
            createdAt: user.created_at
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 3600, // 1時間
            tokenType: 'Bearer' as const
          }
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Registration failed', error as Error, {
        email: req.body?.email,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'Registration failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * ユーザーログイン
   * POST /auth/login
   */
  router.post('/login', [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ], async (req: Request, res: Response) => {
    try {
      // バリデーションエラーチェック
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date().toISOString()
          }
        });
      }

      const { email, password } = req.body;

      // ログイン試行回数チェック
      const attempts = await redisService.getLoginAttempts(email);
      if (attempts >= config.security.maxLoginAttempts) {
        logger.warn('Login blocked due to too many attempts', {
          email,
          attempts,
          ip: req.ip
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'TOO_MANY_ATTEMPTS',
            message: `Too many login attempts. Try again in ${config.security.lockoutDuration} minutes.`,
            timestamp: new Date().toISOString()
          }
        });
      }

      // ユーザー検索
      const users = await databaseService.query(`
        SELECT id, email, password_hash, name, role, is_active, email_verified, 
               login_attempts, locked_until
        FROM users 
        WHERE email = $1
      `, [email]);

      if (users.length === 0) {
        await redisService.recordLoginAttempt(email);
        
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = users[0];

      // アカウント状態チェック
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Account is disabled',
            timestamp: new Date().toISOString()
          }
        });
      }

      // アカウントロックチェック
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked',
            timestamp: new Date().toISOString()
          }
        });
      }

      // パスワード検証
      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        await redisService.recordLoginAttempt(email);
        
        // データベースのログイン試行回数も更新
        await databaseService.query(`
          UPDATE users 
          SET login_attempts = login_attempts + 1,
              locked_until = CASE 
                WHEN login_attempts + 1 >= $1 THEN NOW() + INTERVAL '${config.security.lockoutDuration} minutes'
                ELSE NULL 
              END
          WHERE id = $2
        `, [config.security.maxLoginAttempts, user.id]);

        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
      }

      // ログイン成功 - 試行回数リセット
      await redisService.resetLoginAttempts(email);
      await databaseService.query(`
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL, last_login_at = NOW()
        WHERE id = $1
      `, [user.id]);

      // JWT トークン生成
      const tokens = generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role
      }, {
        jwtSecret: config.jwt.secret,
        jwtRefreshSecret: config.jwt.refreshSecret,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        expiresIn: config.jwt.expiresIn,
        refreshExpiresIn: config.jwt.refreshExpiresIn
      });

      // セッション保存
      await redisService.setSession(user.id, {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginAt: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }, 7 * 24 * 3600); // 7日間

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.is_active,
            emailVerified: user.email_verified
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 3600, // 1時間
            tokenType: 'Bearer' as const
          }
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Login failed', error as Error, {
        email: req.body?.email,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Login failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * トークンリフレッシュ
   * POST /auth/refresh
   */
  router.post('/refresh', [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ], async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date().toISOString()
          }
        });
      }

      const { refreshToken } = req.body;

      // リフレッシュトークン検証
      const decoded = verifyRefreshToken(refreshToken, {
        jwtSecret: config.jwt.secret,
        jwtRefreshSecret: config.jwt.refreshSecret,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        expiresIn: config.jwt.expiresIn,
        refreshExpiresIn: config.jwt.refreshExpiresIn
      });

      // ユーザー情報取得
      const users = await databaseService.query(`
        SELECT id, email, name, role, is_active, email_verified
        FROM users 
        WHERE id = $1 AND is_active = true
      `, [decoded.sub]);

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive',
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = users[0];

      // 新しいトークン生成
      const tokens = generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role
      }, {
        jwtSecret: config.jwt.secret,
        jwtRefreshSecret: config.jwt.refreshSecret,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        expiresIn: config.jwt.expiresIn,
        refreshExpiresIn: config.jwt.refreshExpiresIn
      });

      // セッション更新
      await redisService.setSession(user.id, {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginAt: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }, 7 * 24 * 3600);

      logger.info('Token refreshed successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        data: {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 3600,
            tokenType: 'Bearer' as const
          }
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Token refresh failed', error as Error, {
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_ERROR',
          message: 'Token refresh failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * ログアウト
   * POST /auth/logout
   */
  router.post('/logout', jwtAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // セッション削除
      await redisService.deleteSession(req.user.sub);

      logger.info('User logged out successfully', {
        userId: req.user.sub,
        email: req.user.email,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully'
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Logout failed', error as Error, {
        userId: req.user?.sub,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Logout failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * 全セッションログアウト
   * POST /auth/logout-all
   */
  router.post('/logout-all', jwtAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      }

      // ユーザーの全セッション削除
      await redisService.deleteUserSessions(req.user.sub);

      logger.info('All user sessions logged out', {
        userId: req.user.sub,
        email: req.user.email,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'All sessions logged out successfully'
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Logout all failed', error as Error, {
        userId: req.user?.sub,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ALL_ERROR',
          message: 'Logout all failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return router;
}

export default authRoutes;