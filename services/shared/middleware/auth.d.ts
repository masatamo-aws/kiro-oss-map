/**
 * Kiro OSS Map v2.1.0 - 共通認証ミドルウェア
 * マイクロサービス間で統一された認証機能
 */
import { Request, Response, NextFunction } from 'express';
import { JwtPayload, UserRole } from '../types/common';
import { Logger } from '../utils/logger';
/**
 * 認証設定
 */
export interface AuthConfig {
    jwtSecret: string;
    jwtRefreshSecret: string;
    issuer: string;
    audience: string;
    expiresIn: string;
    refreshExpiresIn: string;
}
/**
 * 認証済みリクエスト
 */
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
    logger?: Logger;
}
/**
 * 認証エラー
 */
export declare class AuthError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code?: string, statusCode?: number);
}
/**
 * JWT認証ミドルウェア
 */
export declare function createJwtAuthMiddleware(config: AuthConfig, logger: Logger): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * オプショナル認証ミドルウェア
 */
export declare function createOptionalAuthMiddleware(config: AuthConfig, logger: Logger): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * ロール認可ミドルウェア
 */
export declare function requireRole(...roles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * 管理者権限必須ミドルウェア
 */
export declare function requireAdmin(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * モデレーター以上権限必須ミドルウェア
 */
export declare function requireModerator(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * 自分のリソースまたは管理者権限チェック
 */
export declare function requireOwnerOrAdmin(getUserId: (req: AuthenticatedRequest) => string): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * API Key認証ミドルウェア
 */
export declare function createApiKeyAuthMiddleware(validApiKeys: string[], logger: Logger): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * JWT トークン生成
 */
export declare function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>, config: AuthConfig): {
    accessToken: string;
    refreshToken: string;
};
/**
 * リフレッシュトークン検証
 */
export declare function verifyRefreshToken(token: string, config: AuthConfig): {
    sub: string;
};
export declare function hashPassword(password: string, rounds?: number): Promise<string>;
/**
 * パスワード検証
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * セキュアランダム文字列生成
 */
export declare function generateSecureToken(length?: number): string;
//# sourceMappingURL=auth.d.ts.map