/**
 * Kiro OSS Map v2.1.0 - 簡易地図サービス
 * テスト用の基本的な地図サービス実装
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    uptime: process.uptime(),
    services: {
      redis: {
        status: 'down',
        details: 'Mock mode - Redis not connected'
      },
      storage: {
        status: 'up',
        details: 'Local storage available'
      }
    }
  });
});

// タイル統計
app.get('/tiles/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalTiles: 1000000,
      cacheHitRate: 0.85,
      averageResponseTime: 25,
      formats: {
        png: 600000,
        jpg: 250000,
        webp: 150000
      },
      storage: {
        type: 'local',
        size: '2.5GB',
        available: '50GB'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// スタイル一覧
app.get('/styles', (req, res) => {
  const styles = [
    {
      id: 'basic',
      name: 'Basic Style',
      description: '基本的な地図スタイル',
      version: '1.0.0',
      createdAt: '2025-01-01T00:00:00Z'
    },
    {
      id: 'satellite',
      name: 'Satellite Style',
      description: '衛星画像スタイル',
      version: '1.0.0',
      createdAt: '2025-01-01T00:00:00Z'
    }
  ];

  res.json({
    success: true,
    data: {
      styles,
      count: styles.length
    },
    timestamp: new Date().toISOString()
  });
});

// 詳細ヘルスチェック
app.get('/health/detailed', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      uptime: process.uptime(),
      services: {
        redis: {
          status: 'down',
          details: 'Mock mode - Redis not connected'
        },
        storage: {
          status: 'up',
          details: 'Local storage available'
        }
      },
      system: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        },
        cpu: {
          usage: process.cpuUsage().user / 1000000
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Kubernetes Liveness Probe
app.get('/health/live', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString()
    }
  });
});

// Kubernetes Readiness Probe
app.get('/health/ready', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ready',
      timestamp: new Date().toISOString()
    }
  });
});

// Kubernetes Startup Probe
app.get('/health/startup', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'started',
      timestamp: new Date().toISOString()
    }
  });
});

// Prometheusメトリクス
app.get('/metrics', (req, res) => {
  const metrics = `# HELP map_service_info Service information
# TYPE map_service_info gauge
map_service_info{version="2.1.0",service="map-service"} 1

# HELP map_service_uptime_seconds Service uptime in seconds
# TYPE map_service_uptime_seconds counter
map_service_uptime_seconds ${process.uptime()}

# HELP map_service_memory_usage_bytes Memory usage in bytes
# TYPE map_service_memory_usage_bytes gauge
map_service_memory_usage_bytes{type="heap_used"} ${process.memoryUsage().heapUsed}
map_service_memory_usage_bytes{type="heap_total"} ${process.memoryUsage().heapTotal}
map_service_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}

# HELP map_service_requests_total Total number of requests
# TYPE map_service_requests_total counter
map_service_requests_total 0
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🗺️  Map Service (Simple) started on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Tiles: http://localhost:${PORT}/tiles/1/0/0.png`);
  console.log(`   Styles: http://localhost:${PORT}/styles`);
  console.log(`   Metrics: http://localhost:${PORT}/metrics`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('Map Service shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Map Service shutting down...');
  process.exit(0);
});

// Liveness Probe
app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness Probe
app.get('/health/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// メトリクス
app.get('/metrics', (req, res) => {
  const uptime = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();
  
  const metrics = `# HELP map_service_info Service information
# TYPE map_service_info gauge
map_service_info{version="2.1.0",service="map-service"} 1

# HELP map_service_uptime_seconds Service uptime in seconds
# TYPE map_service_uptime_seconds counter
map_service_uptime_seconds ${uptime}

# HELP map_service_memory_usage_bytes Memory usage in bytes
# TYPE map_service_memory_usage_bytes gauge
map_service_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}
map_service_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}
map_service_memory_usage_bytes{type="rss"} ${memUsage.rss}
`;

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics);
});