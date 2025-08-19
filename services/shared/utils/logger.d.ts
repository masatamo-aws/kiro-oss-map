/**
 * Kiro OSS Map v2.1.0 - 共通ログユーティリティ
 * マイクロサービス間で統一されたログ機能
 */
import { LogLevel } from '../types/common';
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
export declare class Logger {
    private config;
    private context;
    constructor(config: LoggerConfig, context?: LogContext);
    /**
     * コンテキスト付きロガーを作成
     */
    child(context: Partial<LogContext>): Logger;
    /**
     * デバッグログ
     */
    debug(message: string, metadata?: Record<string, any>): void;
    /**
     * 情報ログ
     */
    info(message: string, metadata?: Record<string, any>): void;
    /**
     * 警告ログ
     */
    warn(message: string, metadata?: Record<string, any>): void;
    /**
     * エラーログ
     */
    error(message: string, error?: Error, metadata?: Record<string, any>): void;
    /**
     * ログ出力
     */
    private log;
    /**
     * ログレベルチェック
     */
    private shouldLog;
    /**
     * ログフォーマット
     */
    private formatLog;
    /**
     * ログレベルフォーマット
     */
    private formatLevel;
    /**
     * ログ出力
     */
    private writeLog;
    /**
     * リクエストID生成
     */
    private generateRequestId;
}
/**
 * ロガーファクトリー
 */
export declare function createLogger(service: string, version?: string, config?: Partial<LoggerConfig>): Logger;
/**
 * Express.js用ログミドルウェア
 */
export declare function createLoggerMiddleware(logger: Logger): (req: any, res: any, next: any) => void;
/**
 * エラーハンドリングミドルウェア
 */
export declare function createErrorLoggerMiddleware(logger: Logger): (error: Error, req: any, res: any, next: any) => void;
/**
 * 非同期エラーキャッチャー
 */
export declare function asyncErrorHandler(fn: Function): (req: any, res: any, next: any) => void;
/**
 * プロセス終了時のログ
 */
export declare function setupProcessLoggers(logger: Logger): void;
export default Logger;
//# sourceMappingURL=logger.d.ts.map