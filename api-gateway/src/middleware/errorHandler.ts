/**
 * Global error handler middleware for Kiro OSS Map API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class InternalServerError extends Error {
  statusCode = 500;
  code = 'INTERNAL_SERVER_ERROR';
  
  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
  }
}

export const errorHandler = (
  error: APIError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error response
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  
  const errorResponse: any = {
    error: {
      code,
      message: error.message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add details for validation errors
  if (error instanceof ValidationError && error.details) {
    errorResponse.error.details = error.details;
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.error.requestId = req.headers['x-request-id'];
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.error.message = 'Internal server error';
    delete errorResponse.error.details;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};