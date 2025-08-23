/**
 * Kiro OSS Map - エラーハンドリングユーティリティ v2.2.0
 * 統一されたエラー処理とログ機能
 */

/**
 * エラー分類
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHZ_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * カスタムエラークラス
 */
export class KiroError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, details = null) {
    super(message);
    this.name = 'KiroError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // スタックトレースを保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KiroError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * エラーハンドラー
 */
export class ErrorHandler {
  static handle(error, context = 'Unknown') {
    console.error(`[ErrorHandler] [${context}]:`, error);
    
    // エラー分類
    const errorType = this.classifyError(error);
    
    // ユーザーフレンドリーメッセージ
    const userMessage = this.getUserMessage(errorType, error);
    
    // エラーログ送信
    this.logError(error, context, errorType);
    
    return {
      type: errorType,
      message: userMessage,
      originalError: error
    };
  }
  
  static classifyError(error) {
    if (error.name === 'TypeError') return ErrorTypes.CLIENT;
    if (error.name === 'ReferenceError') return ErrorTypes.CLIENT;
    if (error.message.includes('fetch')) return ErrorTypes.NETWORK;
    if (error.message.includes('401')) return ErrorTypes.AUTHENTICATION;
    if (error.message.includes('403')) return ErrorTypes.AUTHORIZATION;
    if (error.message.includes('404')) return ErrorTypes.NOT_FOUND;
    if (error.message.includes('500')) return ErrorTypes.SERVER;
    
    return ErrorTypes.UNKNOWN;
  }
  
  static getUserMessage(errorType, error) {
    const messages = {
      [ErrorTypes.NETWORK]: 'ネットワーク接続に問題があります。しばらく待ってから再試行してください。',
      [ErrorTypes.VALIDATION]: '入力内容に問題があります。確認して再試行してください。',
      [ErrorTypes.AUTHENTICATION]: 'ログインが必要です。',
      [ErrorTypes.AUTHORIZATION]: 'この操作を実行する権限がありません。',
      [ErrorTypes.NOT_FOUND]: '要求されたリソースが見つかりません。',
      [ErrorTypes.SERVER]: 'サーバーエラーが発生しました。しばらく待ってから再試行してください。',
      [ErrorTypes.CLIENT]: 'アプリケーションエラーが発生しました。',
      [ErrorTypes.UNKNOWN]: '予期しないエラーが発生しました。'
    };
    
    return messages[errorType] || messages[ErrorTypes.UNKNOWN];
  }
  
  static logError(error, context, errorType) {
    const logData = {
      timestamp: new Date().toISOString(),
      context,
      errorType,
      message: error.message,
      stack: error.stack,
      userAgent: navigator?.userAgent,
      url: window?.location?.href
    };
    
    // 本番環境でのみ外部ログサービスに送信
    if (window.location.hostname !== 'localhost') {
      this.sendToLogService(logData);
    }
  }
  
  static async sendToLogService(logData) {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
    } catch (logError) {
      console.error('Failed to send error log:', logError);
    }
  }
}

/**
 * 非同期関数のエラーハンドリングラッパー
 */
export const asyncErrorHandler = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return ErrorHandler.handle(error, fn.name);
    }
  };
};

/**
 * Promise エラーハンドリング
 */
export const handlePromise = (promise) => {
  return promise
    .then(data => [null, data])
    .catch(error => [ErrorHandler.handle(error), null]);
};
