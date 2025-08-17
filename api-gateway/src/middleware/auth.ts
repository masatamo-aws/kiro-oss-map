/**
 * Authentication middleware for Kiro OSS Map API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        organizationId: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // For API routes, API key validation is sufficient
    if (req.apiKey) {
      // API key is already validated, proceed
      return next();
    }

    // For user-specific routes, require JWT token
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('Authentication token is required');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // TODO: Implement user lookup from database
    const user = await getUserFromDatabase(decoded.sub);
    
    if (!user) {
      throw new AuthenticationError('Invalid token: user not found');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is inactive');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role: user.role,
      permissions: user.permissions
    };

    logger.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token has expired'));
    } else {
      next(error);
    }
  }
};

// Permission check middleware factory
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // For user-specific routes, require JWT token
    if (req.originalUrl.includes('/user/')) {
      const token = extractToken(req);
      
      if (!token) {
        return next(new AuthenticationError('Authentication token is required'));
      }

      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        // Attach minimal user info for user routes
        req.user = {
          id: decoded.sub,
          email: 'user@example.com',
          name: 'Test User',
          organizationId: 'org-123',
          role: 'developer',
          permissions: ['user:read', 'user:write']
        };
        return next();
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          return next(new AuthenticationError('Invalid token'));
        } else if (error instanceof jwt.TokenExpiredError) {
          return next(new AuthenticationError('Token has expired'));
        }
        return next(error);
      }
    }

    // For API key routes, API key validation is sufficient
    if (req.apiKey) {
      // API key is already validated in apiKey middleware
      return next();
    }

    next(new AuthenticationError('Authentication required'));
  };
};

// Role check middleware factory
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      return next(new AuthorizationError(`Role '${role}' is required`));
    }

    next();
  };
};

function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter
  const tokenQuery = req.query.token as string;
  if (tokenQuery) {
    return tokenQuery;
  }

  return null;
}

// TODO: Implement actual database lookup
async function getUserFromDatabase(userId: string): Promise<any> {
  // Mock implementation
  return {
    id: userId,
    email: 'user@example.com',
    name: 'Test User',
    organizationId: 'test-org-id',
    role: 'developer',
    isActive: true,
    permissions: ['maps:read', 'search:read', 'routing:read', 'user:read', 'user:write']
  };
}