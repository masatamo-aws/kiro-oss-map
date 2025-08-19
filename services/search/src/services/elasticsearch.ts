/**
 * Kiro OSS Map v2.1.0 - Elasticsearch サービス
 * 検索インデックス管理・クエリ実行
 */

import { Client } from '@elastic/elasticsearch';
import { ElasticsearchConfig } from '../config/index';
import { Logger } from '../../../shared/utils/logger';

/**
 * Elasticsearch サービス
 */
export class ElasticsearchService {
  private client: Client | null = null;
  private config: ElasticsearchConfig;
  private logger: Logger;

  constructor(config: ElasticsearchConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Elasticsearch接続
   */
  async connect(): Promise<void> {
    try {
      this.client = new Client({
        node: this.config.node,
        auth: this.config.auth,
        tls: this.config.tls
      });

      // 接続テスト
      await this.client.ping();
      this.logger.info('Elasticsearch connected successfully', {
        node: this.config.node
      });

    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch', error as Error);
      // 開発環境では接続エラーを許容
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Elasticsearch connection failed - running in mock mode');
        this.client = null;
      } else {
        throw error;
      }
    }
  }

  /**
   * Elasticsearch切断
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.logger.info('Elasticsearch disconnected');
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<void> {
    if (!this.client) {
      throw new Error('Elasticsearch client not connected');
    }

    await this.client.ping();
  }

  /**
   * 検索実行
   */
  async search(query: string, options: any = {}): Promise<any> {
    if (!this.client) {
      // モックレスポンス（開発環境用）
      return {
        hits: {
          total: { value: 0 },
          hits: []
        }
      };
    }

    try {
      const response = await this.client.search({
        index: 'places',
        body: {
          query: {
            multi_match: {
              query: query,
              fields: ['name', 'address', 'description']
            }
          },
          size: options.size || 10,
          from: options.from || 0
        }
      });

      return (response as any).body || response;
    } catch (error) {
      this.logger.error('Elasticsearch search failed', error as Error);
      throw error;
    }
  }

  /**
   * インデックス作成
   */
  async createIndex(indexName: string, mapping: any): Promise<void> {
    if (!this.client) {
      this.logger.warn('Elasticsearch not connected - skipping index creation');
      return;
    }

    try {
      const exists = await this.client.indices.exists({ index: indexName });
      
      if (!(exists as any).body) {
        await this.client.indices.create({
          index: indexName,
          body: {
            mappings: mapping
          }
        });

        this.logger.info('Elasticsearch index created', { index: indexName });
      }
    } catch (error) {
      this.logger.error('Failed to create Elasticsearch index', error as Error);
      throw error;
    }
  }

  /**
   * ドキュメント追加
   */
  async indexDocument(indexName: string, document: any): Promise<void> {
    if (!this.client) {
      this.logger.warn('Elasticsearch not connected - skipping document indexing');
      return;
    }

    try {
      await this.client.index({
        index: indexName,
        body: document
      });
    } catch (error) {
      this.logger.error('Failed to index document', error as Error);
      throw error;
    }
  }

  /**
   * 統計情報取得
   */
  async getStats(): Promise<any> {
    if (!this.client) {
      return {
        status: 'disconnected',
        indices: 0,
        documents: 0
      };
    }

    try {
      const stats = await this.client.cluster.stats();
      return {
        status: 'connected',
        indices: (stats as any).body?.indices?.count || 0,
        documents: (stats as any).body?.indices?.docs?.count || 0
      };
    } catch (error) {
      this.logger.error('Failed to get Elasticsearch stats', error as Error);
      return {
        status: 'error',
        error: (error as Error).message
      };
    }
  }
}