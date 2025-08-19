/**
 * Kiro OSS Map v2.1.0 - 簡易検索サービス（TypeScript版対応）
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
      },
      nominatim: {
        status: 'up',
        details: 'External API available'
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
      nominatim: {
        status: 'up',
        details: 'External geocoding service available'
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

# HELP search_service_requests_total Total number of requests
# TYPE search_service_requests_total counter
search_service_requests_total 0
`;

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics);
});

// 基本検索
app.get('/search', (req, res) => {
  const { q, limit = 10, bounds } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'Search query is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // モック検索結果
  const mockResults = [
    {
      placeId: 'place_1',
      displayName: `${q} - Tokyo Station`,
      coordinates: { latitude: 35.6812, longitude: 139.7671 },
      category: 'transportation',
      type: 'train_station',
      importance: 0.9,
      address: {
        city: 'Tokyo',
        country: 'Japan',
        countryCode: 'JP'
      }
    },
    {
      placeId: 'place_2',
      displayName: `${q} - Shibuya Crossing`,
      coordinates: { latitude: 35.6598, longitude: 139.7006 },
      category: 'landmark',
      type: 'intersection',
      importance: 0.8,
      address: {
        city: 'Tokyo',
        country: 'Japan',
        countryCode: 'JP'
      }
    }
  ].slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      results: mockResults,
      count: mockResults.length,
      query: q,
      processingTime: Math.random() * 100 + 50
    },
    timestamp: new Date().toISOString()
  });
});

// オートコンプリート
app.get('/search/autocomplete', (req, res) => {
  const { q, limit = 5 } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'Search query is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // モックオートコンプリート結果
  const suggestions = [
    `${q} Station`,
    `${q} Park`,
    `${q} Shopping Mall`,
    `${q} Restaurant`,
    `${q} Hotel`
  ].slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      suggestions,
      count: suggestions.length,
      query: q
    },
    timestamp: new Date().toISOString()
  });
});

// ジオコーディング
app.get('/geocoding', (req, res) => {
  const { address, limit = 1 } = req.query;
  
  if (!address) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_ADDRESS',
        message: 'Address is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // モックジオコーディング結果
  const results = [
    {
      placeId: 'geo_1',
      displayName: address,
      coordinates: { 
        latitude: 35.6762 + (Math.random() - 0.5) * 0.1, 
        longitude: 139.6503 + (Math.random() - 0.5) * 0.1 
      },
      boundingBox: {
        north: 35.7,
        south: 35.6,
        east: 139.8,
        west: 139.5
      },
      confidence: 0.85,
      address: {
        street: address,
        city: 'Tokyo',
        country: 'Japan',
        countryCode: 'JP'
      }
    }
  ].slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      results,
      count: results.length,
      query: address
    },
    timestamp: new Date().toISOString()
  });
});

// 逆ジオコーディング
app.get('/geocoding/reverse', (req, res) => {
  const { lat, lon } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_COORDINATES',
        message: 'Latitude and longitude are required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // モック逆ジオコーディング結果
  const result = {
    placeId: 'reverse_1',
    displayName: 'Tokyo Metropolitan Area',
    coordinates: { 
      latitude: parseFloat(lat), 
      longitude: parseFloat(lon) 
    },
    address: {
      houseNumber: '1-1',
      street: 'Chiyoda',
      city: 'Tokyo',
      state: 'Tokyo',
      country: 'Japan',
      postalCode: '100-0001',
      countryCode: 'JP'
    },
    confidence: 0.9
  };

  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
});

// POI検索
app.get('/poi', (req, res) => {
  const { category, lat, lon, radius = 1000, limit = 10 } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_COORDINATES',
        message: 'Latitude and longitude are required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // モックPOI結果
  const pois = [
    {
      id: 'poi_1',
      name: 'Tokyo Station',
      category: category || 'transportation',
      coordinates: { latitude: 35.6812, longitude: 139.7671 },
      distance: 500,
      rating: 4.5,
      address: 'Chiyoda, Tokyo',
      openingHours: '24/7'
    },
    {
      id: 'poi_2',
      name: 'Imperial Palace',
      category: category || 'landmark',
      coordinates: { latitude: 35.6852, longitude: 139.7528 },
      distance: 800,
      rating: 4.8,
      address: 'Chiyoda, Tokyo',
      openingHours: '9:00-17:00'
    }
  ].slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      pois,
      count: pois.length,
      center: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
      radius: parseInt(radius)
    },
    timestamp: new Date().toISOString()
  });
});

// POI詳細
app.get('/poi/:id', (req, res) => {
  const { id } = req.params;
  
  // モックPOI詳細
  const poi = {
    id,
    name: 'Tokyo Station',
    category: 'transportation',
    coordinates: { latitude: 35.6812, longitude: 139.7671 },
    rating: 4.5,
    reviews: 1250,
    address: {
      street: '1-1 Marunouchi',
      city: 'Chiyoda',
      state: 'Tokyo',
      country: 'Japan',
      postalCode: '100-0005'
    },
    contact: {
      phone: '+81-3-1234-5678',
      website: 'https://example.com'
    },
    openingHours: {
      monday: '24/7',
      tuesday: '24/7',
      wednesday: '24/7',
      thursday: '24/7',
      friday: '24/7',
      saturday: '24/7',
      sunday: '24/7'
    },
    amenities: ['WiFi', 'Parking', 'Accessible'],
    photos: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg'
    ]
  };

  res.json({
    success: true,
    data: poi,
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
  console.log(`🔍 Search Service (Simple v2) started on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Search: http://localhost:${PORT}/search?q=tokyo`);
  console.log(`   Geocoding: http://localhost:${PORT}/geocoding?address=tokyo`);
  console.log(`   POI: http://localhost:${PORT}/poi?lat=35.6812&lon=139.7671`);
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