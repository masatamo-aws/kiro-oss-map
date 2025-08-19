/**
 * Kiro OSS Map v2.1.0 - 地図サービス ストレージサービス
 * ローカル・S3・GCS対応統一ストレージインターface
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { S3 } from 'aws-sdk';
// import { Storage as GCSStorage } from '@google-cloud/storage';
import { StorageConfig } from '../config/index.js';
import { Logger } from '../../../shared/utils/logger.js';

/**
 * ストレージエラー
 */
export class StorageError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * ストレージオブジェクト情報
 */
export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
}

/**
 * ストレージサービス抽象インターface
 */
export interface IStorageService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<Buffer>;
  getStream(key: string): Promise<NodeJS.ReadableStream>;
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  putStream(key: string, stream: NodeJS.ReadableStream, contentType?: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string, limit?: number): Promise<StorageObject[]>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }>;
}

/**
 * ローカルストレージ実装
 */
class LocalStorage implements IStorageService {
  constructor(
    private config: NonNullable<StorageConfig['local']>,
    private logger: Logger
  ) {}

  async connect(): Promise<void> {
    // ディレクトリ作成
    await fs.mkdir(this.config.basePath, { recursive: true });
    await fs.mkdir(this.config.tilesPath, { recursive: true });
    await fs.mkdir(this.config.stylesPath, { recursive: true });
    
    this.logger.info('Local storage initialized', {
      basePath: this.config.basePath
    });
  }

  async disconnect(): Promise<void> {
    // ローカルストレージは特に切断処理不要
  }

  private getFilePath(key: string): string {
    return path.join(this.config.basePath, key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.getFilePath(key));
    } catch (error) {
      throw new StorageError(`Failed to read file: ${key}`, error as Error);
    }
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const filePath = this.getFilePath(key);
    
    if (!(await this.exists(key))) {
      throw new StorageError(`File not found: ${key}`);
    }
    
    return createReadStream(filePath);
  }

  async put(key: string, data: Buffer, contentType?: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, data);
    } catch (error) {
      throw new StorageError(`Failed to write file: ${key}`, error as Error);
    }
  }

  async putStream(key: string, stream: NodeJS.ReadableStream, contentType?: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      const writeStream = createWriteStream(filePath);
      
      return new Promise((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', reject);
      });
    } catch (error) {
      throw new StorageError(`Failed to write stream: ${key}`, error as Error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(key));
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw new StorageError(`Failed to delete file: ${key}`, error as Error);
      }
    }
  }

  async list(prefix?: string, limit?: number): Promise<StorageObject[]> {
    try {
      const searchPath = prefix ? path.join(this.config.basePath, prefix) : this.config.basePath;
      const files = await this.listFilesRecursive(searchPath, this.config.basePath);
      
      const objects = await Promise.all(
        files.slice(0, limit).map(async (filePath) => {
          const stats = await fs.stat(filePath);
          const key = path.relative(this.config.basePath, filePath).replace(/\\/g, '/');
          
          return {
            key,
            size: stats.size,
            lastModified: stats.mtime,
            contentType: this.getContentType(key)
          };
        })
      );
      
      return objects;
    } catch (error) {
      throw new StorageError(`Failed to list files`, error as Error);
    }
  }

  private async listFilesRecursive(dir: string, basePath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...await this.listFilesRecursive(fullPath, basePath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は空配列を返す
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
    
    return files;
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    // ローカルストレージでは相対URLを返す
    return `/files/${key}`;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // ベースディレクトリへの書き込みテスト
      const testFile = path.join(this.config.basePath, '.health-check');
      await fs.writeFile(testFile, 'health-check');
      await fs.unlink(testFile);
      
      return {
        status: 'healthy',
        details: {
          type: 'local',
          basePath: this.config.basePath,
          accessible: true
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          type: 'local',
          error: (error as Error).message
        }
      };
    }
  }

  private getContentType(key: string): string {
    const ext = path.extname(key).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.json': 'application/json',
      '.pbf': 'application/x-protobuf'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

/**
 * S3ストレージ実装
 */
class S3Storage implements IStorageService {
  private s3: S3;

  constructor(
    private config: NonNullable<StorageConfig['s3']>,
    private logger: Logger
  ) {
    this.s3 = new S3({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      region: this.config.region,
      ...(this.config.endpoint && { endpoint: this.config.endpoint })
    });
  }

  async connect(): Promise<void> {
    // S3接続テスト
    try {
      await this.s3.headBucket({ Bucket: this.config.bucket }).promise();
      this.logger.info('S3 storage connected', {
        bucket: this.config.bucket,
        region: this.config.region
      });
    } catch (error) {
      throw new StorageError('Failed to connect to S3', error as Error);
    }
  }

  async disconnect(): Promise<void> {
    // S3は特に切断処理不要
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: this.config.bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return false;
      }
      throw new StorageError(`Failed to check object existence: ${key}`, error as Error);
    }
  }

  async get(key: string): Promise<Buffer> {
    try {
      const result = await this.s3.getObject({
        Bucket: this.config.bucket,
        Key: key
      }).promise();
      
      return result.Body as Buffer;
    } catch (error) {
      throw new StorageError(`Failed to get object: ${key}`, error as Error);
    }
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    try {
      const result = this.s3.getObject({
        Bucket: this.config.bucket,
        Key: key
      }).createReadStream();
      
      return result;
    } catch (error) {
      throw new StorageError(`Failed to get object stream: ${key}`, error as Error);
    }
  }

  async put(key: string, data: Buffer, contentType?: string): Promise<void> {
    try {
      await this.s3.putObject({
        Bucket: this.config.bucket,
        Key: key,
        Body: data,
        ContentType: contentType || this.getContentType(key)
      }).promise();
    } catch (error) {
      throw new StorageError(`Failed to put object: ${key}`, error as Error);
    }
  }

  async putStream(key: string, stream: NodeJS.ReadableStream, contentType?: string): Promise<void> {
    try {
      await this.s3.upload({
        Bucket: this.config.bucket,
        Key: key,
        Body: stream,
        ContentType: contentType || this.getContentType(key)
      }).promise();
    } catch (error) {
      throw new StorageError(`Failed to put object stream: ${key}`, error as Error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.config.bucket,
        Key: key
      }).promise();
    } catch (error) {
      throw new StorageError(`Failed to delete object: ${key}`, error as Error);
    }
  }

  async list(prefix?: string, limit?: number): Promise<StorageObject[]> {
    try {
      const result = await this.s3.listObjectsV2({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: limit
      }).promise();
      
      return (result.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size!,
        lastModified: obj.LastModified!,
        etag: obj.ETag
      }));
    } catch (error) {
      throw new StorageError('Failed to list objects', error as Error);
    }
  }

  async getUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return this.s3.getSignedUrl('getObject', {
        Bucket: this.config.bucket,
        Key: key,
        Expires: expiresIn
      });
    } catch (error) {
      throw new StorageError(`Failed to generate signed URL: ${key}`, error as Error);
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      await this.s3.headBucket({ Bucket: this.config.bucket }).promise();
      
      return {
        status: 'healthy',
        details: {
          type: 's3',
          bucket: this.config.bucket,
          region: this.config.region,
          accessible: true
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          type: 's3',
          bucket: this.config.bucket,
          error: (error as Error).message
        }
      };
    }
  }

  private getContentType(key: string): string {
    const ext = path.extname(key).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.json': 'application/json',
      '.pbf': 'application/x-protobuf'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

/**
 * ストレージサービスファクトリー
 */
export class StorageService implements IStorageService {
  private storage: IStorageService;

  constructor(
    private config: StorageConfig,
    private logger: Logger
  ) {
    switch (config.type) {
      case 'local':
        if (!config.local) {
          throw new StorageError('Local storage configuration is required');
        }
        this.storage = new LocalStorage(config.local, logger);
        break;
        
      case 's3':
        if (!config.s3) {
          throw new StorageError('S3 storage configuration is required');
        }
        this.storage = new S3Storage(config.s3, logger);
        break;
        
      case 'gcs':
        throw new StorageError('GCS storage not implemented yet');
        
      default:
        throw new StorageError(`Unsupported storage type: ${config.type}`);
    }
  }

  async connect(): Promise<void> {
    return this.storage.connect();
  }

  async disconnect(): Promise<void> {
    return this.storage.disconnect();
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.exists(key);
  }

  async get(key: string): Promise<Buffer> {
    return this.storage.get(key);
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    return this.storage.getStream(key);
  }

  async put(key: string, data: Buffer, contentType?: string): Promise<void> {
    return this.storage.put(key, data, contentType);
  }

  async putStream(key: string, stream: NodeJS.ReadableStream, contentType?: string): Promise<void> {
    return this.storage.putStream(key, stream, contentType);
  }

  async delete(key: string): Promise<void> {
    return this.storage.delete(key);
  }

  async list(prefix?: string, limit?: number): Promise<StorageObject[]> {
    return this.storage.list(prefix, limit);
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    return this.storage.getUrl(key, expiresIn);
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    return this.storage.healthCheck();
  }

  /**
   * ストレージタイプ取得
   */
  getType(): string {
    return this.config.type;
  }
}

export default StorageService;