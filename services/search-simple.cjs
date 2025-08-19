/**
 * Kiro OSS Map v2.1.0 - 簡易検索サービス
 * テスト用の基本的な検索サービス実装
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3003;

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
      elasticsearch: {
        status: 'down',
        details: 'Mock mode - Elasticsearch not connected'
      },
      redis: {
        status: 'down',
        details: 'Mock mode - Redis not connected'
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
  });
});

// 詳細ヘルスチェック
app.get('/health/detailed', (req, res) => {
  res.json({
    status: 'degraded',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    uptime: process.uptime(),
    services: {
      elasticsearch: {
        status: 'down',
        error: 'Not configured in development mode'
      },
      redis: {
        status: 'down',
        error: 'Not configured in development mode'
      },
      search: {
        status: 'up',
        details: 'Mock search service running'
      },
      geocoding: {
        status: 'up',
        details: 'Mock geocoding service running'
      },
      poi: {
        status: 'up',
        details: 'Mock POI service running'
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
  });
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
  
  const metrics = `# HELP search_service_info Service information
# TYPE search_service_info gauge
search_service_info{version="2.1.0",service="search-service"} 1

# HELP search_service_uptime_seconds Service uptime in seconds
# TYPE search_service_uptime_seconds counter
search_service_uptime_seconds ${uptime}

# HELP search_service_memory_usage_bytes Memory usage in bytes
# TYPE search_service_memory_usage_bytes gauge
search_service_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}
search_service_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}
search_service_memory_usage_bytes{type="rss"} ${memUsage.rss}
`;

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics);
});

// 基本検索
app.get('/search', (req, res) => {
  const { q: query, limit = 10 } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'Query parameter is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // モック検索結果
  const results = [
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
  ].slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      query,
      results,
      count: results.length
    },
    timestamp: new Date().toISOString()
  });
});

// オートコンプリート
app.get('/search/autocomplete', (req, res) => {
  const { q: query, limit = 5 } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'Query parameter is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  const suggestions = [
    `${query} Station`,
    `${query} Park`,
    `${query} Mall`,
    `${query} Hotel`,
    `${query} Restaurant`
  ].slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      query,
      suggestions,
      count: suggestions.length
    },
    timestamp: new Date().toISOString()
  });
});

// ジオコーディング
app.get('/geocoding', (req, res) => {
  const { address } = req.query;
  
  if (!address) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_ADDRESS',
        message: 'Address parameter is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  const results = [
    {
      address: address,
      location: {
        lat: 35.6812 + (Math.random() - 0.5) * 0.01,
        lng: 139.7671 + (Math.random() - 0.5) * 0.01
      },
      accuracy: 0.9,
      components: {
        country: 'Japan',
        region: 'Tokyo',
        city: 'Chiyoda',
        district: 'Marunouchi'
      }
    }
  ];

  res.json({
    success: true,
    data: {
      address,
      results,
      count: results.length
    },
    timestamp: new Date().toISOString()
  });
});

// POI検索
app.get('/poi', (req, res) => {
  const { lat, lng, category = 'restaurant', limit = 10 } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_COORDINATES',
        message: 'Latitude and longitude parameters are required',
        timestamp: new Date().toISOString()
      }
    });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  const results = [];
  for (let i = 0; i < Math.min(parseInt(limit), 5); i++) {
    results.push({
      id: `mock-poi-${i}`,
      name: `Mock ${category} ${i + 1}`,
      category: category,
      location: {
        lat: latitude + (Math.random() - 0.5) * 0.01,
        lng: longitude + (Math.random() - 0.5) * 0.01
      },
      address: `Mock Address ${i + 1}, Tokyo, Japan`,
      rating: 3.5 + Math.random() * 1.5,
      distance: Math.floor(Math.random() * 1000) + 100
    });
  }

  res.json({
    success: true,
    data: {
      location: { lat: latitude, lng: longitude },
      results,
      count: results.length
    },
    timestamp: new Date().toISOString()
  });
});

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString()
    }
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🔍 Search Service (Simple) started on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Search: http://localhost:${PORT}/search?q=tokyo`);
  console.log(`   Metrics: http://localhost:${PORT}/metrics`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('Search Service shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Search Service shutting down...');
  process.exit(0);
});