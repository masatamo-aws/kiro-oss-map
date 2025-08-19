/**
 * Kiro OSS Map v2.1.0 - 認証サービス ユーザー管理ルート
 * プロフィール管理・設定・パスワード変更・アカウント管理
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { Logger } from '../../../shared/utils/logger';
import { 
  createJwtAuthMiddleware,
  requireOwnerOrAdmin,
  requireAdmin,
  hashPassword,
  verifyPassword,
  generateSecureToken
} from '../../../shared/middleware/auth';
import { UserRole } from '../../../shared/types/common';
import { config } from '../config/index';

/**
 * ユーザー管理ルート作成
 */
export function userRoutes(
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
   * 現在のユーザー情報取得
   * GET /users/me
   */
  router.get('/me', jwtAuth, async (req: Request, res: Response) => {
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

      // ユーザー情報取得
      const users = await databaseService.query(`
        SELECT id, email, name, role, is_active, email_verified, 
               last_login_at, created_at, updated_at
        FROM users 
        WHERE id = $1
      `, [req.user.sub]);

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = users[0];

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.is_active,
            emailVerified: user.email_verified,
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at,
            updatedAt: user.updated_at
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
      logger.error('Failed to get user profile', error as Error, {
        userId: req.user?.sub
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_ERROR',
          message: 'Failed to get user profile',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * ユーザープロフィール更新
   * PUT /users/me
   */
  router.put('/me', [
    jwtAuth,
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ], async (req: Request, res: Response) => {
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

      const { name, email } = req.body;
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      // 更新フィールド構築
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }

      if (email !== undefined) {
        // メールアドレス重複チェック
        const existingUsers = await databaseService.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, req.user.sub]
        );

        if (existingUsers.length > 0) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email address already in use',
              timestamp: new Date().toISOString()
            }
          });
        }

        updateFields.push(`email = $${paramIndex++}`);
        updateFields.push(`email_verified = false`); // メール変更時は再検証必要
        updateValues.push(email);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_UPDATES',
            message: 'No fields to update',
            timestamp: new Date().toISOString()
          }
        });
      }

      // ユーザー情報更新
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(req.user.sub);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, name, role, is_active, email_verified, 
                  last_login_at, created_at, updated_at
      `;

      const users = await databaseService.query(query, updateValues);
      const user = users[0];

      logger.info('User profile updated', {
        userId: req.user.sub,
        updatedFields: Object.keys(req.body),
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
            emailVerified: user.email_verified,
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at,
            updatedAt: user.updated_at
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
      logger.error('Failed to update user profile', error as Error, {
        userId: req.user?.sub
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_UPDATE_ERROR',
          message: 'Failed to update user profile',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * パスワード変更
   * PUT /users/me/password
   */
  router.put('/me/password', [
    jwtAuth,
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must be at least 8 characters with uppercase, lowercase, number and special character')
  ], async (req: Request, res: Response) => {
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

      const { currentPassword, newPassword } = req.body;

      // 現在のパスワード取得・検証
      const users = await databaseService.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.sub]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      const isValidPassword = await verifyPassword(currentPassword, users[0].password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect',
            timestamp: new Date().toISOString()
          }
        });
      }

      // 新しいパスワードハッシュ化
      const newPasswordHash = await hashPassword(newPassword, config.security.bcryptRounds);

      // パスワード更新
      await databaseService.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [newPasswordHash, req.user.sub]);

      // 他のセッションを無効化（セキュリティのため）
      await redisService.deleteUserSessions(req.user.sub);

      logger.info('User password changed', {
        userId: req.user.sub,
        email: req.user.email,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Password changed successfully. Please log in again.'
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Failed to change password', error as Error, {
        userId: req.user?.sub
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_ERROR',
          message: 'Failed to change password',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * パスワードリセット要求
   * POST /users/password-reset
   */
  router.post('/password-reset', [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
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

      const { email } = req.body;

      // ユーザー検索
      const users = await databaseService.query(
        'SELECT id, email, name FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      // セキュリティのため、ユーザーが存在しない場合でも成功レスポンス
      if (users.length === 0) {
        logger.warn('Password reset requested for non-existent user', {
          email,
          ip: req.ip
        });
      } else {
        const user = users[0];
        const resetToken = generateSecureToken();

        // リセットトークン保存
        await databaseService.query(`
          UPDATE users 
          SET password_reset_token = $1, 
              password_reset_expires = NOW() + INTERVAL '${config.security.passwordResetExpiry} minutes',
              updated_at = NOW()
          WHERE id = $2
        `, [resetToken, user.id]);

        logger.info('Password reset token generated', {
          userId: user.id,
          email: user.email,
          ip: req.ip
        });

        // TODO: メール送信実装
        // await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'If the email exists, a password reset link has been sent.'
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Password reset request failed', error as Error, {
        email: req.body?.email,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: 'Password reset request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * パスワードリセット実行
   * POST /users/password-reset/confirm
   */
  router.post('/password-reset/confirm', [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must be at least 8 characters with uppercase, lowercase, number and special character')
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

      const { token, newPassword } = req.body;

      // リセットトークン検証
      const users = await databaseService.query(`
        SELECT id, email, password_reset_expires
        FROM users 
        WHERE password_reset_token = $1 
          AND password_reset_expires > NOW()
          AND is_active = true
      `, [token]);

      if (users.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RESET_TOKEN',
            message: 'Invalid or expired reset token',
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = users[0];

      // 新しいパスワードハッシュ化
      const newPasswordHash = await hashPassword(newPassword, config.security.bcryptRounds);

      // パスワード更新・トークンクリア
      await databaseService.query(`
        UPDATE users 
        SET password_hash = $1,
            password_reset_token = NULL,
            password_reset_expires = NULL,
            login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $2
      `, [newPasswordHash, user.id]);

      // 全セッション無効化
      await redisService.deleteUserSessions(user.id);

      logger.info('Password reset completed', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Password reset successfully. Please log in with your new password.'
        },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Password reset confirmation failed', error as Error, {
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PASSWORD_RESET_CONFIRM_ERROR',
          message: 'Password reset confirmation failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * ユーザー一覧取得（管理者のみ）
   * GET /users
   */
  router.get('/', [jwtAuth, requireAdmin()], async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      // 総数取得
      const countResult = await databaseService.query('SELECT COUNT(*) as total FROM users');
      const total = parseInt(countResult[0].total);

      // ユーザー一覧取得
      const users = await databaseService.query(`
        SELECT id, email, name, role, is_active, email_verified, 
               last_login_at, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
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
      logger.error('Failed to get users list', error as Error, {
        adminUserId: req.user?.sub
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'USERS_LIST_ERROR',
          message: 'Failed to get users list',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * 特定ユーザー情報取得（管理者のみ）
   * GET /users/:userId
   */
  router.get('/:userId', [jwtAuth, requireAdmin()], async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const users = await databaseService.query(`
        SELECT id, email, name, role, is_active, email_verified, 
               login_attempts, locked_until, last_login_at, created_at, updated_at
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = users[0];

      res.status(200).json({
        success: true,
        data: { user },
        metadata: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          version: '2.1.0'
        }
      });

    } catch (error) {
      logger.error('Failed to get user details', error as Error, {
        adminUserId: req.user?.sub,
        targetUserId: req.params.userId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'USER_DETAILS_ERROR',
          message: 'Failed to get user details',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return router;
}

export default userRoutes;