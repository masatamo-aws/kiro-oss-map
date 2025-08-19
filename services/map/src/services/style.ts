/**
 * Kiro OSS Map v2.1.0 - 地図サービス スタイルサービス
 * 地図スタイル管理・配信・カスタマイズ
 */

import { StorageService } from './storage.js';
import { RedisService, StyleMetadata } from './redis.js';
import { Logger } from '../../../shared/utils/logger.js';
import { MapStyle, MapStyleCategory } from '../../../shared/types/common.js';

/**
 * スタイルエラー
 */
export class StyleError extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: Error) {
    super(message);
    this.name = 'StyleError';
  }
}

/**
 * MapLibre GL スタイル仕様
 */
export interface MapLibreStyle {
  version: 8;
  name: string;
  metadata?: Record<string, any>;
  sources: Record<string, any>;
  layers: any[];
  sprite?: string;
  glyphs?: string;
  bearing?: number;
  pitch?: number;
  center?: [number, number];
  zoom?: number;
}

/**
 * スタイルサービス
 */
export class StyleService {
  private defaultStyles: Map<string, MapLibreStyle> = new Map();

  constructor(
    private storageService: StorageService,
    private redisService: RedisService,
    private logger: Logger
  ) {}

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Style Service...');
    
    // デフォルトスタイル作成
    await this.createDefaultStyles();
    
    this.logger.info('Style Service initialized successfully');
  }

  /**
   * スタイル一覧取得
   */
  async getStyles(): Promise<MapStyle[]> {
    try {
      // キャッシュから取得試行
      const cached = await this.redisService.get<MapStyle[]>('styles:list');
      if (cached) {
        this.logger.debug('Styles list served from cache');
        return cached;
      }

      // ストレージから取得
      const styleObjects = await this.storageService.list('styles/', 100);
      const styles: MapStyle[] = [];

      for (const obj of styleObjects) {
        if (obj.key.endsWith('.json')) {
          try {
            const styleData = await this.storageService.get(obj.key);
            const style = JSON.parse(styleData.toString()) as MapLibreStyle;
            
            const mapStyle: MapStyle = {
              id: this.extractStyleId(obj.key),
              name: style.name,
              description: style.metadata?.description || '',
              thumbnail: this.getThumbnailUrl(this.extractStyleId(obj.key)),
              styleUrl: `/styles/${this.extractStyleId(obj.key)}`,
              isDefault: this.isDefaultStyle(this.extractStyleId(obj.key)),
              category: this.getStyleCategory(style),
              createdAt: new Date(obj.lastModified),
              updatedAt: new Date(obj.lastModified)
            };
            
            styles.push(mapStyle);
          } catch (error) {
            this.logger.warn('Failed to parse style', { error: error as Error, key: obj.key });
          }
        }
      }

      // キャッシュに保存
      await this.redisService.set('styles:list', styles, 3600); // 1時間

      this.logger.debug('Styles list generated', { count: styles.length });
      return styles;
      
    } catch (error) {
      this.logger.error('Failed to get styles', error as Error);
      throw new StyleError(`Failed to get styles: ${(error as any)?.message || 'Unknown error'}`, 500, error as Error);
    }
  }

  /**
   * 特定スタイル取得
   */
  async getStyle(styleId: string): Promise<MapLibreStyle> {
    try {
      // キャッシュから取得試行
      const cached = await this.redisService.get<MapLibreStyle>(`style:${styleId}`);
      if (cached) {
        this.logger.debug('Style served from cache', { styleId });
        return cached;
      }

      // デフォルトスタイルチェック
      if (this.defaultStyles.has(styleId)) {
        const style = this.defaultStyles.get(styleId)!;
        await this.redisService.set(`style:${styleId}`, style, 3600);
        return style;
      }

      // ストレージから取得
      const storageKey = `styles/${styleId}.json`;
      
      if (!(await this.storageService.exists(storageKey))) {
        throw new StyleError(`Style not found: ${styleId}`, 404);
      }

      const styleData = await this.storageService.get(storageKey);
      const style = JSON.parse(styleData.toString()) as MapLibreStyle;
      
      // キャッシュに保存
      await this.redisService.set(`style:${styleId}`, style, 3600);
      
      this.logger.debug('Style loaded from storage', { styleId });
      return style;
      
    } catch (error) {
      if (error instanceof StyleError) {
        throw error;
      }
      
      this.logger.error('Failed to get style', error as Error, { styleId });
      throw new StyleError(`Failed to get style: ${(error as any)?.message || 'Unknown error'}`, 500, error as Error);
    }
  }

  /**
   * スタイル作成・更新
   */
  async saveStyle(styleId: string, style: MapLibreStyle): Promise<void> {
    try {
      // スタイル検証
      this.validateStyle(style);
      
      // ストレージに保存
      const storageKey = `styles/${styleId}.json`;
      const styleData = Buffer.from(JSON.stringify(style, null, 2));
      await this.storageService.put(storageKey, styleData, 'application/json');
      
      // キャッシュ更新
      await this.redisService.set(`style:${styleId}`, style, 3600);
      
      // スタイル一覧キャッシュクリア
      await this.redisService.delete('styles:list');
      
      // スタイルメタデータ保存
      const metadata: StyleMetadata = {
        id: styleId,
        name: style.name,
        version: style.version.toString(),
        lastModified: new Date(),
        size: styleData.length,
        checksum: this.generateChecksum(styleData)
      };
      
      await this.redisService.cacheStyleMetadata(styleId, metadata);
      
      this.logger.info('Style saved', { styleId, name: style.name, size: styleData.length });
      
    } catch (error) {
      this.logger.error('Failed to save style', error as Error, { styleId });
      throw new StyleError(`Failed to save style: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * スタイル削除
   */
  async deleteStyle(styleId: string): Promise<void> {
    try {
      // デフォルトスタイルは削除不可
      if (this.isDefaultStyle(styleId)) {
        throw new StyleError(`Cannot delete default style: ${styleId}`, 400);
      }

      // ストレージから削除
      const storageKey = `styles/${styleId}.json`;
      await this.storageService.delete(storageKey);
      
      // キャッシュクリア
      await Promise.all([
        this.redisService.delete(`style:${styleId}`),
        this.redisService.delete(`style_meta:${styleId}`),
        this.redisService.delete('styles:list')
      ]);
      
      // 関連タイル削除
      // await this.deleteTilesForStyle(styleId); // TileService から呼び出し
      
      this.logger.info('Style deleted', { styleId });
      
    } catch (error) {
      if (error instanceof StyleError) {
        throw error;
      }
      
      this.logger.error('Failed to delete style', error as Error, { styleId });
      throw new StyleError(`Failed to delete style: ${error.message}`, 500, error as Error);
    }
  }

  /**
   * デフォルトスタイル作成
   */
  private async createDefaultStyles(): Promise<void> {
    // 標準スタイル
    const standardStyle: MapLibreStyle = {
      version: 8,
      name: 'Kiro Standard',
      metadata: {
        description: 'Standard map style for Kiro OSS Map',
        category: 'standard'
      },
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 18
        }
      ],
      center: [139.7671, 35.6812], // 東京
      zoom: 10
    };

    // ダークスタイル
    const darkStyle: MapLibreStyle = {
      version: 8,
      name: 'Kiro Dark',
      metadata: {
        description: 'Dark theme map style for Kiro OSS Map',
        category: 'dark'
      },
      sources: {
        'osm-dark': {
          type: 'raster',
          tiles: ['https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, © CartoDB'
        }
      },
      layers: [
        {
          id: 'osm-dark',
          type: 'raster',
          source: 'osm-dark',
          minzoom: 0,
          maxzoom: 18
        }
      ],
      center: [139.7671, 35.6812],
      zoom: 10
    };

    // 衛星スタイル
    const satelliteStyle: MapLibreStyle = {
      version: 8,
      name: 'Kiro Satellite',
      metadata: {
        description: 'Satellite imagery style for Kiro OSS Map',
        category: 'satellite'
      },
      sources: {
        'satellite': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
        }
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster',
          source: 'satellite',
          minzoom: 0,
          maxzoom: 18
        }
      ],
      center: [139.7671, 35.6812],
      zoom: 10
    };

    // デフォルトスタイル登録
    this.defaultStyles.set('standard', standardStyle);
    this.defaultStyles.set('dark', darkStyle);
    this.defaultStyles.set('satellite', satelliteStyle);

    // ストレージに保存
    for (const [styleId, style] of this.defaultStyles) {
      try {
        const storageKey = `styles/${styleId}.json`;
        
        if (!(await this.storageService.exists(storageKey))) {
          const styleData = Buffer.from(JSON.stringify(style, null, 2));
          await this.storageService.put(storageKey, styleData, 'application/json');
          
          this.logger.debug('Default style created', { styleId, name: style.name });
        }
      } catch (error) {
        this.logger.warn('Failed to create default style', { error: error as Error, styleId });
      }
    }
  }

  /**
   * スタイル検証
   */
  private validateStyle(style: MapLibreStyle): void {
    if (style.version !== 8) {
      throw new StyleError('Style version must be 8', 400);
    }
    
    if (!style.name || style.name.trim().length === 0) {
      throw new StyleError('Style name is required', 400);
    }
    
    if (!style.sources || Object.keys(style.sources).length === 0) {
      throw new StyleError('Style must have at least one source', 400);
    }
    
    if (!style.layers || style.layers.length === 0) {
      throw new StyleError('Style must have at least one layer', 400);
    }
  }

  /**
   * スタイルIDをファイルパスから抽出
   */
  private extractStyleId(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace('.json', '');
  }

  /**
   * デフォルトスタイル判定
   */
  private isDefaultStyle(styleId: string): boolean {
    return this.defaultStyles.has(styleId);
  }

  /**
   * スタイルカテゴリ判定
   */
  private getStyleCategory(style: MapLibreStyle): MapStyleCategory {
    const category = style.metadata?.category;
    
    switch (category) {
      case 'standard':
        return MapStyleCategory.STANDARD;
      case 'satellite':
        return MapStyleCategory.SATELLITE;
      case 'terrain':
        return MapStyleCategory.TERRAIN;
      case 'dark':
        return MapStyleCategory.DARK;
      default:
        return MapStyleCategory.CUSTOM;
    }
  }

  /**
   * サムネイルURL生成
   */
  private getThumbnailUrl(styleId: string): string {
    return `/styles/${styleId}/thumbnail`;
  }

  /**
   * チェックサム生成
   */
  private generateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const defaultStyleCount = this.defaultStyles.size;
      const storageStyles = await this.storageService.list('styles/', 10);
      
      return {
        status: 'healthy',
        details: {
          service: 'style-service',
          defaultStyles: defaultStyleCount,
          storageStyles: storageStyles.length,
          availableStyles: Array.from(this.defaultStyles.keys())
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'style-service',
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * スタイル作成（簡易実装）
   */
  async createStyle(styleData: any): Promise<string> {
    const styleId = `style-${Date.now()}`;
    // 簡易実装 - 実際の実装は後で追加
    return styleId;
  }

  /**
   * スタイル更新（簡易実装）
   */
  async updateStyle(styleId: string, styleData: any): Promise<boolean> {
    // 簡易実装 - 実際の実装は後で追加
    return true;
  }



  /**
   * プレビュー生成（簡易実装）
   */
  async generatePreview(styleId: string, options: any): Promise<Buffer> {
    // 簡易実装 - 実際の実装は後で追加
    return Buffer.from('preview');
  }

  /**
   * スタイル統計取得（簡易実装）
   */
  async getStats(): Promise<any> {
    return {
      totalStyles: 10,
      activeStyles: 8,
      defaultStyle: 'basic'
    };
  }
}

export default StyleService;