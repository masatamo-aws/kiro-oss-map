/**
 * Metrics routes for Kiro OSS Map API Gateway
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { metricsCollector } from '../middleware/metrics';

// エラー処理ミドルウェア
const handleAsyncError = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 共通エラーレスポンス
const sendErrorResponse = (res: Response, statusCode: number, message: string, details?: any) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString()
  });
};

const router = Router();

// Prometheus metrics endpoint
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const metrics = metricsCollector.getPrometheusMetrics();
  
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metrics);
}));

// Metrics summary endpoint (JSON format)
router.get('/metrics/summary', asyncHandler(async (req: Request, res: Response) => {
  const summary = metricsCollector.getMetricsSummary();
  
  res.json({
    timestamp: new Date().toISOString(),
    service: 'kiro-map-api-gateway',
    version: '2.0.0',
    metrics: summary
  });
}));

export { router as metricsRoutes };