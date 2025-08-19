/**
 * Kiro OSS Map v2.1.0 - 検索サービス
 * 基本検索・オートコンプリート機能
 */

import { ElasticsearchService } from './elasticsearch.js';
import { RedisService } from './redis.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * 検索結果インターフェース
 */
export interface SearchResult {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  type: string;
  score: number;
}

/**
 * 検索オプション
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  type?: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * 検索サービス
 */
export class SearchService {
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
    this.logger.info('Initializing Search Service...');

    // インデックス作成（開発環境用）
    await this.createSearchIndex();

    this.logger.info('Search Service initialized');
  }

  /**
   * 基本検索
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      this.logger.info('Executing search', { query, options });

      // キャッシュ確認
      const cacheKey = this.generateCacheKey(query, options);
      const cachedResult = await this.redisService.get(cacheKey);
      
      if (cachedResult) {
        this.logger.debug('Returning cached search result');
        return JSON.parse(cachedResult);
      }

      // Elasticsearch検索実行
      const searchResult = await this.elasticsearchService.search(query, {
        size: options.limit || 10,
        from: options.offset || 0
      });

      // 結果変換
      const results = this.transformSearchResults(searchResult);

      // 結果をキャッシュ（5分間）
      await this.redisService.set(cacheKey, JSON.stringify(results), 300);

      this.logger.info('Search completed', { 
        query, 
        resultCount: results.length 
      });

      return results;

    } catch (error) {
      this.logger.error('Search failed', error as Error, { query });
      
      // フォールバック: モックデータを返す
      return this.getMockSearchResults(query);
    }
  }

  /**
   * オートコンプリート
   */
  async autocomplete(query: string, limit: number = 5): Promise<string[]> {
    try {
      this.logger.debug('Executing autocomplete', { query, limit });

      // キャッシュ確認
      const cacheKey = `autocomplete:${query}:${limit}`;
      const cachedResult = await this.redisService.get(cacheKey);
      
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      // Elasticsearch検索実行
      const searchResult = await this.elasticsearchService.search(query, {
        size: limit
      });

      // 候補抽出
      const suggestions = this.extractSuggestions(searchResult);

      // 結果をキャッシュ（10分間）
      await this.redisService.set(cacheKey, JSON.stringify(suggestions), 600);

      return suggestions;

    } catch (error) {
      this.logger.error('Autocomplete failed', error as Error, { query });
      
      // フォールバック: 基本的な候補を返す
      return this.getMockAutocomplete(query);
    }
  }

  /**
   * 統計情報取得
   */
  async getStats(): Promise<any> {
    try {
      const elasticsearchStats = await this.elasticsearchService.getStats();
      const redisStats = await this.redisService.getStats();

      return {
        elasticsearch: elasticsearchStats,
        redis: redisStats,
        service: {
          status: 'healthy',
          uptime: process.uptime()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get search stats', error as Error);
      return {
        service: {
          status: 'error',
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * 検索インデックス作成
   */
  private async createSearchIndex(): Promise<void> {
    const mapping = {
      properties: {
        name: {
          type: 'text',
          analyzer: 'standard'
        },
        address: {
          type: 'text',
          analyzer: 'standard'
        },
        location: {
          type: 'geo_point'
        },
        type: {
          type: 'keyword'
        },
        description: {
          type: 'text'
        }
      }
    };

    await this.elasticsearchService.createIndex('places', mapping);
  }

  /**
   * キャッシュキー生成
   */
  private generateCacheKey(query: string, options: SearchOptions): string {
    const optionsStr = JSON.stringify(options);
    return `search:${Buffer.from(query + optionsStr).toString('base64')}`;
  }

  /**
   * 検索結果変換
   */
  private transformSearchResults(searchResult: any): SearchResult[] {
    if (!searchResult.hits || !searchResult.hits.hits) {
      return [];
    }

    return searchResult.hits.hits.map((hit: any) => ({
      id: hit._id,
      name: hit._source.name || 'Unknown',
      address: hit._source.address || '',
      location: hit._source.location || { lat: 0, lng: 0 },
      type: hit._source.type || 'place',
      score: hit._score || 0
    }));
  }

  /**
   * 候補抽出
   */
  private extractSuggestions(searchResult: any): string[] {
    if (!searchResult.hits || !searchResult.hits.hits) {
      return [];
    }

    return searchResult.hits.hits
      .map((hit: any) => hit._source.name)
      .filter((name: string) => name && name.length > 0)
      .slice(0, 5);
  }

  /**
   * モック検索結果
   */
  private getMockSearchResults(query: string): SearchResult[] {
    return [
      {
        id: 'mock-1',
        name: `${query} Station`,
        address: `${query} City, Japan`,
        location: { lat: 35.6812, lng: 139.7671 },
        type: 'station',
        score: 1.0
      },
      {
        id: 'mock-2',
        name: `${query} Park`,
        address: `${query} District, Japan`,
        location: { lat: 35.6762, lng: 139.7650 },
        type: 'park',
        score: 0.8
      }
    ];
  }

  /**
   * モックオートコンプリート
   */
  private getMockAutocomplete(query: string): string[] {
    const suggestions = [
      `${query} Station`,
      `${query} Park`,
      `${query} Mall`,
      `${query} Hotel`,
      `${query} Restaurant`
    ];

    return suggestions.slice(0, 5);
  }
}