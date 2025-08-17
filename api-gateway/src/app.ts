/**
 * Express application setup for Kiro OSS Map API Gateway
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { validateApiKey } from './middleware/apiKey';

// Import routes
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { mapsRoutes } from './routes/maps';
import { searchRoutes } from './routes/search';
import { routingRoutes } from './routes/routing';
import { userRoutes } from './routes/user';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

app.use(limiter);

// Health check routes (no authentication required)
app.use('/health', healthRoutes);
app.use('/api/v2/health', healthRoutes);

// Authentication routes (no API key required)
app.use('/api/v2/auth', authRoutes);

// API key middleware for protected routes (except auth and health)
app.use('/api/v2/maps', validateApiKey, mapsRoutes);
app.use('/api/v2/search', validateApiKey, searchRoutes);
app.use('/api/v2/routing', validateApiKey, routingRoutes);

// User routes (require JWT token, not API key)
app.use('/api/v2/user', userRoutes);

// API documentation endpoint (requires API key)
app.get('/api/v2', validateApiKey, (req, res) => {
  res.json({
    name: 'Kiro OSS Map API Gateway',
    version: '2.0.0',
    description: 'RESTful API for Kiro Open Source Map services',
    documentation: 'https://docs.kiro-map.com/api/v2',
    endpoints: {
      health: '/api/v2/health',
      auth: '/api/v2/auth',
      maps: '/api/v2/maps',
      search: '/api/v2/search',
      routing: '/api/v2/routing',
      user: '/api/v2/user'
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: config.rateLimit.max
    },
    support: {
      email: 'support@kiro-map.com',
      documentation: 'https://docs.kiro-map.com',
      github: 'https://github.com/kiro-oss/map'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Kiro OSS Map API Gateway',
    version: '2.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      api: '/api/v2',
      health: '/health',
      documentation: 'https://docs.kiro-map.com/api/v2'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    documentation: 'https://docs.kiro-map.com/api/v2'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export { app };