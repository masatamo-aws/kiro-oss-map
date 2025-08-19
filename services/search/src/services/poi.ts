/**
 * Kiro OSS Map v2.1.0 - POI検索サービス
 * Point of Interest 検索・カテゴリ管理
 */

import { ElasticsearchService } from './elasticsearch.js';
import { RedisService } from './redis.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * POI結果
 */
export interface POIResult {
  id: string;
  name: string;
  category: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
  openingHours?: string[];
  distance?: number;
}

/**
 * POI検索オプション
 */
export interface POISearchOptions {
  category?: string;
  radius?: number; // メートル
  limit?: number;
  minRating?: number;
  priceLevel?: number;
  openNow?: boolean;
}

/**
 * POIサービス
 */
export class POIService {
  private elasticsearchService: ElasticsearchService;
  private redisService: RedisService;
  private logger: Logger;

  constructor(
    elasticsearchService: ElasticsearchService,
    redisService: RedisService,
    logger: Logger
  ) {
    this.elasticsearchService = elasticsearchService;
    this.redisService = redisService;
    this.logger = logger;
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing POI Service...');
    
    // POI用インデックス作成
    await this.createPOIIndex();
    
    this.logger.info('POI Service initialized');
  }

  /**
   * POI検索
   */
  async searchPOI(
    lat: number, 
    lng: number, 
    options: POISearchOptions = {}
  ): Promise<POIResult[]> {
    try {
      this.logger.info('Executing POI search', { lat, lng, options });

      // キャッシュ確認
      const cacheKey = this.generatePOICacheKey(lat, lng, options);
      const cachedResult = await this.redisService.get(cacheKey);
      
      if (cachedResult) {
        this.logger.debug('Returning cached POI result');
        return JSON.parse(cachedResult);
      }

      // 近傍POI検索実行
      const results = await this.findNearbyPOIs(lat, lng, options);

      // 結果をキャッシュ（30分間）
      await this.redisService.set(cacheKey, JSON.stringify(results), 1800);

      this.logger.info('POI search completed', { 
        lat, 
        lng, 
        resultCount: results.length 
      });

      return results;

    } catch (error) {
      this.logger.error('POI search failed', error as Error, { lat, lng });
      
      // フォールバック: モックデータを返す
      return this.getMockPOIResults(lat, lng, options);
    }
  }

  /**
   * カテゴリ別POI検索
   */
  async searchByCategory(
    category: string,
    lat?: number,
    lng?: number,
    radius: number = 5000
  ): Promise<POIResult[]> {
    try {
      this.logger.info('Executing category POI search', { category, lat, lng, radius });

      const options: POISearchOptions = {
        category,
        radius,
        limit: 20
      };

      if (lat && lng) {
        return await this.searchPOI(lat, lng, options);
      } else {
        // 位置指定なしの場合は全体検索
        return await this.searchAllPOIsByCategory(category);
      }

    } catch (error) {
      this.logger.error('Category POI search failed', error as Error, { category });
      return [];
    }
  }

  /**
   * POI詳細取得
   */
  async getPOIDetails(poiId: string): Promise<POIResult | null> {
    try {
      this.logger.info('Getting POI details', { poiId });

      // キャッシュ確認
      const cacheKey = `poi:details:${poiId}`;
      const cachedResult = await this.redisService.get(cacheKey);
      
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      // Elasticsearch検索実行
      const result = await this.findPOIById(poiId);

      if (result) {
        // 結果をキャッシュ（1時間）
        await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to get POI details', error as Error, { poiId });
      return null;
    }
  }

  /**
   * POIカテゴリ一覧取得
   */
  async getCategories(): Promise<string[]> {
    const categories = [
      'restaurant',
      'cafe',
      'hotel',
      'shopping',
      'gas_station',
      'hospital',
      'pharmacy',
      'bank',
      'atm',
      'school',
      'park',
      'museum',
      'tourist_attraction',
      'transportation',
      'parking'
    ];

    return categories;
  }

  /**
   * 統計情報取得
   */
  async getStats(): Promise<any> {
    try {
      return {
        service: {
          status: 'healthy',
          uptime: process.uptime()
        },
        categories: await this.getCategories(),
        totalPOIs: 0 // 実装時に実際の数を取得
      };
    } catch (error) {
      this.logger.error('Failed to get POI stats', error as Error);
      return {
        service: {
          status: 'error',
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * POI用インデックス作成
   */
  private async createPOIIndex(): Promise<void> {
    const mapping = {
      properties: {
        name: {
          type: 'text',
          analyzer: 'standard'
        },
        category: {
          type: 'keyword'
        },
        location: {
          type: 'geo_point'
        },
        address: {
          type: 'text'
        },
        phone: {
          type: 'keyword'
        },
        website: {
          type: 'keyword'
        },
        rating: {
          type: 'float'
        },
        priceLevel: {
          type: 'integer'
        },
        openingHours: {
          type: 'keyword'
        }
      }
    };

    await this.elasticsearchService.createIndex('pois', mapping);
  }

  /**
   * 近傍POI検索
   */
  private async findNearbyPOIs(
    lat: number, 
    lng: number, 
    options: POISearchOptions
  ): Promise<POIResult[]> {
    // 開発環境用のモック実装
    return this.getMockPOIResults(lat, lng, options);
  }

  /**
   * カテゴリ別全POI検索
   */
  private async searchAllPOIsByCategory(category: string): Promise<POIResult[]> {
    // 開発環境用のモック実装
    return this.getMockPOIResults(35.6812, 139.7671, { category });
  }

  /**
   * ID別POI検索
   */
  private async findPOIById(poiId: string): Promise<POIResult | null> {
    // 開発環境用のモック実装
    return {
      id: poiId,
      name: 'Mock POI',
      category: 'restaurant',
      location: { lat: 35.6812, lng: 139.7671 },
      address: 'Mock Address, Tokyo, Japan',
      phone: '+81-3-1234-5678',
      rating: 4.2,
      priceLevel: 2
    };
  }

  /**
   * POIキャッシュキー生成
   */
  private generatePOICacheKey(
    lat: number, 
    lng: number, 
    options: POISearchOptions
  ): string {
    const key = `poi:${lat}:${lng}:${JSON.stringify(options)}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * モックPOI結果
   */
  private getMockPOIResults(
    lat: number, 
    lng: number, 
    options: POISearchOptions
  ): POIResult[] {
    const category = options.category || 'restaurant';
    const limit = options.limit || 10;

    const mockPOIs: POIResult[] = [];

    for (let i = 0; i < Math.min(limit, 5); i++) {
      const offsetLat = (Math.random() - 0.5) * 0.01;
      const offsetLng = (Math.random() - 0.5) * 0.01;

      mockPOIs.push({
        id: `mock-poi-${i}`,
        name: `Mock ${category} ${i + 1}`,
        category: category,
        location: {
          lat: lat + offsetLat,
          lng: lng + offsetLng
        },
        address: `Mock Address ${i + 1}, Tokyo, Japan`,
        phone: `+81-3-1234-567${i}`,
        rating: 3.5 + Math.random() * 1.5,
        priceLevel: Math.floor(Math.random() * 4) + 1,
        distance: Math.floor(Math.random() * 1000) + 100
      });
    }

    return mockPOIs;
  }
}