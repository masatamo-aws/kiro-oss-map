/**
 * API Key validation middleware for Kiro OSS Map API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from './errorHandler';
import { logger } from '../utils/logger';

// Extend Request interface to include apiKey
declare global {
  namespace Express {
    interface Request {
      apiKey?: string;
      organization?: {
        id: string;
        name: string;
        plan: string;
      };
      rateLimit?: {
        requestsPerMinute: number;
        requestsPerDay: number;
      };
    }
  }
}

export const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract API key from header or query parameter
    const apiKey = req.headers['x-api-key'] as string || 
                   req.query.api_key as string;

    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }

    // Validate API key format
    if (!isValidApiKeyFormat(apiKey)) {
      throw new AuthenticationError('Invalid API key format');
    }

    // TODO: Implement actual API key validation against database
    // For now, use a simple validation
    const keyInfo = await validateApiKeyInDatabase(apiKey);
    
    if (!keyInfo) {
      throw new AuthenticationError('Invalid API key');
    }

    if (!keyInfo.isActive) {
      throw new AuthenticationError('API key is inactive');
    }

    if (keyInfo.expiresAt && new Date() > keyInfo.expiresAt) {
      throw new AuthenticationError('API key has expired');
    }

    // Attach key info to request
    req.apiKey = apiKey;
    req.organization = keyInfo.organization;
    req.rateLimit = keyInfo.rateLimit;

    // Log API key usage
    logger.debug('API key validated', {
      keyPrefix: apiKey.substring(0, 8) + '...',
      organization: keyInfo.organization.name,
      endpoint: req.path
    });

    next();
  } catch (error) {
    next(error);
  }
};

function isValidApiKeyFormat(apiKey: string): boolean {
  // API key format: km_live_xxxxxxxxxxxx or km_test_xxxxxxxxxxxx or test keys
  const pattern = /^km_(live|test)_[a-zA-Z0-9]{32}$/;
  const testKeys = ['test-api-key-12345'];
  
  return pattern.test(apiKey) || testKeys.includes(apiKey);
}

// TODO: Implement actual database validation
async function validateApiKeyInDatabase(apiKey: string): Promise<any> {
  // Valid test keys for testing
  const VALID_TEST_KEYS = ['test-api-key-12345'];
  
  // Mock implementation for now
  if (apiKey.startsWith('km_test_') || VALID_TEST_KEYS.includes(apiKey)) {
    return {
      id: 'test-key-id',
      isActive: true,
      expiresAt: null,
      organization: {
        id: 'test-org-id',
        name: 'Test Organization',
        plan: 'free'
      },
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 1000
      },
      permissions: ['maps:read', 'search:read', 'routing:read']
    };
  }

  if (apiKey.startsWith('km_live_')) {
    return {
      id: 'live-key-id',
      isActive: true,
      expiresAt: null,
      organization: {
        id: 'live-org-id',
        name: 'Production Organization',
        plan: 'pro'
      },
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerDay: 100000
      },
      permissions: ['maps:read', 'maps:write', 'search:read', 'routing:read', 'user:read', 'user:write']
    };
  }

  return null;
}