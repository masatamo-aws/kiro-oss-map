/**
 * Kiro OSS Map v2.1.0 - 共通ログユーティリティ
 * マイクロサービス間で統一されたログ機能
 */

import { LogEntry, LogLevel, LogError } from '../types/common';

/**
 * ログ設定
 */
export interface LoggerConfig {
  service: string;
  version: string;
  level: LogLevel;
  format: 'json' | 'text';
  enableColors: boolean;
  enableTimestamp: boolean;
}

/**
 * ログコンテキスト
 */
export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * 統一ログクラス
 */
export class Logger {
  private config: LoggerConfig;
  private context: LogContext;

  constructor(config: LoggerConfig, context: LogContext = {}) {
    this.config = config;
    this.context = context;
  }

  /**
   * コンテキスト付きロガーを作成
   */
  child(context: Partial<LogContext>): Logger {
    return new Logger(this.config, { ...this.context, ...context });
  }

  /**
   * デバッグログ
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * 情報ログ
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * 警告ログ
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * エラーログ
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const logError: LogError | undefined = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack || ''
    } : undefined;

    this.log(LogLevel.ERROR, message, metadata, logError);
  }

  /**
   * ログ出力
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: LogError
  ): void {
    // ログレベルチェック
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.config.service,
      version: this.config.version,
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      userId: this.context.userId,
      requestId: this.context.requestId || this.generateRequestId(),
      message,
      metadata: { ...this.context.metadata, ...metadata },
      error
    };

    // フォーマットして出力
    const output = this.formatLog(entry);
    this.writeLog(level, output);
  }

  /**
   * ログレベルチェック
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * ログフォーマット
   */
  private formatLog(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify(entry);
    }

    // テキストフォーマット
    const timestamp = this.config.enableTimestamp ? `[${entry.timestamp}] ` : '';
    const level = this.formatLevel(entry.level);
    const service = `[${entry.service}]`;
    const traceInfo = entry.traceId ? ` trace=${entry.traceId}` : '';
    const userInfo = entry.userId ? ` user=${entry.userId}` : '';
    
    let output = `${timestamp}${level} ${service}${traceInfo}${userInfo}: ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += ` ${JSON.stringify(entry.metadata)}`;
    }
    
    if (entry.error) {
      output += `\n${entry.error.stack}`;
    }
    
    return output;
  }

  /**
   * ログレベルフォーマット
   */
  private formatLevel(level: LogLevel): string {
    if (!this.config.enableColors) {
      return level.toUpperCase().padEnd(5);
    }

    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m'  // Red
    };

    const reset = '\x1b[0m';
    const color = colors[level] || '';
    return `${color}${level.toUpperCase().padEnd(5)}${reset}`;
  }

  /**
   * ログ出力
   */
  private writeLog(level: LogLevel, output: string): void {
    if (level === LogLevel.ERROR) {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  /**
   * リクエストID生成
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * デフォルトロガー設定
 */
const defaultConfig: LoggerConfig = {
  service: 'unknown',
  version: '1.0.0',
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  format: process.env.NODE_ENV === 'production' ? 'json' : 'text',
  enableColors: process.env.NODE_ENV !== 'production',
  enableTimestamp: true
};

/**
 * ロガーファクトリー
 */
export function createLogger(
  service: string,
  version: string = '1.0.0',
  config: Partial<LoggerConfig> = {}
): Logger {
  const loggerConfig: LoggerConfig = {
    ...defaultConfig,
    service,
    version,
    ...config
  };

  return new Logger(loggerConfig);
}

/**
 * Express.js用ログミドルウェア
 */
export function createLoggerMiddleware(logger: Logger) {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || logger['generateRequestId']();
    const traceId = req.headers['x-trace-id'];
    const userId = req.user?.id;

    // リクエストログ
    const requestLogger = logger.child({
      requestId,
      traceId,
      userId,
      metadata: {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });

    requestLogger.info('Request started');

    // レスポンス時間計測
    const startTime = Date.now();

    // レスポンス完了時のログ
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      requestLogger.info('Request completed', {
        statusCode,
        duration,
        contentLength: res.get('content-length')
      });
    });

    // リクエストオブジェクトにロガーを追加
    req.logger = requestLogger;
    next();
  };
}

/**
 * エラーハンドリングミドルウェア
 */
export function createErrorLoggerMiddleware(logger: Logger) {
  return (error: Error, req: any, res: any, next: any) => {
    const requestLogger = req.logger || logger;
    
    requestLogger.error('Request error', error, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode
    });

    next(error);
  };
}

/**
 * 非同期エラーキャッチャー
 */
export function asyncErrorHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * プロセス終了時のログ
 */
export function setupProcessLoggers(logger: Logger): void {
  // 未処理の例外
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
  });

  // 未処理のPromise拒否
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled promise rejection', new Error(String(reason)), {
      promise: promise.toString()
    });
    process.exit(1);
  });

  // SIGTERM シグナル
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  // SIGINT シグナル
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}

// デフォルトエクスポート
export default Logger;