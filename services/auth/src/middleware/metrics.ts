/**
 * Kiro OSS Map v2.1.0 - 認証サービス メトリクス収集
 * Prometheus対応・パフォーマンス監視
 */

import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * メトリクス収集クラス
 */
export class MetricsCollector {
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestsInProgress: Gauge<string>;
  private authAttemptsTotal: Counter<string>;
  private activeSessionsGauge: Gauge<string>;
  private dbConnectionsActive: Gauge<string>;
  private dbQueryDuration: Histogram<string>;
  private redisOperationDuration: Histogram<string>;

  constructor(serviceName: string) {
    // デフォルトメトリクス収集開始
    const sanitizedServiceName = serviceName.replace(/-/g, '_');
    collectDefaultMetrics({
      prefix: `${sanitizedServiceName}_`,
      register
    });

    // HTTP リクエストメトリクス
    this.httpRequestsTotal = new Counter({
      name: `${sanitizedServiceName}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register]
    });

    this.httpRequestDuration = new Histogram({
      name: `${sanitizedServiceName}_http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [register]
    });

    this.httpRequestsInProgress = new Gauge({
      name: `${sanitizedServiceName}_http_requests_in_progress`,
      help: 'Number of HTTP requests currently being processed',
      registers: [register]
    });

    // 認証メトリクス
    this.authAttemptsTotal = new Counter({
      name: `${sanitizedServiceName}_auth_attempts_total`,
      help: 'Total number of authentication attempts',
      labelNames: ['type', 'result'],
      registers: [register]
    });

    this.activeSessionsGauge = new Gauge({
      name: `${sanitizedServiceName}_active_sessions`,
      help: 'Number of active user sessions',
      registers: [register]
    });

    // データベースメトリクス
    this.dbConnectionsActive = new Gauge({
      name: `${sanitizedServiceName}_db_connections_active`,
      help: 'Number of active database connections',
      registers: [register]
    });

    this.dbQueryDuration = new Histogram({
      name: `${sanitizedServiceName}_db_query_duration_seconds`,
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
      registers: [register]
    });

    // Redisメトリクス
    this.redisOperationDuration = new Histogram({
      name: `${sanitizedServiceName}_redis_operation_duration_seconds`,
      help: 'Duration of Redis operations in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1],
      registers: [register]
    });
  }

  /**
   * HTTPリクエストメトリクス収集ミドルウェア
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // 進行中リクエスト数増加
      this.httpRequestsInProgress.inc();

      // レスポンス完了時の処理
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const route = this.getRoutePattern(req.route?.path || req.path);
        
        // メトリクス記録
        this.httpRequestsTotal
          .labels(req.method, route, res.statusCode.toString())
          .inc();
        
        this.httpRequestDuration
          .labels(req.method, route)
          .observe(duration);
        
        // 進行中リクエスト数減少
        this.httpRequestsInProgress.dec();
      });

      next();
    };
  }

  /**
   * 認証試行記録
   */
  recordAuthAttempt(type: 'login' | 'register' | 'refresh', result: 'success' | 'failure'): void {
    this.authAttemptsTotal.labels(type, result).inc();
  }

  /**
   * アクティブセッション数更新
   */
  setActiveSessions(count: number): void {
    this.activeSessionsGauge.set(count);
  }

  /**
   * データベース接続数更新
   */
  setDbConnections(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  /**
   * データベースクエリ時間記録
   */
  recordDbQuery(operation: string, table: string, duration: number): void {
    this.dbQueryDuration.labels(operation, table).observe(duration / 1000);
  }

  /**
   * Redis操作時間記録
   */
  recordRedisOperation(operation: string, duration: number): void {
    this.redisOperationDuration.labels(operation).observe(duration / 1000);
  }

  /**
   * ルートパターン正規化
   */
  private getRoutePattern(path: string): string {
    // パラメータを正規化（例: /users/123 -> /users/:id）
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[^\/]+@[^\/]+/g, '/:email');
  }

  /**
   * メトリクス取得
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * メトリクスサマリー取得
   */
  async getMetricsSummary(): Promise<any> {
    const metrics = await register.getMetricsAsJSON();
    
    const summary: any = {
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      version: '2.1.0',
      metrics: {}
    };

    // HTTP メトリクス
    const httpRequests = metrics.find(m => m.name.includes('http_requests_total'));
    const httpDuration = metrics.find(m => m.name.includes('http_request_duration'));
    const httpInProgress = metrics.find(m => m.name.includes('http_requests_in_progress'));

    if (httpRequests && httpRequests.values) {
      summary.metrics.http = {
        totalRequests: httpRequests.values.reduce((sum: number, v: any) => sum + v.value, 0),
        requestsInProgress: httpInProgress?.values?.[0]?.value || 0
      };
    }

    // 認証メトリクス
    const authAttempts = metrics.find(m => m.name.includes('auth_attempts_total'));
    const activeSessions = metrics.find(m => m.name.includes('active_sessions'));

    if (authAttempts && authAttempts.values) {
      const loginSuccess = authAttempts.values.find((v: any) => 
        v.labels.type === 'login' && v.labels.result === 'success'
      )?.value || 0;
      
      const loginFailure = authAttempts.values.find((v: any) => 
        v.labels.type === 'login' && v.labels.result === 'failure'
      )?.value || 0;

      summary.metrics.auth = {
        loginAttempts: {
          success: loginSuccess,
          failure: loginFailure,
          successRate: loginSuccess + loginFailure > 0 ? 
            (loginSuccess / (loginSuccess + loginFailure) * 100).toFixed(2) + '%' : '0%'
        },
        activeSessions: activeSessions?.values?.[0]?.value || 0
      };
    }

    // データベースメトリクス
    const dbConnections = metrics.find(m => m.name.includes('db_connections_active'));
    const dbQueries = metrics.find(m => m.name.includes('db_query_duration'));

    if (dbConnections) {
      summary.metrics.database = {
        activeConnections: dbConnections.values?.[0]?.value || 0
      };

      if (dbQueries && dbQueries.values) {
        const queryCount = dbQueries.values.reduce((sum: number, v: any) => sum + v.value, 0);
        summary.metrics.database.queryCount = queryCount;
      }
    }

    // システムメトリクス
    const processMemory = metrics.find(m => m.name.includes('process_resident_memory_bytes'));
    const processCpu = metrics.find(m => m.name.includes('process_cpu_user_seconds_total'));
    const processUptime = metrics.find(m => m.name.includes('process_start_time_seconds'));

    if (processMemory || processCpu || processUptime) {
      summary.metrics.system = {
        memoryUsage: processMemory?.values?.[0]?.value || 0,
        cpuUsage: processCpu?.values?.[0]?.value || 0,
        uptime: processUptime?.values?.[0]?.value ? 
          Date.now() / 1000 - processUptime.values[0].value : 0
      };
    }

    return summary;
  }

  /**
   * メトリクスリセット
   */
  reset(): void {
    register.clear();
  }
}

export default MetricsCollector;