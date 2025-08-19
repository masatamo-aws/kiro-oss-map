/**
 * Kiro OSS Map v2.1.0 - 地図サービス タイルサービス
 * タイル生成・配信・キャッシュ・最適化
 */

import sharp from 'sharp';
import { StorageService } from './storage.js';
import { RedisService, TileMetadata } from './redis.js';
import { Logger } from '../../../shared/utils/logger.js';
import { TileConfig } from '../config/index.js';

/**
 * タイルエラー
 */
export class TileError extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: Error) {
    super(message);
    this.name = 'TileError';
  }
}

/**
 * タイル座標
 */
export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
}

/**
 * タイルリクエスト
 */
export interface TileRequest extends TileCoordinate {
  style: string;
  format: string;
  scale?: number;
  quality?: number;
}

/**
 * タイルレスポンス
 */
export interface TileResponse {
  data: Buffer;
  metadata: TileMetadata;
  fromCache: boolean;
}

/**
 * タイルサービス
 */
export class TileService {
  constructor(
    private storageService: StorageService,
    private redisService: RedisService,
    private logger: Logger,
    private config?: TileConfig
  ) {}

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Tile Service...');
    
    // デフォルトタイルの存在確認・生成
    await this.ensureDefaultTiles();
    
    this.logger.info('Tile Service initialized successfully');
  }

  /**
   * タイル取得
   */
  async getTile(request: TileRequest): Promise<TileResponse> {
    const { z, x, y, style, format } = request;
    
    // 座標検証
    this.validateTileCoordinate({ z, x, y });
    
    // フォーマット検証
    this.validateFormat(format);
    
    try {
      // キャッシュから取得試行
      const cached = await this.redisService.getCachedTile(z, x, y, style, format);
      if (cached) {
        // 統計記録
        await this.redisService.recordTileRequest(style, z, format, true);
        
        this.logger.debug('Tile served from cache', { z, x, y, style, format });
        return {
          data: cached.data,
          metadata: cached.metadata,
          fromCache: true
        };
      }

      // ストレージから取得またはタイル生成
      const tileData = await this.generateOrLoadTile(request);
      
      // キャッシュに保存
      const metadata: TileMetadata = {
        format,
        size: tileData.length,
        lastModified: new Date(),
        etag: this.generateETag(tileData),
        contentType: this.getContentType(format),
        cacheHit: false
      };
      
      await this.redisService.cacheTile(z, x, y, style, format, tileData, metadata);
      
      // 統計記録
      await this.redisService.recordTileRequest(style, z, format, false);
      
      this.logger.debug('Tile generated and cached', { z, x, y, style, format, size: tileData.length });
      
      return {
        data: tileData,
        metadata,
        fromCache: false
      };
      
    } catch (error) {
      this.logger.error('Failed to get tile', error as Error, { z, x, y, style, format });
      throw new TileError(`Failed to get tile: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * タイル生成またはロード
   */
  private async generateOrLoadTile(request: TileRequest): Promise<Buffer> {
    const { z, x, y, style, format, scale = 1, quality } = request;
    
    // ストレージからの取得を試行
    const storageKey = this.getTileStorageKey(z, x, y, style, format);
    
    try {
      if (await this.storageService.exists(storageKey)) {
        const tileData = await this.storageService.get(storageKey);
        
        // フォーマット変換が必要な場合
        if (this.needsFormatConversion(tileData, format)) {
          return await this.convertTileFormat(tileData, format, quality);
        }
        
        return tileData;
      }
    } catch (error) {
      this.logger.warn('Failed to load tile from storage', { error: error as Error, storageKey });
    }

    // タイル生成
    return await this.generateTile(request);
  }

  /**
   * タイル生成
   */
  private async generateTile(request: TileRequest): Promise<Buffer> {
    const { z, x, y, style, format, scale = 1, quality } = request;
    
    try {
      // 基本タイルサイズ
      const tileSize = (this.config?.tileSize || 256) * scale;
      
      // 空のタイル生成（実際の実装では地図データから生成）
      let tileBuffer = await this.generateEmptyTile(tileSize, format);
      
      // 品質調整
      if (quality && (format === 'jpg' || format === 'jpeg' || format === 'webp')) {
        tileBuffer = await this.adjustQuality(tileBuffer, format, quality);
      }
      
      // ストレージに保存
      const storageKey = this.getTileStorageKey(z, x, y, style, format);
      await this.storageService.put(storageKey, tileBuffer, this.getContentType(format));
      
      this.logger.debug('Tile generated and stored', {
        z, x, y, style, format, size: tileBuffer.length, storageKey
      });
      
      return tileBuffer;
      
    } catch (error) {
      this.logger.error('Failed to generate tile', error as Error, request);
      throw new TileError(`Failed to generate tile: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * 空のタイル生成（プレースホルダー）
   */
  private async generateEmptyTile(size: number, format: string): Promise<Buffer> {
    try {
      // 透明な背景色
      const backgroundColor = { r: 240, g: 240, b: 240, alpha: 0.1 };
      
      let image = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: backgroundColor
        }
      });

      // フォーマット別出力
      switch (format.toLowerCase()) {
        case 'png':
          return await image.png({ compressionLevel: 6 }).toBuffer();
        case 'jpg':
        case 'jpeg':
          return await image.jpeg({ quality: this.config?.quality?.jpeg || 85 }).toBuffer();
        case 'webp':
          return await image.webp({ quality: this.config?.quality?.webp || 80 }).toBuffer();
        default:
          return await image.png().toBuffer();
      }
    } catch (error) {
      throw new TileError(`Failed to generate empty tile: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * タイルフォーマット変換
   */
  private async convertTileFormat(tileData: Buffer, targetFormat: string, quality?: number): Promise<Buffer> {
    try {
      let image = sharp(tileData);
      
      switch (targetFormat.toLowerCase()) {
        case 'png':
          return await image.png({ compressionLevel: 6 }).toBuffer();
        case 'jpg':
        case 'jpeg':
          const jpegQuality = quality || this.config?.quality?.jpeg || 85;
          return await image.jpeg({ quality: jpegQuality }).toBuffer();
        case 'webp':
          const webpQuality = quality || this.config?.quality?.webp || 80;
          return await image.webp({ quality: webpQuality }).toBuffer();
        default:
          return tileData;
      }
    } catch (error) {
      throw new TileError(`Failed to convert tile format: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * 品質調整
   */
  private async adjustQuality(tileData: Buffer, format: string, quality: number): Promise<Buffer> {
    try {
      let image = sharp(tileData);
      
      switch (format.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
          return await image.jpeg({ quality }).toBuffer();
        case 'webp':
          return await image.webp({ quality }).toBuffer();
        default:
          return tileData;
      }
    } catch (error) {
      throw new TileError(`Failed to adjust tile quality: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * タイル削除
   */
  async deleteTile(z: number, x: number, y: number, style: string, format?: string): Promise<void> {
    try {
      if (format) {
        // 特定フォーマットのタイル削除
        await Promise.all([
          this.redisService.deleteCachedTile(z, x, y, style, format),
          this.storageService.delete(this.getTileStorageKey(z, x, y, style, format))
        ]);
      } else {
        // 全フォーマットのタイル削除
        const formats = this.config?.formats || ['png', 'jpg', 'webp'];
        await Promise.all(
          formats.map(fmt => Promise.all([
            this.redisService.deleteCachedTile(z, x, y, style, fmt),
            this.storageService.delete(this.getTileStorageKey(z, x, y, style, fmt))
          ]))
        );
      }
      
      this.logger.info('Tile deleted', { z, x, y, style, format });
    } catch (error) {
      this.logger.error('Failed to delete tile', error as Error, { z, x, y, style, format });
      throw new TileError(`Failed to delete tile: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * スタイル範囲のタイル削除
   */
  async deleteTilesForStyle(style: string): Promise<void> {
    try {
      // キャッシュクリア
      await this.redisService.deleteCachedTilesForStyle(style);
      
      // ストレージからの削除（パターンマッチング）
      const tileObjects = await this.storageService.list(`tiles/${style}/`);
      if (tileObjects.length > 0) {
        await Promise.all(
          tileObjects.map(obj => this.storageService.delete(obj.key))
        );
      }
      
      this.logger.info('All tiles deleted for style', { style, deletedCount: tileObjects.length });
    } catch (error) {
      this.logger.error('Failed to delete tiles for style', error as Error, { style });
      throw new TileError(`Failed to delete tiles for style: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * タイル統計取得
   */
  async getTileStats(date?: string): Promise<any> {
    try {
      const stats = await this.redisService.getTileStats(date);
      
      // 統計データを整理
      const organized = {
        date: date || new Date().toISOString().split('T')[0],
        total: {
          requests: parseInt(stats.total_requests || '0'),
          cacheHits: parseInt(stats.cache_hits || '0'),
          cacheMisses: parseInt(stats.cache_misses || '0')
        },
        cacheHitRate: 0,
        byStyle: {} as Record<string, number>,
        byZoom: {} as Record<string, number>,
        byFormat: {} as Record<string, number>
      };
      
      // キャッシュヒット率計算
      const totalRequests = organized.total.cacheHits + organized.total.cacheMisses;
      if (totalRequests > 0) {
        organized.cacheHitRate = (organized.total.cacheHits / totalRequests) * 100;
      }
      
      // カテゴリ別統計
      Object.entries(stats).forEach(([key, value]) => {
        if (key.startsWith('style:')) {
          organized.byStyle[key.substring(6)] = parseInt(value);
        } else if (key.startsWith('zoom:')) {
          organized.byZoom[key.substring(5)] = parseInt(value);
        } else if (key.startsWith('format:')) {
          organized.byFormat[key.substring(7)] = parseInt(value);
        }
      });
      
      return organized;
    } catch (error) {
      this.logger.error('Failed to get tile stats', error as Error, { date });
      throw new TileError(`Failed to get tile stats: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * デフォルトタイル確保
   */
  private async ensureDefaultTiles(): Promise<void> {
    try {
      // 基本的な空タイルを生成
      const defaultFormats = ['png', 'jpg', 'webp'];
      const defaultStyle = 'default';
      
      for (const format of defaultFormats) {
        const storageKey = this.getTileStorageKey(0, 0, 0, defaultStyle, format);
        
        if (!(await this.storageService.exists(storageKey))) {
          const emptyTile = await this.generateEmptyTile(256, format);
          await this.storageService.put(storageKey, emptyTile, this.getContentType(format));
          
          this.logger.debug('Default tile created', { format, storageKey });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to ensure default tiles', error as Error);
    }
  }

  /**
   * タイル座標検証
   */
  private validateTileCoordinate({ z, x, y }: TileCoordinate): void {
    const maxZoom = this.config?.maxZoom || 18;
    const minZoom = this.config?.minZoom || 0;
    
    if (z < minZoom || z > maxZoom) {
      throw new TileError(`Invalid zoom level: ${z}. Must be between ${minZoom} and ${maxZoom}`, 400);
    }
    
    const maxTileIndex = Math.pow(2, z) - 1;
    
    if (x < 0 || x > maxTileIndex) {
      throw new TileError(`Invalid x coordinate: ${x}. Must be between 0 and ${maxTileIndex}`, 400);
    }
    
    if (y < 0 || y > maxTileIndex) {
      throw new TileError(`Invalid y coordinate: ${y}. Must be between 0 and ${maxTileIndex}`, 400);
    }
  }

  /**
   * フォーマット検証
   */
  private validateFormat(format: string): void {
    const supportedFormats = this.config?.formats || ['png', 'jpg', 'jpeg', 'webp'];
    
    if (!supportedFormats.includes(format.toLowerCase())) {
      throw new TileError(`Unsupported format: ${format}. Supported formats: ${supportedFormats.join(', ')}`, 400);
    }
  }

  /**
   * フォーマット変換が必要かチェック
   */
  private needsFormatConversion(tileData: Buffer, targetFormat: string): boolean {
    // 簡易的な判定（実際の実装ではより詳細な判定が必要）
    const header = tileData.slice(0, 8);
    
    // PNG判定
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return targetFormat.toLowerCase() !== 'png';
    }
    
    // JPEG判定
    if (header[0] === 0xFF && header[1] === 0xD8) {
      return !['jpg', 'jpeg'].includes(targetFormat.toLowerCase());
    }
    
    // WebP判定
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
      return targetFormat.toLowerCase() !== 'webp';
    }
    
    return false;
  }

  /**
   * ストレージキー生成
   */
  private getTileStorageKey(z: number, x: number, y: number, style: string, format: string): string {
    return `tiles/${style}/${z}/${x}/${y}.${format}`;
  }

  /**
   * Content-Type取得
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp'
    };
    
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * ETag生成
   */
  private generateETag(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // 基本的なタイル生成テスト
      const testTile = await this.generateEmptyTile(256, 'png');
      
      return {
        status: 'healthy',
        details: {
          service: 'tile-service',
          testTileSize: testTile.length,
          supportedFormats: this.config?.formats || ['png', 'jpg', 'webp'],
          maxZoom: this.config?.maxZoom || 18,
          tileSize: this.config?.tileSize || 256
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'tile-service',
          error: (error as Error).message
        }
      };
    }
  }
  /**
   * タイル統計取得（簡易実装）
   */
  async getStats(): Promise<any> {
    return {
      totalTiles: 1000000,
      cacheHitRate: 0.85,
      averageResponseTime: 25
    };
  }
}

export default TileService;