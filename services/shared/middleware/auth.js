/**
 * Kiro OSS Map v2.1.0 - 共通認証ミドルウェア
 * マイクロサービス間で統一された認証機能
 */
import jwt from 'jsonwebtoken';
import { UserRole } from '../types/common';
/**
 * 認証エラー
 */
export class AuthError extends Error {
    code;
    statusCode;
    constructor(message, code = 'AUTH_ERROR', statusCode = 401) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AuthError';
    }
}
/**
 * JWT認証ミドルウェア
 */
export function createJwtAuthMiddleware(config, logger) {
    return async (req, res, next) => {
        try {
            const token = extractToken(req);
            if (!token) {
                throw new AuthError('No token provided', 'NO_TOKEN', 401);
            }
            const payload = verifyToken(token, config.jwtSecret);
            req.user = payload;
            // ログ記録
            if (req.logger) {
                req.logger = req.logger.child({ userId: payload.sub });
            }
            logger.debug('JWT authentication successful', {
                userId: payload.sub,
                email: payload.email,
                role: payload.role
            });
            next();
        }
        catch (error) {
            handleAuthError(error, res, logger);
        }
    };
}
/**
 * オプショナル認証ミドルウェア
 */
export function createOptionalAuthMiddleware(config, logger) {
    return async (req, res, next) => {
        try {
            const token = extractToken(req);
            if (token) {
                const payload = verifyToken(token, config.jwtSecret);
                req.user = payload;
                if (req.logger) {
                    req.logger = req.logger.child({ userId: payload.sub });
                }
                logger.debug('Optional JWT authentication successful', {
                    userId: payload.sub
                });
            }
            next();
        }
        catch (error) {
            // オプショナル認証では認証エラーを無視
            logger.warn('Optional authentication failed', { error: error instanceof Error ? error.message : 'Unknown error' });
            next();
        }
    };
}
/**
 * ロール認可ミドルウェア
 */
export function requireRole(...roles) {
    return (req, res, next) => {
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
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions',
                    timestamp: new Date().toISOString()
                }
            });
        }
        next();
    };
}
/**
 * 管理者権限必須ミドルウェア
 */
export function requireAdmin() {
    return requireRole(UserRole.ADMIN);
}
/**
 * モデレーター以上権限必須ミドルウェア
 */
export function requireModerator() {
    return requireRole(UserRole.ADMIN, UserRole.MODERATOR);
}
/**
 * 自分のリソースまたは管理者権限チェック
 */
export function requireOwnerOrAdmin(getUserId) {
    return (req, res, next) => {
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
        const resourceUserId = getUserId(req);
        const isOwner = req.user.sub === resourceUserId;
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied',
                    timestamp: new Date().toISOString()
                }
            });
        }
        next();
    };
}
/**
 * API Key認証ミドルウェア
 */
export function createApiKeyAuthMiddleware(validApiKeys, logger) {
    return (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NO_API_KEY',
                    message: 'API key required',
                    timestamp: new Date().toISOString()
                }
            });
        }
        if (!validApiKeys.includes(apiKey)) {
            logger.warn('Invalid API key attempt', { apiKey: apiKey.substring(0, 8) + '...' });
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_API_KEY',
                    message: 'Invalid API key',
                    timestamp: new Date().toISOString()
                }
            });
        }
        logger.debug('API key authentication successful');
        next();
    };
}
/**
 * トークン抽出
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // クエリパラメータからも取得可能
    const queryToken = req.query.token;
    if (queryToken) {
        return queryToken;
    }
    return null;
}
/**
 * トークン検証
 */
function verifyToken(token, secret) {
    try {
        const decoded = jwt.verify(token, secret);
        // 必須フィールドの検証
        if (!decoded.sub || !decoded.email || !decoded.role) {
            throw new AuthError('Invalid token payload', 'INVALID_PAYLOAD', 401);
        }
        return {
            sub: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            iat: decoded.iat,
            exp: decoded.exp,
            jti: decoded.jti
        };
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new AuthError('Token expired', 'TOKEN_EXPIRED', 401);
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            throw new AuthError('Invalid token', 'INVALID_TOKEN', 401);
        }
        else {
            throw error;
        }
    }
}
/**
 * 認証エラーハンドリング
 */
function handleAuthError(error, res, logger) {
    logger.warn('Authentication failed', { error: error.message });
    if (error instanceof AuthError) {
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
    else {
        res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication failed',
                timestamp: new Date().toISOString()
            }
        });
    }
}
/**
 * JWT トークン生成
 */
export function generateTokens(payload, config) {
    const now = Math.floor(Date.now() / 1000);
    const accessTokenPayload = {
        ...payload,
        iat: now,
        exp: now + parseTimeToSeconds(config.expiresIn)
    };
    const refreshTokenPayload = {
        sub: payload.sub,
        type: 'refresh',
        iat: now,
        exp: now + parseTimeToSeconds(config.refreshExpiresIn)
    };
    const accessToken = jwt.sign(accessTokenPayload, config.jwtSecret, {
        issuer: config.issuer,
        audience: config.audience
    });
    const refreshToken = jwt.sign(refreshTokenPayload, config.jwtRefreshSecret, {
        issuer: config.issuer,
        audience: config.audience
    });
    return { accessToken, refreshToken };
}
/**
 * リフレッシュトークン検証
 */
export function verifyRefreshToken(token, config) {
    try {
        const decoded = jwt.verify(token, config.jwtRefreshSecret);
        if (decoded.type !== 'refresh' || !decoded.sub) {
            throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
        }
        return { sub: decoded.sub };
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new AuthError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED', 401);
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
        }
        else {
            throw error;
        }
    }
}
/**
 * 時間文字列を秒に変換
 */
function parseTimeToSeconds(timeStr) {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid time format: ${timeStr}`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 60 * 60 * 24;
        default: throw new Error(`Invalid time unit: ${unit}`);
    }
}
/**
 * パスワードハッシュ化（bcrypt）
 */
import bcrypt from 'bcrypt';
export async function hashPassword(password, rounds = 12) {
    return bcrypt.hash(password, rounds);
}
/**
 * パスワード検証
 */
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
/**
 * セキュアランダム文字列生成
 */
export function generateSecureToken(length = 32) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
}
//# sourceMappingURL=auth.js.map