# 設計書 - Kiro OSS Map v1.0.0

## 1. 実装済みシステム設計

### 1.1 設計原則（実装完了）
- ✅ **モジュラー設計**: サービス層とコンポーネント層の完全分離
- ✅ **イベント駆動アーキテクチャ**: EventBusによる疎結合設計
- ✅ **レスポンシブファースト**: モバイル・タブレット・PC対応
- ✅ **プログレッシブエンハンスメント**: 基本機能から高度機能まで段階実装
- ✅ **エラーファースト**: 包括的エラーハンドリングとログ記録

### 1.2 実装済みアーキテクチャパターン
- ✅ **フロントエンド**: SPA + Web Components
- ✅ **バックエンド**: Express.js RESTful API
- ✅ **データフロー**: イベント駆動 + サービス指向
- ✅ **キャッシュ戦略**: 多層キャッシュ（メモリ + ブラウザストレージ）
- ✅ **PWA対応**: Service Worker + App Manifest

## 2. 実装済みフロントエンド設計

### 2.1 技術スタック（実装完了）
```javascript
const TechStack = {
  framework: 'Vanilla JavaScript + Web Components',
  mapEngine: 'MapLibre GL JS v3.6.2',
  buildTool: 'Vite v4.4.5',
  cssFramework: 'Tailwind CSS v3.3.0',
  pwa: 'Custom Service Worker',
  stateManagement: 'EventBus + Service Layer',
  testing: 'Vitest',
  containerization: 'Docker + Docker Compose'
};
```

### 2.2 実装済みコンポーネント設計

#### 2.2.1 アプリケーション構造
```
kiro-oss-map/
├── src/
│   ├── main.js                 # ✅ アプリケーションエントリーポイント
│   ├── index.html              # ✅ HTMLテンプレート
│   ├── components/             # ✅ Web Components
│   │   ├── SearchBox.js        # ✅ 検索コンポーネント
│   │   ├── RoutePanel.js       # ✅ ルート管理パネル
│   │   └── ShareDialog.js      # ✅ 共有ダイアログ
│   ├── services/               # ✅ ビジネスロジック層
│   │   ├── MapService.js       # ✅ 地図操作サービス
│   │   ├── SearchService.js    # ✅ 検索サービス
│   │   ├── RouteService.js     # ✅ ルーティングサービス
│   │   ├── GeolocationService.js # ✅ 位置情報サービス
│   │   ├── ShareService.js     # ✅ 共有サービス
│   │   ├── ImageService.js     # ✅ 画像取得サービス
│   │   ├── ThemeService.js     # ✅ テーマ管理
│   │   ├── StorageService.js   # ✅ データ永続化
│   │   └── PWAService.js       # ✅ PWA機能
│   ├── utils/                  # ✅ ユーティリティ
│   │   ├── EventBus.js         # ✅ イベント管理
│   │   ├── Logger.js           # ✅ ログ記録
│   │   └── ErrorHandler.js     # ✅ エラーハンドリング
│   └── styles/
│       └── main.css            # ✅ スタイルシート
├── server/                     # ✅ バックエンドAPI
│   ├── index.js                # ✅ サーバーエントリーポイント
│   ├── routes/
│   │   └── api.js              # ✅ APIルート
│   └── services/
│       ├── GeocodingService.js # ✅ ジオコーディング
│       ├── RoutingService.js   # ✅ ルーティング
│       └── ShareService.js     # ✅ 共有管理
└── assets/
    └── image/                  # ✅ スクリーンショット
```

#### 2.2.2 Web Components実装
```javascript
// SearchBox Component - 実装完了
class SearchBox extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.selectedIndex = -1;
    this.searchHistory = [];
  }
  
  // 実装済みメソッド
  connectedCallback() { /* DOM接続時の初期化 */ }
  render() { /* HTMLテンプレート生成 */ }
  setupEventListeners() { /* イベントリスナー設定 */ }
  performSearch(query) { /* 検索実行 */ }
  displaySuggestions(results) { /* 候補表示 */ }
  selectSuggestion(item) { /* 候補選択 */ }
  showSearchHistory() { /* 履歴表示 */ }
}

// RoutePanel Component - 実装完了
class RoutePanel extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.currentRoute = null;
  }
  
  // 実装済みメソッド
  connectedCallback() { /* 初期化 */ }
  open() { /* パネル表示 */ }
  close() { /* パネル非表示 */ }
  setOrigin(coordinates, name) { /* 出発地設定 */ }
  setDestination(coordinates, name) { /* 目的地設定 */ }
  calculateRoute() { /* ルート計算 */ }
  displayRoute(route) { /* ルート表示 */ }
}

// ShareDialog Component - 実装完了
class ShareDialog extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
  }
  
  // 実装済みメソッド
  connectedCallback() { /* 初期化 */ }
  show(data) { /* ダイアログ表示 */ }
  hide() { /* ダイアログ非表示 */ }
  generateShareUrl(data) { /* 共有URL生成 */ }
  copyToClipboard(text) { /* クリップボードコピー */ }
}
```

### 2.3 サービス層設計（実装完了）

#### 2.3.1 MapService - 地図管理
```javascript
class MapService {
  // 実装済み機能
  - ✅ 地図初期化・表示
  - ✅ マーカー管理（追加・削除・更新）
  - ✅ ポップアップ生成・表示
  - ✅ ルート表示・削除
  - ✅ レイヤー切り替え
  - ✅ スタイル変更
  - ✅ イベントハンドリング
  
  // 主要メソッド
  async initialize(container, options)
  flyTo(coordinates, zoom)
  addMarker(coordinates, title, id, options)
  removeMarker(id)
  clearMarkers(type)
  displayRoute(route)
  setStyle(styleId)
  createPopupContent(title, data)
}
```

#### 2.3.2 SearchService - 検索機能
```javascript
class SearchService {
  // 実装済み機能
  - ✅ Nominatim API統合
  - ✅ 検索結果キャッシュ
  - ✅ 住所・POI検索
  - ✅ 逆ジオコーディング
  - ✅ 結果フィルタリング
  
  // 主要メソッド
  async search(query, options)
  async reverseGeocode(latitude, longitude)
  parseAddress(address)
  parseCategory(item)
  clearCache()
}
```

#### 2.3.3 ImageService - 画像取得
```javascript
class ImageService {
  // 実装済み機能
  - ✅ Wikipedia画像取得
  - ✅ Unsplash画像取得
  - ✅ 画像キャッシュ管理
  - ✅ エラーハンドリング
  
  // 主要メソッド
  async getLocationImage(locationData)
  async getWikipediaImage(locationName)
  async getUnsplashImage(category)
  getCachedImage(key)
  setCachedImage(key, data)
}
```

## 3. 実装済みバックエンド設計

### 3.1 API設計（実装完了）
```javascript
// Express.js サーバー構成
const ServerStructure = {
  framework: 'Express.js v4.18.2',
  middleware: [
    'cors',           // CORS対応
    'compression',    // レスポンス圧縮
    'helmet',         // セキュリティヘッダー
    'morgan'          // アクセスログ
  ],
  routes: {
    '/api/v1/geocoding': 'GeocodingService',
    '/api/v1/routing': 'RoutingService', 
    '/api/v1/share': 'ShareService',
    '/api/v1/health': 'HealthCheck'
  }
};
```

### 3.2 外部API統合（実装完了）
```javascript
// 実装済み外部サービス統合
const ExternalIntegrations = {
  nominatim: {
    baseUrl: 'https://nominatim.openstreetmap.org',
    rateLimit: '1 req/sec',
    cache: '5 minutes',
    features: ['search', 'reverse', 'details']
  },
  osrm: {
    baseUrl: 'https://router.project-osrm.org',
    profiles: ['driving', 'walking'],
    cache: '1 hour',
    features: ['route', 'table', 'match']
  },
  wikipedia: {
    baseUrl: 'https://ja.wikipedia.org/api/rest_v1',
    cache: '1 hour',
    features: ['page-summary', 'media']
  },
  unsplash: {
    baseUrl: 'https://api.unsplash.com',
    cache: '1 hour',
    features: ['search-photos']
  }
};
```

## 4. データフロー設計（実装完了）

### 4.1 イベント駆動アーキテクチャ
```javascript
// EventBus実装パターン
const EventFlow = {
  // ユーザーアクション → イベント発火
  'user:search' → 'search:query' → SearchService.search(),
  'user:select-result' → 'search:select' → MapService.addMarker(),
  'user:route-request' → 'route:calculate' → RouteService.calculate(),
  'user:share' → 'share:create' → ShareService.createShareUrl(),
  
  // システムイベント
  'app:ready' → 各サービス初期化完了,
  'map:click' → 座標取得・処理,
  'theme:toggle' → UI更新,
  'error:occurred' → エラーハンドリング
};
```

### 4.2 データキャッシュ戦略（実装完了）
```javascript
// 多層キャッシュ実装
const CacheStrategy = {
  L1: {
    type: 'Memory Cache',
    target: ['search results', 'route data'],
    ttl: '5-30 minutes',
    maxSize: '100 items'
  },
  L2: {
    type: 'Local Storage',
    target: ['user preferences', 'search history'],
    ttl: 'persistent',
    maxSize: '10MB'
  },
  L3: {
    type: 'IndexedDB',
    target: ['map tiles', 'offline data'],
    ttl: '7 days',
    maxSize: '50MB'
  }
};
```

## 5. UI/UX設計（実装完了）

### 5.1 レスポンシブデザイン
```css
/* 実装済みブレークポイント */
.responsive-breakpoints {
  mobile: '< 768px',
  tablet: '768px - 1024px', 
  desktop: '> 1024px'
}

/* 実装済みレイアウト */
.layout-mobile {
  sidebar: 'overlay',
  search: 'full-width',
  controls: 'bottom-sheet'
}

.layout-desktop {
  sidebar: 'fixed-left',
  search: 'header-center',
  controls: 'top-right'
}
```

### 5.2 テーマシステム（実装完了）
```javascript
// ThemeService実装
const ThemeSystem = {
  themes: {
    light: {
      primary: '#3b82f6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1f2937'
    },
    dark: {
      primary: '#60a5fa',
      background: '#111827',
      surface: '#1f2937', 
      text: '#f9fafb'
    }
  },
  
  // 実装済み機能
  features: [
    'automatic detection',    // システム設定自動検出
    'manual toggle',         // 手動切り替え
    'persistence',           // 設定保存
    'smooth transition'      // スムーズ切り替え
  ]
};
```

### 5.3 アクセシビリティ（実装完了）
```javascript
// 実装済みアクセシビリティ機能
const A11yFeatures = {
  keyboard: {
    navigation: 'full keyboard support',
    shortcuts: 'custom shortcuts',
    focusManagement: 'proper focus handling'
  },
  screen_reader: {
    aria_labels: 'comprehensive labeling',
    live_regions: 'dynamic content updates',
    semantic_html: 'proper HTML structure'
  },
  visual: {
    contrast: 'WCAG AA compliant',
    font_scaling: 'responsive typography',
    color_blind: 'color-blind friendly'
  }
};
```

## 6. パフォーマンス設計（実装完了）

### 6.1 最適化戦略
```javascript
// 実装済みパフォーマンス最適化
const PerformanceOptimizations = {
  loading: {
    lazy_components: true,      // コンポーネント遅延読み込み
    code_splitting: true,       // コード分割
    tree_shaking: true,         // 不要コード除去
    image_optimization: true    // 画像最適化
  },
  
  runtime: {
    debouncing: true,          // 検索入力デバウンス
    throttling: true,          // スクロール・リサイズ制御
    memoization: true,         // 計算結果キャッシュ
    virtual_scrolling: false   // 仮想スクロール（未実装）
  },
  
  network: {
    request_caching: true,     // HTTPキャッシュ
    compression: true,         // レスポンス圧縮
    cdn_usage: false,          // CDN使用（未実装）
    prefetching: false         // プリフェッチ（未実装）
  }
};
```

### 6.2 監視・計測（実装完了）
```javascript
// 実装済み監視システム
const MonitoringSystem = {
  metrics: {
    core_web_vitals: true,     // Core Web Vitals計測
    custom_metrics: true,      // カスタム指標
    error_tracking: true,      // エラー追跡
    performance_timing: true   // パフォーマンス計測
  },
  
  logging: {
    structured_logs: true,     // 構造化ログ
    log_levels: true,          // ログレベル管理
    error_reporting: true,     // エラーレポート
    analytics: false           // アナリティクス（未実装）
  }
};
```

## 7. セキュリティ設計（実装完了）

### 7.1 フロントエンドセキュリティ
```javascript
// 実装済みセキュリティ対策
const SecurityMeasures = {
  xss_prevention: {
    input_sanitization: true,   // 入力値サニタイズ
    output_encoding: true,      // 出力エンコーディング
    csp_headers: true          // Content Security Policy
  },
  
  data_protection: {
    https_only: true,          // HTTPS強制
    secure_storage: true,      // セキュアストレージ
    minimal_data: true,        // 最小限データ収集
    anonymization: true        // データ匿名化
  },
  
  api_security: {
    cors_policy: true,         // CORS設定
    rate_limiting: true,       // レート制限
    input_validation: true,    // 入力検証
    error_handling: true       // セキュアエラーハンドリング
  }
};
```

## 8. デプロイメント設計（実装完了）

### 8.1 コンテナ化戦略
```yaml
# 実装済みDocker構成
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:8080"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    
  # 将来の拡張用
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
```

### 8.2 CI/CD パイプライン（設計済み）
```yaml
# GitHub Actions設計
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
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: docker build -t kiro-oss-map .
      - run: docker push ${{ secrets.REGISTRY }}/kiro-oss-map
```

---

## 9. オープンソース公開設計（v1.0.1）

### 9.1 GitHubリポジトリ設計
```
Repository Design:
├── Public Repository (MIT License)
├── Issue Templates (Bug Report / Feature Request)
├── Pull Request Templates
├── Contributing Guidelines
├── Code of Conduct
└── Security Policy
```

### 9.2 コミュニティ設計
```javascript
// コミュニティ参加設計
const CommunityDesign = {
  contribution: {
    codeContribution: 'Pull Request歓迎',
    documentation: 'ドキュメント改善歓迎',
    translation: '多言語対応協力歓迎',
    testing: 'バグレポート・テスト協力歓迎'
  },
  
  support: {
    issues: 'GitHub Issues',
    discussions: 'GitHub Discussions', 
    documentation: '包括的README・Wiki',
    examples: 'サンプルコード・デモ'
  },
  
  governance: {
    maintainer: 'masatamo-aws',
    license: 'MIT License',
    versioning: 'Semantic Versioning',
    releases: 'GitHub Releases'
  }
};
```

### 9.3 継続的改善設計
```javascript
// 継続的改善プロセス
const ContinuousImprovement = {
  feedback: {
    userFeedback: 'GitHub Issues・Discussions',
    analytics: 'GitHub Insights・Stars・Forks',
    monitoring: 'Issue・PR追跡'
  },
  
  development: {
    roadmap: 'GitHub Projects・Milestones',
    releases: '定期リリース（月次予定）',
    documentation: '継続的ドキュメント更新'
  },
  
  quality: {
    codeReview: 'Pull Request Review',
    testing: '自動テスト・手動テスト',
    security: 'Dependabot・Security Advisories'
  }
};
```

---

**文書バージョン**: 2.1  
**作成日**: 2025年8月13日  
**最終更新**: 2025年8月13日  
**実装状況**: v1.0.1 完了・GitHub公開済み - 2025年8月13日  
**GitHubリポジトリ**: https://github.com/masatamo-aws/kiro-oss-map

### 2.3 状態管理設計

#### 2.3.1 アプリケーション状態
```javascript
AppState = {
  map: {
    center: [lng, lat],
    zoom: number,
    bearing: number,
    pitch: number,
    style: 'standard' | 'satellite' | 'terrain',
    theme: 'light' | 'dark'
  },
  search: {
    query: string,
    results: SearchResult[],
    selectedResult: SearchResult | null
  },
  route: {
    origin: Location | null,
    destination: Location | null,
    waypoints: Location[],
    mode: 'driving' | 'walking' | 'cycling',
    route: Route | null,
    isCalculating: boolean
  },
  ui: {
    sidebarOpen: boolean,
    searchFocused: boolean,
    routePanelOpen: boolean,
    shareDialogOpen: boolean
  },
  user: {
    location: Location | null,
    preferences: UserPreferences
  }
}
```

#### 2.3.2 イベント駆動アーキテクチャ
```javascript
// カスタムイベントシステム
EventBus.emit('map:move', { center, zoom });
EventBus.emit('search:query', { query });
EventBus.emit('route:calculate', { origin, destination });
EventBus.emit('location:update', { location });
```

### 2.4 レスポンシブ設計

#### 2.4.1 ブレークポイント
```css
/* Mobile First */
.container { /* Base: 320px+ */ }

@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

#### 2.4.2 レイアウトパターン
- **モバイル**: フルスクリーン地図 + オーバーレイUI
- **タブレット**: サイドパネル + 地図
- **デスクトップ**: 固定サイドバー + 地図

## 3. バックエンド設計

### 3.1 マイクロサービス構成

#### 3.1.1 サービス分割
```
Services/
├── tile-server/        # タイル配信
├── geocoding-service/  # 住所検索
├── routing-service/    # 経路探索
├── poi-service/        # POI検索
├── share-service/      # URL短縮・共有
└── api-gateway/        # API統合
```

#### 3.1.2 API Gateway設計
```yaml
# API Routes
/api/v1/tiles/{z}/{x}/{y}     # タイル取得
/api/v1/geocoding/search      # 住所検索
/api/v1/geocoding/reverse     # 逆ジオコーディング
/api/v1/routing/route         # 経路計算
/api/v1/poi/search           # POI検索
/api/v1/share/create         # 共有URL作成
/api/v1/share/{id}           # 共有URL取得
```

### 3.2 データベース設計

#### 3.2.1 地図タイル（ファイルシステム）
```
tiles/
├── standard/
│   ├── 0/0/0.pbf
│   ├── 1/0/0.pbf
│   └── ...
├── satellite/
└── terrain/
```

#### 3.2.2 検索インデックス（Elasticsearch）
```json
{
  "mappings": {
    "properties": {
      "name": { "type": "text", "analyzer": "standard" },
      "address": { "type": "text" },
      "location": { "type": "geo_point" },
      "category": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "importance": { "type": "float" }
    }
  }
}
```

#### 3.2.3 共有データ（Redis）
```json
{
  "share_id": "abc123",
  "type": "location|route",
  "data": {
    "center": [139.7671, 35.6812],
    "zoom": 15,
    "markers": [...],
    "route": {...}
  },
  "created_at": "2025-08-13T08:00:00Z",
  "expires_at": "2025-08-13T08:00:00Z"
}
```

## 4. データフロー設計

### 4.1 地図表示フロー
```
1. ユーザー操作 → MapView
2. MapView → TileService (タイル要求)
3. TileService → TileServer (HTTP)
4. TileServer → MapView (タイルデータ)
5. MapView → 地図描画
```

### 4.2 検索フロー
```
1. ユーザー入力 → SearchBox
2. SearchBox → GeocodingService (検索要求)
3. GeocodingService → Nominatim API
4. Nominatim → GeocodingService (結果)
5. GeocodingService → SearchBox (表示)
6. ユーザー選択 → MapView (地図移動)
```

### 4.3 経路探索フロー
```
1. 出発地・目的地設定 → RoutePanel
2. RoutePanel → RoutingService (経路要求)
3. RoutingService → OSRM API
4. OSRM → RoutingService (経路データ)
5. RoutingService → MapView (経路描画)
6. RoutePanel → 案内情報表示
```

## 5. セキュリティ設計

### 5.1 フロントエンドセキュリティ
- **CSP**: Content Security Policy設定
- **XSS対策**: 入力値サニタイズ
- **CSRF対策**: SameSite Cookie
- **HTTPS強制**: HSTS設定

### 5.2 APIセキュリティ
- **レート制限**: IP/ユーザー単位
- **CORS設定**: 許可ドメイン制限
- **入力検証**: スキーマバリデーション
- **ログ監視**: 異常アクセス検知

### 5.3 プライバシー設計
- **位置情報**: 明示的な許可要求
- **データ最小化**: 必要最小限の情報のみ
- **匿名化**: 座標データの匿名化
- **データ保持**: 自動削除ポリシー

## 6. パフォーマンス設計

### 6.1 フロントエンド最適化

#### 6.1.1 バンドル最適化
```javascript
// Code Splitting
const SearchModule = () => import('./modules/search');
const RouteModule = () => import('./modules/route');

// Tree Shaking
import { debounce } from 'lodash-es';
```

#### 6.1.2 キャッシュ戦略
```javascript
// Service Worker Cache
const CACHE_STRATEGY = {
  tiles: 'cache-first',      // タイル: キャッシュ優先
  api: 'network-first',      // API: ネットワーク優先
  static: 'cache-first'      // 静的ファイル: キャッシュ優先
};
```

### 6.2 バックエンド最適化

#### 6.2.1 タイル配信最適化
```nginx
# Nginx設定
location /tiles/ {
    expires 7d;
    add_header Cache-Control "public, immutable";
    gzip on;
    gzip_types application/x-protobuf;
}
```

#### 6.2.2 API最適化
```javascript
// レスポンス圧縮
app.use(compression());

// キャッシュヘッダー
app.use('/api/geocoding', cache('5m'));
app.use('/api/routing', cache('1h'));
```

## 7. 国際化設計

### 7.1 多言語対応
```javascript
// i18n構造
const messages = {
  ja: {
    search: {
      placeholder: '場所を検索',
      noResults: '結果が見つかりません'
    },
    route: {
      from: '出発地',
      to: '目的地'
    }
  },
  en: {
    search: {
      placeholder: 'Search places',
      noResults: 'No results found'
    },
    route: {
      from: 'From',
      to: 'To'
    }
  }
};
```

### 7.2 地域対応
```javascript
// 地域別設定
const REGION_CONFIG = {
  JP: {
    defaultCenter: [139.7671, 35.6812], // 東京
    defaultZoom: 10,
    geocodingBias: 'JP',
    units: 'metric'
  },
  US: {
    defaultCenter: [-74.0060, 40.7128], // NYC
    defaultZoom: 10,
    geocodingBias: 'US',
    units: 'imperial'
  }
};
```

## 8. テスト設計

### 8.1 テスト戦略
```
Testing Pyramid:
├── Unit Tests (70%)      # 個別機能テスト
├── Integration Tests (20%) # API連携テスト
└── E2E Tests (10%)       # ユーザーシナリオテスト
```

### 8.2 テストケース設計

#### 8.2.1 地図表示テスト
```javascript
describe('MapView', () => {
  test('初期表示時に東京が中心に表示される', () => {
    const map = new MapView();
    expect(map.getCenter()).toEqual([139.7671, 35.6812]);
  });
  
  test('ズーム操作が正常に動作する', () => {
    const map = new MapView();
    map.setZoom(15);
    expect(map.getZoom()).toBe(15);
  });
});
```

#### 8.2.2 検索機能テスト
```javascript
describe('SearchService', () => {
  test('住所検索が正常に動作する', async () => {
    const results = await SearchService.search('東京駅');
    expect(results).toHaveLength(1);
    expect(results[0].name).toContain('東京駅');
  });
});
```

## 9. 監視・ログ設計

### 9.1 フロントエンド監視
```javascript
// パフォーマンス監視
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'navigation') {
      analytics.track('page_load_time', entry.loadEventEnd);
    }
  });
});

// エラー監視
window.addEventListener('error', (event) => {
  analytics.track('javascript_error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno
  });
});
```

### 9.2 バックエンド監視
```javascript
// API監視
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('api_request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration
    });
  });
  next();
});
```

## 10. デプロイメント設計

### 10.1 CI/CD パイプライン
```yaml
# GitHub Actions
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
      - run: docker build -t oss-map .
      
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: docker push oss-map
      - run: kubectl apply -f k8s/
```

### 10.2 インフラ構成
```yaml
# Docker Compose
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
      
  api-gateway:
    build: ./api-gateway
    ports:
      - "8080:8080"
      
  tile-server:
    image: klokantech/tileserver-gl
    volumes:
      - ./tiles:/data
      
  redis:
    image: redis:alpine
    
  elasticsearch:
    image: elasticsearch:8.0
```

---

**文書バージョン**: 1.0  
**作成日**: 2025年8月13日  
**最終更新**: 2025年8月13日