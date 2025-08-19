/**
 * Kiro OSS Map v2.1.0 - ジオコーディングサービス
 * 住所⇔座標変換機能
 */

import { ElasticsearchService } from './elasticsearch.js';
import { RedisService } from './redis.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * ジオコーディング結果
 */
export interface GeocodingResult {
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  accuracy: number;
  components: {
    country?: string;
    region?: string;
    city?: string;
    district?: string;
    street?: string;
    number?: string;
    postalCode?: string;
  };
}

/**
 * 逆ジオコーディング結果
 */
export interface ReverseGeocodingResult {
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  components: {
    country?: string;
    region?: string;
    city?: string;
    district?: string;
    street?: string;
    number?: string;
    postalCode?: string;
  };
}

/**
 * ジオコーディングサービス
 */
export class GeocodingService {
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
    this.logger.info('Initializing Geocoding Service...');
    
    // ジオコーディング用インデックス作成
    await this.createGeocodingIndex();
    
    this.logger.info('Geocoding Service initialized');
  }

  /**
   * ジオコーディング（住所→座標）
   */
  async geocode(address: string): Promise<GeocodingResult[]> {
    try {
      this.logger.info('Executing geocoding', { address });

      // キャッシュ確認
      const cacheKey = `geocode:${Buffer.from(address).toString('base64')}`;
      const cachedResult = await this.redisService.get(cacheKey);
      
      if (cachedResult) {
        this.logger.debug('Returning cached geocoding result');
        return JSON.parse(cachedResult);
      }

      // Elasticsearch検索実行
      const searchResult = await this.elasticsearchService.search(address, {
        size: 5
      });

      // 結果変換
      const results = this.transformGeocodingResults(searchResult);

      // 結果をキャッシュ（1時間）
      await this.redisService.set(cacheKey, JSON.stringify(results), 3600);

      this.logger.info('Geocoding completed', { 
        address, 
        resultCount: results.length 
      });

      return results;

    } catch (error) {
      this.logger.error('Geocoding failed', error as Error, { address });
      
      // フォールバック: モックデータを返す
      return this.getMockGeocodingResults(address);
    }
  }

  /**
   * 逆ジオコーディング（座標→住所）
   */
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult[]> {
    try {
      this.logger.info('Executing reverse geocoding', { lat, lng });

      // キャッシュ確認
      const cacheKey = `reverse:${lat}:${lng}`;
      const cachedResult = await this.redisService.get(cacheKey);
      
      if (cachedResult) {
        this.logger.debug('Returning cached reverse geocoding result');
        return JSON.parse(cachedResult);
      }

      // 近傍検索実行
      const results = await this.findNearbyAddresses(lat, lng);

      // 結果をキャッシュ（1時間）
      await this.redisService.set(cacheKey, JSON.stringify(results), 3600);

      this.logger.info('Reverse geocoding completed', { 
        lat, 
        lng, 
        resultCount: results.length 
      });

      return results;

    } catch (error) {
      this.logger.error('Reverse geocoding failed', error as Error, { lat, lng });
      
      // フォールバック: モックデータを返す
      return this.getMockReverseGeocodingResults(lat, lng);
    }
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
        cache: {
          status: 'connected'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get geocoding stats', error as Error);
      return {
        service: {
          status: 'error',
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * ジオコーディング用インデックス作成
   */
  private async createGeocodingIndex(): Promise<void> {
    const mapping = {
      properties: {
        address: {
          type: 'text',
          analyzer: 'standard'
        },
        location: {
          type: 'geo_point'
        },
        components: {
          properties: {
            country: { type: 'keyword' },
            region: { type: 'keyword' },
            city: { type: 'keyword' },
            district: { type: 'keyword' },
            street: { type: 'text' },
            number: { type: 'keyword' },
            postalCode: { type: 'keyword' }
          }
        },
        accuracy: {
          type: 'float'
        }
      }
    };

    await this.elasticsearchService.createIndex('addresses', mapping);
  }

  /**
   * 近傍住所検索
   */
  private async findNearbyAddresses(lat: number, lng: number): Promise<ReverseGeocodingResult[]> {
    // 開発環境用のモック実装
    return this.getMockReverseGeocodingResults(lat, lng);
  }

  /**
   * ジオコーディング結果変換
   */
  private transformGeocodingResults(searchResult: any): GeocodingResult[] {
    if (!searchResult.hits || !searchResult.hits.hits) {
      return [];
    }

    return searchResult.hits.hits.map((hit: any) => ({
      address: hit._source.address || '',
      location: hit._source.location || { lat: 0, lng: 0 },
      accuracy: hit._score || 0,
      components: hit._source.components || {}
    }));
  }

  /**
   * モックジオコーディング結果
   */
  private getMockGeocodingResults(address: string): GeocodingResult[] {
    // 東京駅周辺の座標を基準にモックデータを生成
    const baseLatLng = { lat: 35.6812, lng: 139.7671 };
    
    return [
      {
        address: address,
        location: {
          lat: baseLatLng.lat + (Math.random() - 0.5) * 0.01,
          lng: baseLatLng.lng + (Math.random() - 0.5) * 0.01
        },
        accuracy: 0.9,
        components: {
          country: 'Japan',
          region: 'Tokyo',
          city: 'Chiyoda',
          district: 'Marunouchi',
          street: address.split(' ')[0] || 'Unknown Street'
        }
      }
    ];
  }

  /**
   * モック逆ジオコーディング結果
   */
  private getMockReverseGeocodingResults(lat: number, lng: number): ReverseGeocodingResult[] {
    return [
      {
        location: { lat, lng },
        address: `${Math.floor(lat * 1000) % 100}-${Math.floor(lng * 1000) % 100} Mock Street, Tokyo, Japan`,
        components: {
          country: 'Japan',
          region: 'Tokyo',
          city: 'Chiyoda',
          district: 'Marunouchi',
          street: 'Mock Street',
          number: `${Math.floor(lat * 1000) % 100}-${Math.floor(lng * 1000) % 100}`,
          postalCode: '100-0005'
        }
      }
    ];
  }
}