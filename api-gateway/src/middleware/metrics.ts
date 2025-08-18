/**
 * Metrics middleware for Kiro OSS Map API Gateway
 * Provides Prometheus-compatible metrics collection
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Metrics storage
interface MetricsData {
  httpRequestsTotal: Map<string, number>;
  httpRequestDuration: Map<string, number[]>;
  httpRequestsInFlight: number;
  apiKeyUsage: Map<string, number>;
  errorCount: Map<string, number>;
  startTime: number;
}

class MetricsCollector {
  private metrics: MetricsData;

  constructor() {
    this.metrics = {
      httpRequestsTotal: new Map(),
      httpRequestDuration: new Map(),
      httpRequestsInFlight: 0,
      apiKeyUsage: new Map(),
      errorCount: new Map(),
      startTime: Date.now()
    };
  }

  /**
   * Middleware to collect HTTP metrics
   */
  collectHttpMetrics() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      this.metrics.httpRequestsInFlight++;

      // Track API key usage
      const apiKey = req.headers['x-api-key'] as string;
      if (apiKey) {
        const currentCount = this.metrics.apiKeyUsage.get(apiKey) || 0;
        this.metrics.apiKeyUsage.set(apiKey, currentCount + 1);
      }

      // Override res.end to capture metrics
      const originalEnd = res.end.bind(res);
      const metricsCollectorRef = this;
      
      res.end = function(this: Response, ...args: any[]): Response {
        const duration = Date.now() - startTime;
        const method = req.method;
        const route = req.route?.path || req.path;
        const statusCode = res.statusCode;
        const key = `${method}:${route}:${statusCode}`;

        // Update request count
        const currentCount = metricsCollectorRef.metrics.httpRequestsTotal.get(key) || 0;
        metricsCollectorRef.metrics.httpRequestsTotal.set(key, currentCount + 1);

        // Update duration
        const durations = metricsCollectorRef.metrics.httpRequestDuration.get(key) || [];
        durations.push(duration);
        // Keep only last 1000 measurements for memory efficiency
        if (durations.length > 1000) {
          durations.shift();
        }
        metricsCollectorRef.metrics.httpRequestDuration.set(key, durations);

        // Track errors
        if (statusCode >= 400) {
          const errorKey = `${statusCode}`;
          const errorCount = metricsCollectorRef.metrics.errorCount.get(errorKey) || 0;
          metricsCollectorRef.metrics.errorCount.set(errorKey, errorCount + 1);
        }

        metricsCollectorRef.metrics.httpRequestsInFlight--;

        // Log slow requests
        if (duration > 1000) {
          logger.warn('Slow request detected', {
            method,
            path: req.path,
            duration,
            statusCode,
            userAgent: req.get('User-Agent')
          });
        }

        return originalEnd(...args);
      };

      next();
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const now = Date.now();

    // HTTP requests total
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, count] of this.metrics.httpRequestsTotal) {
      const [method, route, statusCode] = key.split(':');
      lines.push(`http_requests_total{method="${method}",route="${route}",status_code="${statusCode}"} ${count}`);
    }

    // HTTP request duration
    lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
    lines.push('# TYPE http_request_duration_seconds histogram');
    for (const [key, durations] of this.metrics.httpRequestDuration) {
      const [method, route, statusCode] = key.split(':');
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length / 1000;
        const p95 = this.calculatePercentile(durations, 0.95) / 1000;
        const p99 = this.calculatePercentile(durations, 0.99) / 1000;
        
        lines.push(`http_request_duration_seconds{method="${method}",route="${route}",status_code="${statusCode}",quantile="0.5"} ${avg.toFixed(3)}`);
        lines.push(`http_request_duration_seconds{method="${method}",route="${route}",status_code="${statusCode}",quantile="0.95"} ${p95.toFixed(3)}`);
        lines.push(`http_request_duration_seconds{method="${method}",route="${route}",status_code="${statusCode}",quantile="0.99"} ${p99.toFixed(3)}`);
      }
    }

    // Requests in flight
    lines.push('# HELP http_requests_in_flight Number of HTTP requests currently being processed');
    lines.push('# TYPE http_requests_in_flight gauge');
    lines.push(`http_requests_in_flight ${this.metrics.httpRequestsInFlight}`);

    // API key usage
    lines.push('# HELP api_key_usage_total Total API key usage count');
    lines.push('# TYPE api_key_usage_total counter');
    for (const [apiKey, count] of this.metrics.apiKeyUsage) {
      const maskedKey = this.maskApiKey(apiKey);
      lines.push(`api_key_usage_total{api_key="${maskedKey}"} ${count}`);
    }

    // Error count
    lines.push('# HELP http_errors_total Total number of HTTP errors');
    lines.push('# TYPE http_errors_total counter');
    for (const [statusCode, count] of this.metrics.errorCount) {
      lines.push(`http_errors_total{status_code="${statusCode}"} ${count}`);
    }

    // Uptime
    const uptimeSeconds = (now - this.metrics.startTime) / 1000;
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds counter');
    lines.push(`process_uptime_seconds ${uptimeSeconds.toFixed(0)}`);

    // Memory usage
    const memUsage = process.memoryUsage();
    lines.push('# HELP process_memory_usage_bytes Process memory usage in bytes');
    lines.push('# TYPE process_memory_usage_bytes gauge');
    lines.push(`process_memory_usage_bytes{type="rss"} ${memUsage.rss}`);
    lines.push(`process_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}`);
    lines.push(`process_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Get metrics summary for health check
   */
  getMetricsSummary() {
    const totalRequests = Array.from(this.metrics.httpRequestsTotal.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.metrics.errorCount.values()).reduce((a, b) => a + b, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) : '0.00';

    return {
      totalRequests,
      totalErrors,
      errorRate: `${errorRate}%`,
      requestsInFlight: this.metrics.httpRequestsInFlight,
      uniqueApiKeys: this.metrics.apiKeyUsage.size,
      uptime: Math.floor((Date.now() - this.metrics.startTime) / 1000)
    };
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(arr: number[], percentile: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  /**
   * Mask API key for security
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }
    return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.metrics = {
      httpRequestsTotal: new Map(),
      httpRequestDuration: new Map(),
      httpRequestsInFlight: 0,
      apiKeyUsage: new Map(),
      errorCount: new Map(),
      startTime: Date.now()
    };
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();

// Export middleware function
export const collectMetrics = () => metricsCollector.collectHttpMetrics();