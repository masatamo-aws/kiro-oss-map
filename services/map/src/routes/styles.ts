/**
 * Kiro OSS Map v2.1.0 - スタイル管理API
 * 地図スタイルの配信・管理・カスタマイズ機能
 */

import { Router, Request, Response } from 'express';
import { StyleService } from '../services/style.js';
import { MetricsCollector } from '../middleware/metrics.js';
import { Logger } from '../../../shared/utils/logger.js';
import { createJwtAuthMiddleware } from '../../../shared/middleware/auth';

/**
 * スタイル管理ルーター作成
 */
export function stylesRoutes(
  styleService: StyleService,
  metricsCollector: MetricsCollector,
  logger: Logger
): Router {
  const router = Router();

  /**
   * スタイル一覧取得
   * GET /styles
   */
  router.get('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      logger.info('Getting style list', { query: req.query });

      const styles = await styleService.getStyles();

      // メトリクス記録
      metricsCollector.recordRequest('get_styles', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          styles,
          count: styles.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get style list', error as Error);
      metricsCollector.recordRequest('get_styles', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'STYLE_LIST_ERROR',
          message: 'Failed to get style list',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * 特定スタイル取得
   * GET /styles/:styleId
   */
  router.get('/:styleId', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { styleId } = req.params;
    
    try {
      logger.info('Getting style', { styleId });

      const style = await styleService.getStyle(styleId);

      if (!style) {
        metricsCollector.recordRequest('get_style', Date.now() - startTime, 404);
        return res.status(404).json({
          success: false,
          error: {
            code: 'STYLE_NOT_FOUND',
            message: `Style not found: ${styleId}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      // キャッシュヘッダー設定
      res.set({
        'Cache-Control': 'public, max-age=3600',
        'ETag': `"${styleId}-${(style as any).version || '1.0.0'}"`,
        'Content-Type': 'application/json'
      });

      // 条件付きリクエスト処理
      if (req.headers['if-none-match'] === `"${styleId}-${(style as any).version || '1.0.0'}"`) {
        metricsCollector.recordRequest('get_style', Date.now() - startTime, 304);
        return res.status(304).end();
      }

      metricsCollector.recordRequest('get_style', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: style,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get style', error as Error, { styleId });
      metricsCollector.recordRequest('get_style', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'STYLE_GET_ERROR',
          message: 'Failed to get style',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * スタイル作成
   * POST /styles
   */
  router.post('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { name, style, metadata } = req.body;

      if (!name || !style) {
        metricsCollector.recordRequest('create_style', Date.now() - startTime, 400);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Name and style are required',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info('Creating style', { name, userId: (req as any).user?.id });

      const styleId = await styleService.createStyle({
        name,
        style,
        metadata: {
          ...metadata,
          createdBy: (req as any).user?.id,
          createdAt: new Date().toISOString()
        }
      });

      metricsCollector.recordRequest('create_style', Date.now() - startTime, 201);

      res.status(201).json({
        success: true,
        data: {
          styleId,
          name,
          createdAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to create style', error as Error);
      metricsCollector.recordRequest('create_style', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'STYLE_CREATE_ERROR',
          message: 'Failed to create style',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * スタイル更新
   * PUT /styles/:styleId
   */
  router.put('/:styleId', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { styleId } = req.params;
    
    try {
      const { name, style, metadata } = req.body;

      logger.info('Updating style', { styleId, userId: (req as any).user?.id });

      const updated = await styleService.updateStyle(styleId, {
        name,
        style,
        metadata: {
          ...metadata,
          updatedBy: (req as any).user?.id,
          updatedAt: new Date().toISOString()
        }
      });

      if (!updated) {
        metricsCollector.recordRequest('update_style', Date.now() - startTime, 404);
        return res.status(404).json({
          success: false,
          error: {
            code: 'STYLE_NOT_FOUND',
            message: `Style not found: ${styleId}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      metricsCollector.recordRequest('update_style', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          styleId,
          updatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to update style', error as Error, { styleId });
      metricsCollector.recordRequest('update_style', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'STYLE_UPDATE_ERROR',
          message: 'Failed to update style',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * スタイル削除
   * DELETE /styles/:styleId
   */
  router.delete('/:styleId', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { styleId } = req.params;
    
    try {
      logger.info('Deleting style', { styleId, userId: (req as any).user?.id });

      await styleService.deleteStyle(styleId);

      metricsCollector.recordRequest('delete_style', Date.now() - startTime, 200);

      res.json({
        success: true,
        data: {
          styleId,
          deletedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to delete style', error as Error, { styleId });
      metricsCollector.recordRequest('delete_style', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'STYLE_DELETE_ERROR',
          message: 'Failed to delete style',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  /**
   * スタイルプレビュー生成
   * POST /styles/:styleId/preview
   */
  router.post('/:styleId/preview', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { styleId } = req.params;
    const { width = 256, height = 256, center, zoom = 10 } = req.body;
    
    try {
      logger.info('Generating style preview', { styleId, width, height, center, zoom });

      const preview = await styleService.generatePreview(styleId, {
        width: parseInt(width),
        height: parseInt(height),
        center,
        zoom: parseInt(zoom)
      });

      if (!preview) {
        metricsCollector.recordRequest('generate_preview', Date.now() - startTime, 404);
        return res.status(404).json({
          success: false,
          error: {
            code: 'STYLE_NOT_FOUND',
            message: `Style not found: ${styleId}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      // 画像レスポンス
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': preview.length.toString()
      });

      metricsCollector.recordRequest('generate_preview', Date.now() - startTime, 200);
      res.send(preview);

    } catch (error) {
      logger.error('Failed to generate preview', error as Error, { styleId });
      metricsCollector.recordRequest('generate_preview', Date.now() - startTime, 500);

      res.status(500).json({
        success: false,
        error: {
          code: 'PREVIEW_ERROR',
          message: 'Failed to generate preview',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return router;
}