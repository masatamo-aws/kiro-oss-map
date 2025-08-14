# 技術仕様書 - Kiro OSS Map v1.0.0

## 1. 実装済み技術スタック

### 1.1 フロントエンド技術仕様

#### 1.1.1 コア技術（実装完了）
```json
{
  "version": "1.0.0",
  "runtime": "Browser (ES2020+)",
  "framework": "Vanilla JavaScript + Web Components",
  "mapEngine": "MapLibre GL JS v3.6.2",
  "buildTool": "Vite v4.4.5",
  "cssFramework": "Tailwind CSS v3.3.0",
  "pwa": "Custom Service Worker",
  "testing": "Vitest",
  "containerization": "Docker + Docker Compose"
}
```

#### 1.1.2 実装済みブラウザサポート
```javascript
// 動作確認済みブラウザ
const TESTED_BROWSERS = [
  'Chrome >= 90',
  'Firefox >= 88', 
  'Safari >= 14',
  'Edge >= 90',
  'iOS Safari >= 14',
  'Android Chrome >= 90'
];

// 必須機能サポート
const FEATURE_SUPPORT = {
  'ES6 Modules': true,
  'Web Components': true,
  'CSS Grid': true,
  'Flexbox': true,
  'WebGL': true
};
```

#### 1.1.3 実装済みWeb API
```javascript
// 実装済み必須API
const IMPLEMENTED_APIS = [
  'Geolocation API',      // 現在地取得
  'Fetch API',            // HTTP通信
  'Service Workers',      // PWA機能
  'Local Storage',        // データ永続化
  'History API',          // URL管理
  'Canvas API',           // 地図レンダリング
  'WebGL',               // 3D地図表示
  'Intersection Observer' // パフォーマンス最適化
];

// 実装済みオプショナルAPI
const OPTIONAL_IMPLEMENTED = [
  'Web Share API',        // ネイティブ共有
  'Clipboard API',        // コピー機能
  'Fullscreen API',       // フルスクリーン表示
  'Vibration API'         // モバイル振動
];
```

### 1.2 バックエンド技術仕様

#### 1.2.1 サービス技術スタック
```yaml
# マイクロサービス構成
services:
  api-gateway:
    technology: "Node.js + Express"
    version: "Node 18 LTS"
    
  tile-server:
    technology: "TileServer GL"
    version: "v4.x"
    
  geocoding-service:
    technology: "Python + FastAPI"
    version: "Python 3.11"
    
  routing-service:
    technology: "C++ OSRM Backend"
    version: "OSRM v5.27"
    
  poi-service:
    technology: "Node.js + Express"
    version: "Node 18 LTS"
```

#### 1.2.2 データストア仕様
```yaml
databases:
  tiles:
    type: "File System"
    format: "MBTiles / PBF"
    storage: "SSD 500GB+"
    
  search_index:
    type: "Elasticsearch"
    version: "8.x"
    memory: "4GB+"
    
  cache:
    type: "Redis"
    version: "7.x"
    memory: "2GB+"
    
  routing_graph:
    type: "Memory Mapped Files"
    format: "OSRM Binary"
    storage: "SSD 100GB+"
```

## 2. API仕様

### 2.1 REST API エンドポイント

#### 2.1.1 タイル配信API
```yaml
# Vector Tiles
GET /api/v1/tiles/{style}/{z}/{x}/{y}.pbf
parameters:
  style: [standard, satellite, terrain]
  z: integer (0-18)
  x: integer
  y: integer
response:
  content-type: application/x-protobuf
  cache-control: public, max-age=604800
  
# Style JSON
GET /api/v1/styles/{style}.json
parameters:
  style: [standard, satellite, terrain]
response:
  content-type: application/json
  schema: MapLibre Style Specification
```

#### 2.1.2 ジオコーディングAPI
```yaml
# Forward Geocoding
GET /api/v1/geocoding/search
parameters:
  q: string (required) # 検索クエリ
  limit: integer (default: 10, max: 50)
  bbox: string # "minLon,minLat,maxLon,maxLat"
  countrycodes: string # "jp,us"
  format: string (default: "json")
response:
  schema:
    type: object
    properties:
      features:
        type: array
        items:
          type: object
          properties:
            type: { const: "Feature" }
            geometry:
              type: object
              properties:
                type: { const: "Point" }
                coordinates: [number, number]
            properties:
              type: object
              properties:
                name: string
                display_name: string
                address: object
                category: string
                importance: number

# Reverse Geocoding
GET /api/v1/geocoding/reverse
parameters:
  lat: number (required)
  lon: number (required)
  zoom: integer (default: 18)
  format: string (default: "json")
```

#### 2.1.3 ルーティングAPI
```yaml
# Route Calculation
GET /api/v1/routing/route
parameters:
  coordinates: string (required) # "lon1,lat1;lon2,lat2"
  profile: string (default: "driving") # [driving, walking, cycling]
  alternatives: boolean (default: false)
  steps: boolean (default: true)
  geometries: string (default: "geojson") # [geojson, polyline]
  overview: string (default: "full") # [full, simplified, false]
response:
  schema:
    type: object
    properties:
      code: string # "Ok"
      routes:
        type: array
        items:
          type: object
          properties:
            distance: number # meters
            duration: number # seconds
            geometry: object # GeoJSON LineString
            legs:
              type: array
              items:
                type: object
                properties:
                  distance: number
                  duration: number
                  steps: array
```

#### 2.1.4 POI検索API
```yaml
# POI Search
GET /api/v1/poi/search
parameters:
  q: string (required) # 検索クエリ
  category: string # [restaurant, hospital, atm, etc.]
  bbox: string # "minLon,minLat,maxLon,maxLat"
  limit: integer (default: 20, max: 100)
response:
  schema:
    type: object
    properties:
      type: { const: "FeatureCollection" }
      features:
        type: array
        items:
          type: object
          properties:
            type: { const: "Feature" }
            geometry:
              type: object
              properties:
                type: { const: "Point" }
                coordinates: [number, number]
            properties:
              type: object
              properties:
                name: string
                category: string
                tags: object
                address: string
```

#### 2.1.5 共有API
```yaml
# Create Share URL
POST /api/v1/share/create
request:
  schema:
    type: object
    properties:
      type: string # [location, route]
      data:
        type: object
        properties:
          center: [number, number]
          zoom: number
          markers: array
          route: object
      expires_in: integer # seconds (default: 2592000)
response:
  schema:
    type: object
    properties:
      id: string
      url: string
      expires_at: string

# Get Shared Data
GET /api/v1/share/{id}
response:
  schema:
    type: object
    properties:
      type: string
      data: object
      created_at: string
      expires_at: string
```

### 2.2 WebSocket API仕様

#### 2.2.1 リアルタイム位置共有（将来実装）
```yaml
# WebSocket Connection
WS /api/v1/ws/location
events:
  # Join Room
  join_room:
    payload:
      room_id: string
      user_id: string
      
  # Location Update
  location_update:
    payload:
      user_id: string
      location: [number, number]
      timestamp: string
      
  # Leave Room
  leave_room:
    payload:
      room_id: string
      user_id: string
```

## 3. データモデル仕様

### 3.1 フロントエンドデータモデル

#### 3.1.1 地図状態モデル
```typescript
interface MapState {
  center: [number, number];      // [longitude, latitude]
  zoom: number;                  // 0-18
  bearing: number;               // 0-360 degrees
  pitch: number;                 // 0-60 degrees
  style: 'standard' | 'satellite' | 'terrain';
  theme: 'light' | 'dark';
  bounds?: BoundingBox;
}

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

#### 3.1.2 検索結果モデル
```typescript
interface SearchResult {
  id: string;
  name: string;
  displayName: string;
  location: [number, number];
  address: Address;
  category: string;
  importance: number;
  boundingBox?: BoundingBox;
}

interface Address {
  houseNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}
```

#### 3.1.3 ルートモデル
```typescript
interface Route {
  id: string;
  profile: 'driving' | 'walking' | 'cycling';
  distance: number;              // meters
  duration: number;              // seconds
  geometry: GeoJSON.LineString;
  legs: RouteLeg[];
  alternatives?: Route[];
}

interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
}

interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver: Maneuver;
  geometry: GeoJSON.LineString;
}

interface Maneuver {
  type: string;                  // turn, merge, arrive, etc.
  modifier?: string;             // left, right, straight, etc.
  location: [number, number];
}
```

### 3.2 バックエンドデータモデル

#### 3.2.1 Elasticsearch検索インデックス
```json
{
  "mappings": {
    "properties": {
      "osm_id": { "type": "keyword" },
      "osm_type": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "display_name": { "type": "text" },
      "location": { "type": "geo_point" },
      "address": {
        "properties": {
          "house_number": { "type": "keyword" },
          "street": { "type": "text" },
          "city": { "type": "keyword" },
          "state": { "type": "keyword" },
          "country": { "type": "keyword" },
          "postal_code": { "type": "keyword" }
        }
      },
      "category": { "type": "keyword" },
      "tags": { "type": "object" },
      "importance": { "type": "float" },
      "bbox": { "type": "geo_shape" }
    }
  }
}
```

#### 3.2.2 Redis共有データスキーマ
```json
{
  "share:{id}": {
    "type": "location|route",
    "data": {
      "center": [139.7671, 35.6812],
      "zoom": 15,
      "markers": [
        {
          "id": "marker1",
          "location": [139.7671, 35.6812],
          "name": "東京駅",
          "description": "JR東京駅"
        }
      ],
      "route": {
        "profile": "driving",
        "coordinates": [[139.7671, 35.6812], [139.7751, 35.6762]],
        "distance": 1200,
        "duration": 300
      }
    },
    "created_at": "2025-08-13T08:00:00Z",
    "expires_at": "2025-09-13T08:00:00Z"
  }
}
```

## 4. セキュリティ仕様

### 4.1 認証・認可仕様

#### 4.1.1 API認証（将来実装）
```yaml
# API Key Authentication
headers:
  X-API-Key: string
  
# Rate Limiting
limits:
  anonymous: 1000 requests/hour
  authenticated: 10000 requests/hour
  
# CORS Policy
cors:
  origins: ["https://map.example.com"]
  methods: ["GET", "POST", "OPTIONS"]
  headers: ["Content-Type", "X-API-Key"]
```

#### 4.1.2 CSP設定
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.openstreetmap.org;
  worker-src 'self';
  manifest-src 'self';
```

### 4.2 データ保護仕様

#### 4.2.1 位置情報保護
```javascript
// 位置情報の匿名化
function anonymizeLocation(lat, lon, precision = 3) {
  return [
    Math.round(lon * Math.pow(10, precision)) / Math.pow(10, precision),
    Math.round(lat * Math.pow(10, precision)) / Math.pow(10, precision)
  ];
}

// 位置情報の暗号化（共有時）
function encryptLocation(location, key) {
  return CryptoJS.AES.encrypt(JSON.stringify(location), key).toString();
}
```

## 5. パフォーマンス仕様

### 5.1 フロントエンドパフォーマンス

#### 5.1.1 バンドルサイズ制限
```javascript
// Vite Bundle Analyzer設定
const BUNDLE_LIMITS = {
  'main.js': '200KB',      // メインバンドル
  'map.js': '500KB',       // 地図ライブラリ
  'vendor.js': '300KB',    // サードパーティ
  'total': '1MB'           // 総サイズ
};
```

#### 5.1.2 レンダリングパフォーマンス
```javascript
// パフォーマンス監視
const PERFORMANCE_TARGETS = {
  FCP: 1500,    // First Contentful Paint (ms)
  LCP: 2500,    // Largest Contentful Paint (ms)
  FID: 100,     // First Input Delay (ms)
  CLS: 0.1,     // Cumulative Layout Shift
  TTI: 3000     // Time to Interactive (ms)
};
```

### 5.2 バックエンドパフォーマンス

#### 5.2.1 API応答時間目標
```yaml
response_time_targets:
  tiles: 100ms (p95)
  geocoding: 200ms (p95)
  routing: 500ms (p95)
  poi_search: 300ms (p95)
  share: 100ms (p95)
```

#### 5.2.2 キャッシュ戦略
```yaml
cache_strategy:
  tiles:
    browser: 7 days
    cdn: 30 days
    
  geocoding:
    redis: 1 hour
    browser: 5 minutes
    
  routing:
    redis: 30 minutes
    browser: 1 minute
    
  poi_search:
    redis: 6 hours
    browser: 10 minutes
```

## 6. 品質保証仕様

### 6.1 テスト仕様

#### 6.1.1 単体テスト
```javascript
// Jest/Vitest設定
const TEST_CONFIG = {
  coverage: {
    threshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ]
};
```

#### 6.1.2 E2Eテスト
```javascript
// Playwright設定
const E2E_SCENARIOS = [
  '地図の初期表示',
  '住所検索機能',
  '経路探索機能',
  '地点共有機能',
  'レスポンシブ表示',
  'オフライン動作'
];
```

### 6.2 品質メトリクス

#### 6.2.1 コード品質
```yaml
quality_gates:
  sonarqube:
    coverage: ">= 80%"
    duplicated_lines: "< 3%"
    maintainability_rating: "A"
    reliability_rating: "A"
    security_rating: "A"
```

#### 6.2.2 アクセシビリティ
```yaml
accessibility:
  wcag_level: "AA"
  tools: ["axe-core", "lighthouse"]
  automated_tests: true
  manual_testing: true
```

## 7. 運用仕様

### 7.1 監視仕様

#### 7.1.1 アプリケーション監視
```yaml
monitoring:
  metrics:
    - name: "page_load_time"
      type: "histogram"
      labels: ["page", "device_type"]
      
    - name: "api_request_duration"
      type: "histogram"
      labels: ["endpoint", "method", "status"]
      
    - name: "map_tile_load_time"
      type: "histogram"
      labels: ["zoom_level", "tile_type"]
      
  alerts:
    - name: "High Error Rate"
      condition: "error_rate > 5%"
      duration: "5m"
      
    - name: "Slow Response Time"
      condition: "p95_response_time > 1s"
      duration: "10m"
```

#### 7.1.2 インフラ監視
```yaml
infrastructure:
  metrics:
    - cpu_usage
    - memory_usage
    - disk_usage
    - network_io
    - database_connections
    
  alerts:
    - name: "High CPU Usage"
      condition: "cpu_usage > 80%"
      duration: "5m"
      
    - name: "Low Disk Space"
      condition: "disk_free < 10%"
      duration: "1m"
```

### 7.2 ログ仕様

#### 7.2.1 ログレベル
```yaml
log_levels:
  ERROR: "システムエラー、即座の対応が必要"
  WARN: "警告、監視が必要"
  INFO: "一般的な情報"
  DEBUG: "デバッグ情報（開発環境のみ）"
```

#### 7.2.2 ログフォーマット
```json
{
  "timestamp": "2025-08-13T08:00:00.000Z",
  "level": "INFO",
  "service": "api-gateway",
  "message": "Request processed",
  "context": {
    "request_id": "req-123",
    "user_id": "anonymous",
    "endpoint": "/api/v1/geocoding/search",
    "method": "GET",
    "status": 200,
    "duration": 150,
    "ip": "192.168.1.1"
  }
}
```

## 8. デプロイメント仕様

### 8.1 コンテナ仕様

#### 8.1.1 Dockerfile
```dockerfile
# Frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

#### 8.1.2 Kubernetes仕様
```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oss-map-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: oss-map-frontend
  template:
    metadata:
      labels:
        app: oss-map-frontend
    spec:
      containers:
      - name: frontend
        image: oss-map-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

### 8.2 環境設定

#### 8.2.1 環境変数
```yaml
# Production
ENVIRONMENT: "production"
API_BASE_URL: "https://api.map.example.com"
TILE_SERVER_URL: "https://tiles.map.example.com"
SENTRY_DSN: "https://..."
ANALYTICS_ID: "GA-..."

# Development
ENVIRONMENT: "development"
API_BASE_URL: "http://localhost:8080"
TILE_SERVER_URL: "http://localhost:8081"
DEBUG: "true"
```

---

**文書バージョン**: 1.0  
**作成日**: 2025年8月13日  
**最終更新**: 2025年8月13日
### 1.2 バ
ックエンド技術仕様（実装完了）

#### 1.2.1 サーバー技術
```json
{
  "runtime": "Node.js v18.17.0+",
  "framework": "Express.js v4.18.2",
  "apiStyle": "RESTful API",
  "cors": "cors v2.8.5",
  "compression": "compression v1.7.4",
  "logging": "winston v3.10.0",
  "validation": "joi v17.9.2"
}
```

#### 1.2.2 外部API統合
```javascript
// 実装済み外部サービス
const EXTERNAL_APIS = {
  geocoding: {
    primary: 'Nominatim OSM',
    endpoint: 'https://nominatim.openstreetmap.org',
    rateLimit: '1 req/sec',
    cache: '5 minutes'
  },
  routing: {
    primary: 'OSRM',
    endpoint: 'https://router.project-osrm.org',
    profiles: ['driving', 'walking'],
    cache: '1 hour'
  },
  images: {
    wikipedia: 'Wikipedia API',
    unsplash: 'Unsplash API',
    cache: '1 hour'
  },
  tiles: {
    standard: 'OpenStreetMap',
    satellite: 'Esri World Imagery',
    terrain: 'OpenTopoMap'
  }
};
```

## 2. アーキテクチャ設計（実装済み）

### 2.1 フロントエンドアーキテクチャ

#### 2.1.1 コンポーネント構造
```
src/
├── main.js                 # アプリケーションエントリーポイント
├── components/             # Web Components
│   ├── SearchBox.js       # 検索コンポーネント
│   ├── RoutePanel.js      # ルート管理パネル
│   └── ShareDialog.js     # 共有ダイアログ
├── services/              # ビジネスロジック層
│   ├── MapService.js      # 地図操作サービス
│   ├── SearchService.js   # 検索サービス
│   ├── RouteService.js    # ルーティングサービス
│   ├── GeolocationService.js # 位置情報サービス
│   ├── ShareService.js    # 共有サービス
│   ├── ImageService.js    # 画像取得サービス
│   ├── ThemeService.js    # テーマ管理
│   ├── StorageService.js  # データ永続化
│   └── PWAService.js      # PWA機能
├── utils/                 # ユーティリティ
│   ├── EventBus.js        # イベント管理
│   ├── Logger.js          # ログ記録
│   └── ErrorHandler.js    # エラーハンドリング
└── styles/
    └── main.css           # スタイルシート
```

#### 2.1.2 イベント駆動アーキテクチャ
```javascript
// EventBus実装パターン
class EventBus {
  constructor() {
    this.events = new Map();
  }
  
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }
  
  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          Logger.error('EventBus callback error', error);
        }
      });
    }
  }
}

// 実装済みイベント
const IMPLEMENTED_EVENTS = [
  'search:query',           // 検索実行
  'search:select',          // 検索結果選択
  'route:calculate',        // ルート計算
  'route:display',          // ルート表示
  'route:set-origin',       // 出発地設定
  'route:set-destination',  // 目的地設定
  'map:click',             // 地図クリック
  'share:create',          // 共有作成
  'share:location',        // 位置共有
  'theme:toggle',          // テーマ切り替え
  'app:ready'              // アプリ初期化完了
];
```

### 2.2 サービス層設計

#### 2.2.1 MapService（地図管理）
```javascript
class MapService {
  constructor() {
    this.map = null;
    this.markers = new Map();
    this.isInitialized = false;
    this.styles = {
      standard: 'OpenStreetMap',
      satellite: 'Esri World Imagery', 
      terrain: 'OpenTopoMap'
    };
  }
  
  // 実装済みメソッド
  async initialize(container, options = {}) { /* 地図初期化 */ }
  flyTo(coordinates, zoom) { /* 地図移動 */ }
  addMarker(coordinates, title, id, options) { /* マーカー追加 */ }
  removeMarker(id) { /* マーカー削除 */ }
  clearMarkers(type) { /* マーカー一括削除 */ }
  displayRoute(route) { /* ルート表示 */ }
  clearRoute() { /* ルート削除 */ }
  setStyle(styleId) { /* スタイル変更 */ }
  createPopupContent(title, data) { /* ポップアップ生成 */ }
}
```

#### 2.2.2 SearchService（検索機能）
```javascript
class SearchService {
  constructor() {
    this.cache = new Map();
    this.baseUrl = 'https://nominatim.openstreetmap.org';
  }
  
  // 実装済みメソッド
  async search(query, options = {}) { /* 場所検索 */ }
  async reverseGeocode(lat, lng, options = {}) { /* 逆ジオコーディング */ }
  parseAddress(address) { /* 住所解析 */ }
  parseCategory(item) { /* カテゴリ分類 */ }
  clearCache() { /* キャッシュクリア */ }
}
```

#### 2.2.3 ImageService（画像取得）
```javascript
class ImageService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1時間
  }
  
  // 実装済みメソッド
  async getLocationImage(locationData) { /* 位置画像取得 */ }
  async getWikipediaImage(locationName) { /* Wikipedia画像 */ }
  async getUnsplashImage(category) { /* Unsplash画像 */ }
  getCachedImage(key) { /* キャッシュ取得 */ }
  setCachedImage(key, data) { /* キャッシュ保存 */ }
}
```

## 3. データ仕様（実装済み）

### 3.1 検索結果データ構造
```javascript
// 標準化された検索結果
const SearchResult = {
  id: 'string',              // 一意識別子
  name: 'string',            // 表示名
  displayName: 'string',     // 完全表示名
  latitude: 'number',        // 緯度
  longitude: 'number',       // 経度
  address: 'string',         // 住所
  category: 'string',        // カテゴリ
  importance: 'number',      // 重要度スコア
  boundingBox: {             // バウンディングボックス
    north: 'number',
    south: 'number', 
    east: 'number',
    west: 'number'
  },
  type: 'string',           // OSMタイプ
  class: 'string'           // OSMクラス
};
```

### 3.2 ルートデータ構造
```javascript
// OSRM ルートレスポンス
const RouteData = {
  routes: [{
    geometry: 'string',        // エンコードされたポリライン
    legs: [{
      steps: [{
        geometry: 'string',
        maneuver: {
          location: [lng, lat],
          instruction: 'string',
          type: 'string'
        },
        distance: 'number',
        duration: 'number'
      }],
      distance: 'number',
      duration: 'number'
    }],
    distance: 'number',        // 総距離（メートル）
    duration: 'number'         // 総時間（秒）
  }],
  waypoints: [{
    location: [lng, lat],
    name: 'string'
  }]
};
```

### 3.3 共有データ構造
```javascript
// 共有URL用データ
const ShareData = {
  type: 'location' | 'route',
  version: '1.0',
  data: {
    // 位置共有の場合
    center: [lng, lat],
    zoom: 'number',
    marker: {
      coordinates: [lng, lat],
      name: 'string'
    },
    
    // ルート共有の場合
    origin: [lng, lat],
    destination: [lng, lat],
    profile: 'driving' | 'walking'
  },
  timestamp: 'ISO8601 string'
};
```

## 4. API仕様（実装済み）

### 4.1 内部API

#### 4.1.1 検索API
```http
GET /api/v1/geocoding/search
Query Parameters:
  - q: string (required) - 検索クエリ
  - limit: number (optional, default: 10) - 結果数制限
  - countrycodes: string (optional) - 国コード制限
  - bbox: string (optional) - バウンディングボックス

Response:
{
  "results": [SearchResult],
  "query": "string",
  "timestamp": "ISO8601"
}
```

#### 4.1.2 ルーティングAPI
```http
GET /api/v1/routing/route
Query Parameters:
  - coordinates: string (required) - "lng,lat;lng,lat"
  - profile: string (optional, default: driving) - ルートプロファイル
  - alternatives: boolean (optional) - 代替ルート

Response:
{
  "route": RouteData,
  "profile": "string",
  "timestamp": "ISO8601"
}
```

#### 4.1.3 共有API
```http
POST /api/v1/share/create
Content-Type: application/json

Request Body:
{
  "type": "location" | "route",
  "data": ShareData
}

Response:
{
  "id": "string",
  "url": "string",
  "shortUrl": "string",
  "expiresAt": "ISO8601"
}
```

### 4.2 外部API統合

#### 4.2.1 Nominatim統合
```javascript
// 実装済みNominatim設定
const NominatimConfig = {
  baseUrl: 'https://nominatim.openstreetmap.org',
  format: 'json',
  addressdetails: 1,
  extratags: 1,
  namedetails: 1,
  limit: 10,
  'accept-language': 'ja,en',
  countrycodes: 'jp', // 日本優先
  userAgent: 'Kiro OSS Map/1.0'
};
```

#### 4.2.2 OSRM統合
```javascript
// 実装済みOSRM設定
const OSRMConfig = {
  baseUrl: 'https://router.project-osrm.org',
  profiles: {
    driving: '/route/v1/driving/',
    walking: '/route/v1/foot/'
  },
  options: {
    geometries: 'geojson',
    overview: 'full',
    steps: true,
    annotations: true
  }
};
```

## 5. セキュリティ仕様（実装済み）

### 5.1 フロントエンドセキュリティ
```javascript
// Content Security Policy
const CSP_POLICY = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: https:",
  'connect-src': [
    "'self'",
    'https://nominatim.openstreetmap.org',
    'https://router.project-osrm.org',
    'https://tile.openstreetmap.org',
    'https://server.arcgisonline.com'
  ].join(' ')
};

// XSS対策
const sanitizeInput = (input) => {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 1000);
};
```

### 5.2 API セキュリティ
```javascript
// CORS設定
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// レート制限
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // リクエスト数制限
  message: 'Too many requests'
};
```

## 6. パフォーマンス仕様（実装済み）

### 6.1 キャッシュ戦略
```javascript
// 実装済みキャッシュ設定
const CacheConfig = {
  search: {
    ttl: 300000,      // 5分
    maxSize: 100
  },
  images: {
    ttl: 3600000,     // 1時間
    maxSize: 50
  },
  routes: {
    ttl: 1800000,     // 30分
    maxSize: 20
  },
  tiles: {
    ttl: 604800000,   // 7日
    storage: 'indexedDB'
  }
};
```

### 6.2 パフォーマンス最適化
```javascript
// 実装済み最適化
const OptimizationFeatures = {
  lazyLoading: true,        // コンポーネント遅延読み込み
  imageOptimization: true,  // 画像最適化
  debouncing: true,         // 検索入力デバウンス
  virtualScrolling: false,  // 仮想スクロール（未実装）
  webWorkers: false,        // Web Workers（未実装）
  serviceWorker: true       // Service Worker
};
```

## 7. 監視・ログ仕様（実装済み）

### 7.1 ログ設定
```javascript
// Logger実装
class Logger {
  static levels = {
    ERROR: 0,
    WARN: 1, 
    INFO: 2,
    DEBUG: 3
  };
  
  static log(level, message, data, category) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: data,
      category: category,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.log(`[${level}] ${message}`, logEntry);
    
    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      this.sendToLogService(logEntry);
    }
  }
}
```

### 7.2 エラーハンドリング
```javascript
// グローバルエラーハンドラー
class ErrorHandler {
  static initialize() {
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }
  
  static handleError(event) {
    Logger.error('Global error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    }, 'global-error');
  }
}
```

## 8. デプロイメント仕様（実装済み）

### 8.1 Docker設定
```dockerfile
# 実装済みDockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["npm", "run", "serve"]
```

### 8.2 環境設定
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

---

## 9. GitHubリポジトリ仕様（v1.0.1）

### 9.1 リポジトリ構造
```
masatamo-aws/kiro-oss-map/
├── README.md                    # プロジェクト概要・セットアップ
├── CHANGELOG.md                 # 変更履歴
├── LICENSE                      # MITライセンス
├── package.json                 # 依存関係・スクリプト
├── docker-compose.yml           # Docker設定
├── src/                         # フロントエンドソース
├── server/                      # バックエンドソース
├── assets/                      # 画像・アセット
├── tests/                       # テストファイル
└── docs/                        # 技術ドキュメント
    ├── requirements.md
    ├── specifications.md
    ├── design.md
    ├── tasks.md
    └── logicalarchitecture.md
```

### 9.2 CI/CD仕様（計画）
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
```

### 9.3 リリース管理
- **セマンティックバージョニング**: MAJOR.MINOR.PATCH
- **自動リリースノート**: GitHub Releases連携
- **タグ管理**: git tag による版数管理
- **ブランチ戦略**: main ブランチ中心の単純構成

---

**文書バージョン**: 2.1  
**作成日**: 2025年8月13日  
**最終更新**: 2025年8月13日  
**実装バージョン**: v1.0.1  
**GitHubリポジトリ**: https://github.com/masatamo-aws/kiro-oss-map