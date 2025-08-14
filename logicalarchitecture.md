# 論理アーキテクチャ図 - Kiro OSS Map v1.0.0

## 1. 実装済みシステム全体アーキテクチャ

```mermaid
graph TB
    subgraph "Client Layer - 実装完了"
        WEB[Web Browser<br/>Chrome/Firefox/Safari/Edge]
        PWA[PWA App<br/>Service Worker対応]
        MOB[Mobile Browser<br/>iOS Safari/Android Chrome]
    end
    
    subgraph "Frontend Application - 実装完了"
        APP[Kiro OSS Map v1.0.0<br/>Vanilla JS + Web Components]
        SW[Service Worker<br/>オフライン・キャッシュ]
        MANIFEST[App Manifest<br/>インストール可能]
    end
    
    subgraph "Backend API - 実装完了"
        EXPRESS[Express.js Server<br/>Node.js v18+]
        CORS[CORS Middleware]
        COMPRESS[Compression]
        HEALTH[Health Check]
    end
    
    subgraph "External APIs - 統合完了"
        OSM[OpenStreetMap<br/>地図タイル]
        NOMINATIM[Nominatim<br/>ジオコーディング]
        OSRM[OSRM<br/>ルーティング]
        WIKI[Wikipedia API<br/>画像取得]
        UNSPLASH[Unsplash API<br/>フォールバック画像]
    end
    
    subgraph "Storage Layer - 実装完了"
        LOCALSTORAGE[Local Storage<br/>設定・履歴]
        INDEXEDDB[IndexedDB<br/>オフラインデータ]
        MEMORY[Memory Cache<br/>API結果]
    end
    
    WEB --> APP
    PWA --> APP
    MOB --> APP
    
    APP --> SW
    APP --> MANIFEST
    APP --> EXPRESS
    
    EXPRESS --> CORS
    EXPRESS --> COMPRESS
    EXPRESS --> HEALTH
    
    EXPRESS --> NOMINATIM
    EXPRESS --> OSRM
    
    APP --> OSM
    APP --> WIKI
    APP --> UNSPLASH
    
    APP --> LOCALSTORAGE
    APP --> INDEXEDDB
    APP --> MEMORY
```

## 2. フロントエンドアーキテクチャ（実装完了）

```mermaid
graph TB
    subgraph "Presentation Layer - 実装完了"
        HTML[index.html<br/>メインHTML]
        CSS[main.css<br/>Tailwind CSS]
        COMPONENTS[Web Components<br/>SearchBox/RoutePanel/ShareDialog]
    end
    
    subgraph "Application Layer - 実装完了"
        MAIN[main.js<br/>アプリエントリーポイント]
        EVENTBUS[EventBus<br/>イベント管理]
        LOGGER[Logger<br/>ログ記録]
        ERROR[ErrorHandler<br/>エラーハンドリング]
    end
    
    subgraph "Service Layer - 実装完了"
        MAP[MapService<br/>地図操作]
        SEARCH[SearchService<br/>検索機能]
        ROUTE[RouteService<br/>ルーティング]
        GEO[GeolocationService<br/>位置情報]
        SHARE[ShareService<br/>共有機能]
        IMAGE[ImageService<br/>画像取得]
        THEME[ThemeService<br/>テーマ管理]
        STORAGE[StorageService<br/>データ永続化]
        PWA_SERVICE[PWAService<br/>PWA機能]
    end
    
    subgraph "External Integration - 実装完了"
        MAPLIBRE[MapLibre GL JS<br/>地図エンジン]
        FETCH[Fetch API<br/>HTTP通信]
        GEOLOCATION[Geolocation API<br/>位置取得]
        CLIPBOARD[Clipboard API<br/>コピー機能]
    end
    
    HTML --> MAIN
    CSS --> COMPONENTS
    COMPONENTS --> MAIN
    
    MAIN --> EVENTBUS
    MAIN --> LOGGER
    MAIN --> ERROR
    
    EVENTBUS --> MAP
    EVENTBUS --> SEARCH
    EVENTBUS --> ROUTE
    EVENTBUS --> GEO
    EVENTBUS --> SHARE
    EVENTBUS --> IMAGE
    EVENTBUS --> THEME
    EVENTBUS --> STORAGE
    EVENTBUS --> PWA_SERVICE
    
    MAP --> MAPLIBRE
    SEARCH --> FETCH
    ROUTE --> FETCH
    GEO --> GEOLOCATION
    SHARE --> CLIPBOARD
    IMAGE --> FETCH
```

## 3. データフロー図（実装完了）

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UI Components
    participant EventBus as EventBus
    participant Service as Services
    participant API as External APIs
    participant Cache as Cache Layer
    
    Note over User,Cache: 検索フロー（実装完了）
    User->>UI: 検索クエリ入力
    UI->>EventBus: search:query イベント
    EventBus->>Service: SearchService.search()
    Service->>Cache: キャッシュ確認
    alt キャッシュヒット
        Cache-->>Service: キャッシュデータ返却
    else キャッシュミス
        Service->>API: Nominatim API呼び出し
        API-->>Service: 検索結果返却
        Service->>Cache: 結果をキャッシュ
    end
    Service->>EventBus: search:results イベント
    EventBus->>UI: 結果表示更新
    UI-->>User: 検索結果表示
    
    Note over User,Cache: マーカー表示フロー（実装完了）
    User->>UI: 検索結果選択
    UI->>EventBus: search:select イベント
    EventBus->>Service: MapService.addMarker()
    Service->>Service: マーカー生成・ポップアップ作成
    Service->>API: ImageService.getLocationImage()
    API-->>Service: 画像データ返却
    Service->>UI: 地図更新・マーカー表示
    UI-->>User: 地図上にピン表示
```

## 4. コンポーネント関係図（実装完了）

```mermaid
graph LR
    subgraph "Web Components - 実装完了"
        SEARCHBOX[SearchBox<br/>検索UI]
        ROUTEPANEL[RoutePanel<br/>ルート管理]
        SHAREDIALOG[ShareDialog<br/>共有ダイアログ]
    end
    
    subgraph "Core Services - 実装完了"
        MAPSERVICE[MapService<br/>地図操作]
        SEARCHSERVICE[SearchService<br/>検索処理]
        ROUTESERVICE[RouteService<br/>ルート計算]
        SHARESERVICE[ShareService<br/>共有処理]
        IMAGESERVICE[ImageService<br/>画像取得]
    end
    
    subgraph "Utility Services - 実装完了"
        GEOSERVICE[GeolocationService<br/>位置情報]
        THEMESERVICE[ThemeService<br/>テーマ管理]
        STORAGESERVICE[StorageService<br/>データ保存]
        PWASERVICE[PWAService<br/>PWA機能]
    end
    
    subgraph "Infrastructure - 実装完了"
        EVENTBUS[EventBus<br/>イベント管理]
        LOGGER[Logger<br/>ログ記録]
        ERRORHANDLER[ErrorHandler<br/>エラー処理]
    end
    
    SEARCHBOX --> SEARCHSERVICE
    SEARCHBOX --> STORAGESERVICE
    ROUTEPANEL --> ROUTESERVICE
    ROUTEPANEL --> MAPSERVICE
    SHAREDIALOG --> SHARESERVICE
    
    SEARCHSERVICE --> MAPSERVICE
    SEARCHSERVICE --> IMAGESERVICE
    ROUTESERVICE --> MAPSERVICE
    MAPSERVICE --> GEOSERVICE
    
    SEARCHBOX --> EVENTBUS
    ROUTEPANEL --> EVENTBUS
    SHAREDIALOG --> EVENTBUS
    
    MAPSERVICE --> EVENTBUS
    SEARCHSERVICE --> EVENTBUS
    ROUTESERVICE --> EVENTBUS
    
    EVENTBUS --> LOGGER
    EVENTBUS --> ERRORHANDLER
    
    THEMESERVICE --> STORAGESERVICE
    PWASERVICE --> STORAGESERVICE
```

## 5. API統合アーキテクチャ（実装完了）

```mermaid
graph TB
    subgraph "Kiro OSS Map Frontend"
        APP[Application Layer]
        SERVICES[Service Layer]
        CACHE[Cache Layer]
    end
    
    subgraph "Backend API Server - 実装完了"
        EXPRESS[Express.js<br/>Port: 8080]
        GEOCODING[/api/v1/geocoding]
        ROUTING[/api/v1/routing]
        SHARE[/api/v1/share]
        HEALTH[/api/v1/health]
    end
    
    subgraph "External APIs - 統合完了"
        NOMINATIM_API[Nominatim<br/>nominatim.openstreetmap.org]
        OSRM_API[OSRM<br/>router.project-osrm.org]
        WIKI_API[Wikipedia API<br/>ja.wikipedia.org]
        UNSPLASH_API[Unsplash API<br/>api.unsplash.com]
        OSM_TILES[OSM Tiles<br/>tile.openstreetmap.org]
    end
    
    APP --> SERVICES
    SERVICES --> CACHE
    
    SERVICES --> EXPRESS
    EXPRESS --> GEOCODING
    EXPRESS --> ROUTING
    EXPRESS --> SHARE
    EXPRESS --> HEALTH
    
    GEOCODING --> NOMINATIM_API
    ROUTING --> OSRM_API
    
    SERVICES --> WIKI_API
    SERVICES --> UNSPLASH_API
    SERVICES --> OSM_TILES
    
    CACHE -.-> NOMINATIM_API
    CACHE -.-> OSRM_API
    CACHE -.-> WIKI_API
    CACHE -.-> UNSPLASH_API
```

## 6. デプロイメントアーキテクチャ（実装完了）

```mermaid
graph TB
    subgraph "Development Environment - 実装完了"
        DEV_LOCAL[Local Development<br/>npm run dev]
        DEV_DOCKER[Docker Development<br/>docker-compose up]
        DEV_VITE[Vite Dev Server<br/>Port: 3000]
    end
    
    subgraph "Production Environment - 実装完了"
        PROD_DOCKER[Docker Container<br/>Multi-stage Build]
        PROD_NODE[Node.js Server<br/>Port: 8080]
        PROD_STATIC[Static Files<br/>dist/]
    end
    
    subgraph "Container Architecture - 実装完了"
        DOCKERFILE[Dockerfile<br/>Node.js 18 Alpine]
        COMPOSE[docker-compose.yml<br/>Service Definition]
        VOLUMES[Volumes<br/>Logs & Data]
    end
    
    subgraph "Monitoring & Logging - 実装完了"
        HEALTH_CHECK[Health Check<br/>/api/v1/health]
        ACCESS_LOG[Access Logs<br/>Morgan Middleware]
        ERROR_LOG[Error Logs<br/>Winston Logger]
        CONSOLE_LOG[Console Logs<br/>Development]
    end
    
    DEV_LOCAL --> DEV_VITE
    DEV_DOCKER --> DEV_VITE
    
    PROD_DOCKER --> PROD_NODE
    PROD_NODE --> PROD_STATIC
    
    DOCKERFILE --> PROD_DOCKER
    COMPOSE --> PROD_DOCKER
    VOLUMES --> PROD_DOCKER
    
    PROD_NODE --> HEALTH_CHECK
    PROD_NODE --> ACCESS_LOG
    PROD_NODE --> ERROR_LOG
    DEV_VITE --> CONSOLE_LOG
```

## 7. セキュリティアーキテクチャ（実装完了）

```mermaid
graph TB
    subgraph "Client Security - 実装完了"
        CSP[Content Security Policy<br/>XSS防止]
        SANITIZE[Input Sanitization<br/>入力値検証]
        HTTPS[HTTPS Only<br/>暗号化通信]
    end
    
    subgraph "API Security - 実装完了"
        CORS_POLICY[CORS Policy<br/>オリジン制限]
        RATE_LIMIT[Rate Limiting<br/>リクエスト制限]
        INPUT_VALID[Input Validation<br/>パラメータ検証]
        ERROR_HANDLE[Secure Error Handling<br/>情報漏洩防止]
    end
    
    subgraph "Data Security - 実装完了"
        MINIMAL_DATA[Minimal Data Collection<br/>最小限データ収集]
        ANONYMOUS[Data Anonymization<br/>データ匿名化]
        SECURE_STORAGE[Secure Storage<br/>セキュアストレージ]
    end
    
    subgraph "Infrastructure Security - 実装完了"
        CONTAINER_SEC[Container Security<br/>最小権限実行]
        ENV_VAR[Environment Variables<br/>機密情報管理]
        LOG_SECURITY[Secure Logging<br/>機密情報除外]
    end
    
    CSP --> SANITIZE
    SANITIZE --> HTTPS
    
    CORS_POLICY --> RATE_LIMIT
    RATE_LIMIT --> INPUT_VALID
    INPUT_VALID --> ERROR_HANDLE
    
    MINIMAL_DATA --> ANONYMOUS
    ANONYMOUS --> SECURE_STORAGE
    
    CONTAINER_SEC --> ENV_VAR
    ENV_VAR --> LOG_SECURITY
```

## 8. パフォーマンスアーキテクチャ（実装完了）

```mermaid
graph TB
    subgraph "Frontend Performance - 実装完了"
        LAZY_LOAD[Lazy Loading<br/>コンポーネント遅延読み込み]
        CODE_SPLIT[Code Splitting<br/>Viteによる分割]
        TREE_SHAKE[Tree Shaking<br/>不要コード除去]
        IMAGE_OPT[Image Optimization<br/>画像最適化]
    end
    
    subgraph "Caching Strategy - 実装完了"
        MEMORY_CACHE[Memory Cache<br/>APIレスポンス]
        BROWSER_CACHE[Browser Cache<br/>Local Storage]
        SERVICE_WORKER[Service Worker<br/>オフラインキャッシュ]
        HTTP_CACHE[HTTP Cache<br/>静的リソース]
    end
    
    subgraph "Network Optimization - 実装完了"
        COMPRESSION[Response Compression<br/>gzip圧縮]
        DEBOUNCE[Input Debouncing<br/>検索入力制御]
        BATCH_REQUEST[Request Batching<br/>リクエスト最適化]
    end
    
    subgraph "Monitoring - 実装完了"
        CORE_VITALS[Core Web Vitals<br/>パフォーマンス計測]
        CUSTOM_METRICS[Custom Metrics<br/>カスタム指標]
        ERROR_TRACK[Error Tracking<br/>エラー追跡]
    end
    
    LAZY_LOAD --> CODE_SPLIT
    CODE_SPLIT --> TREE_SHAKE
    TREE_SHAKE --> IMAGE_OPT
    
    MEMORY_CACHE --> BROWSER_CACHE
    BROWSER_CACHE --> SERVICE_WORKER
    SERVICE_WORKER --> HTTP_CACHE
    
    COMPRESSION --> DEBOUNCE
    DEBOUNCE --> BATCH_REQUEST
    
    CORE_VITALS --> CUSTOM_METRICS
    CUSTOM_METRICS --> ERROR_TRACK
```

---

## 実装サマリー

### ✅ 完了済みアーキテクチャ要素

#### フロントエンド
- **Web Components**: SearchBox, RoutePanel, ShareDialog
- **Service Layer**: 9つのサービス（Map, Search, Route, Geolocation, Share, Image, Theme, Storage, PWA）
- **Event System**: EventBus による疎結合アーキテクチャ
- **Error Handling**: グローバルエラーハンドラー + 構造化ログ

#### バックエンド
- **Express.js API**: RESTful API サーバー
- **External Integration**: Nominatim, OSRM, Wikipedia, Unsplash
- **Middleware**: CORS, Compression, Security Headers
- **Health Check**: システム状態監視

#### インフラ
- **Docker**: マルチステージビルド + Docker Compose
- **PWA**: Service Worker + App Manifest
- **Caching**: 3層キャッシュ戦略
- **Security**: CSP, Input Validation, Secure Headers

#### 監視・運用
- **Logging**: Winston + Morgan による構造化ログ
- **Error Tracking**: グローバルエラーハンドリング
- **Performance**: Core Web Vitals 対応
- **Health Check**: API エンドポイント監視

---

## 9. GitHubリポジトリアーキテクチャ（v1.0.1）

```mermaid
graph TB
    subgraph "GitHub Repository - 公開完了"
        REPO[masatamo-aws/kiro-oss-map<br/>MIT License]
        MAIN[main branch<br/>v1.0.1]
        RELEASES[GitHub Releases<br/>セマンティックバージョニング]
    end
    
    subgraph "Community Features - 実装完了"
        ISSUES[GitHub Issues<br/>バグレポート・機能要望]
        DISCUSSIONS[GitHub Discussions<br/>技術相談・質問]
        WIKI[GitHub Wiki<br/>詳細ドキュメント]
        PROJECTS[GitHub Projects<br/>ロードマップ管理]
    end
    
    subgraph "CI/CD Pipeline - 計画中"
        ACTIONS[GitHub Actions<br/>自動テスト・ビルド]
        DEPENDABOT[Dependabot<br/>依存関係更新]
        SECURITY[Security Advisories<br/>脆弱性管理]
    end
    
    subgraph "Documentation - 完了"
        README[README.md<br/>プロジェクト概要]
        CHANGELOG_DOC[CHANGELOG.md<br/>変更履歴]
        SPECS[Technical Specs<br/>技術仕様書]
        DESIGN_DOC[Design Docs<br/>設計書]
    end
    
    REPO --> MAIN
    MAIN --> RELEASES
    
    REPO --> ISSUES
    REPO --> DISCUSSIONS
    REPO --> WIKI
    REPO --> PROJECTS
    
    REPO --> ACTIONS
    REPO --> DEPENDABOT
    REPO --> SECURITY
    
    MAIN --> README
    MAIN --> CHANGELOG_DOC
    MAIN --> SPECS
    MAIN --> DESIGN_DOC
```

## 10. オープンソースエコシステム

```mermaid
graph LR
    subgraph "Kiro OSS Map Ecosystem"
        CORE[Core Application<br/>v1.0.1]
        DOCS[Documentation<br/>完全版]
        COMMUNITY[Community<br/>GitHub中心]
    end
    
    subgraph "External Dependencies"
        MAPLIBRE[MapLibre GL JS<br/>地図エンジン]
        NOMINATIM[Nominatim<br/>ジオコーディング]
        OSRM[OSRM<br/>ルーティング]
        OSM[OpenStreetMap<br/>地図データ]
    end
    
    subgraph "Development Tools"
        VITE[Vite<br/>ビルドツール]
        DOCKER[Docker<br/>コンテナ化]
        NODE[Node.js<br/>ランタイム]
    end
    
    CORE --> MAPLIBRE
    CORE --> NOMINATIM
    CORE --> OSRM
    CORE --> OSM
    
    CORE --> VITE
    CORE --> DOCKER
    CORE --> NODE
    
    DOCS --> COMMUNITY
    COMMUNITY --> CORE
```

---

## 実装完了サマリー（v1.0.1）

### ✅ 完了済みアーキテクチャ要素

#### GitHubリポジトリ
- **公開リポジトリ**: https://github.com/masatamo-aws/kiro-oss-map
- **ライセンス**: MIT License
- **初回コミット**: d3790d4 (50ファイル、25,127行)
- **最新リリース**: v1.0.1

#### コミュニティ機能
- **Issue管理**: バグレポート・機能要望受付体制
- **Discussion**: 技術相談・質問対応
- **Documentation**: 包括的技術ドキュメント
- **Contributing**: オープンソース貢献ガイドライン

#### 継続的改善
- **バージョン管理**: セマンティックバージョニング
- **リリース管理**: GitHub Releases
- **ドキュメント管理**: 継続的更新体制
- **コミュニティ対応**: Issue・PR管理

---

**文書バージョン**: 2.1  
**作成日**: 2025年8月13日  
**最終更新**: 2025年8月13日  
**実装状況**: v1.0.1 完了・GitHub公開済み - 2025年8月13日  
**GitHubリポジトリ**: https://github.com/masatamo-aws/kiro-oss-map
    MOB --> CDN
    CDN --> CACHE
    CACHE --> LB
    LB --> GATEWAY
    
    GATEWAY --> AUTH
    GATEWAY --> RATE
    GATEWAY --> TILE
    GATEWAY --> GEO
    GATEWAY --> ROUTE
    GATEWAY --> POI
    GATEWAY --> SHARE
    
    TILE --> TILES
    GEO --> SEARCH
    GEO --> NOM
    ROUTE --> GRAPH
    ROUTE --> OSRM
    POI --> SEARCH
    SHARE --> CACHE_DB
    
    TILES --> OSM
    SEARCH --> OSM
    GRAPH --> OSM
```

## 2. フロントエンド アーキテクチャ

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[User Interface]
        COMP[Web Components]
        THEME[Theme System]
    end
    
    subgraph "Application Layer"
        APP[App Controller]
        ROUTER[Router]
        STATE[State Manager]
        EVENT[Event Bus]
    end
    
    subgraph "Service Layer"
        MAP_SVC[Map Service]
        SEARCH_SVC[Search Service]
        ROUTE_SVC[Route Service]
        GEO_SVC[Geolocation Service]
        SHARE_SVC[Share Service]
        STORAGE_SVC[Storage Service]
    end
    
    subgraph "Data Layer"
        API[API Client]
        CACHE[Local Cache]
        IDB[IndexedDB]
        SW[Service Worker]
    end
    
    subgraph "External"
        MAP_API[MapLibre GL JS]
        BROWSER_API[Browser APIs]
        BACKEND[Backend APIs]
    end
    
    UI --> COMP
    COMP --> THEME
    UI --> APP
    APP --> ROUTER
    APP --> STATE
    STATE --> EVENT
    
    APP --> MAP_SVC
    APP --> SEARCH_SVC
    APP --> ROUTE_SVC
    APP --> GEO_SVC
    APP --> SHARE_SVC
    
    MAP_SVC --> STORAGE_SVC
    SEARCH_SVC --> STORAGE_SVC
    ROUTE_SVC --> STORAGE_SVC
    
    MAP_SVC --> API
    SEARCH_SVC --> API
    ROUTE_SVC --> API
    SHARE_SVC --> API
    
    API --> CACHE
    CACHE --> IDB
    API --> SW
    
    MAP_SVC --> MAP_API
    GEO_SVC --> BROWSER_API
    API --> BACKEND
```

## 3. バックエンド マイクロサービス アーキテクチャ

```mermaid
graph TB
    subgraph "API Gateway Layer"
        GATEWAY[API Gateway]
        AUTH[Auth Middleware]
        CORS[CORS Handler]
        RATE[Rate Limiter]
        LOG[Request Logger]
    end
    
    subgraph "Service Mesh"
        subgraph "Tile Service"
            TILE_APP[Tile Server App]
            TILE_CACHE[Tile Cache]
        end
        
        subgraph "Geocoding Service"
            GEO_APP[Geocoding App]
            GEO_CACHE[Geocoding Cache]
        end
        
        subgraph "Routing Service"
            ROUTE_APP[Routing App]
            ROUTE_CACHE[Route Cache]
        end
        
        subgraph "POI Service"
            POI_APP[POI App]
            POI_CACHE[POI Cache]
        end
        
        subgraph "Share Service"
            SHARE_APP[Share App]
            URL_GEN[URL Generator]
        end
    end
    
    subgraph "Data Storage"
        TILE_STORE[(MBTiles)]
        ELASTIC[(Elasticsearch)]
        REDIS[(Redis)]
        OSRM_DATA[(OSRM Data)]
    end
    
    subgraph "External Services"
        OSM_API[OSM Overpass API]
        NOMINATIM[Nominatim API]
        OSRM_SVC[OSRM Service]
    end
    
    GATEWAY --> AUTH
    AUTH --> CORS
    CORS --> RATE
    RATE --> LOG
    
    LOG --> TILE_APP
    LOG --> GEO_APP
    LOG --> ROUTE_APP
    LOG --> POI_APP
    LOG --> SHARE_APP
    
    TILE_APP --> TILE_CACHE
    TILE_CACHE --> TILE_STORE
    
    GEO_APP --> GEO_CACHE
    GEO_CACHE --> ELASTIC
    GEO_APP --> NOMINATIM
    
    ROUTE_APP --> ROUTE_CACHE
    ROUTE_CACHE --> REDIS
    ROUTE_APP --> OSRM_DATA
    ROUTE_APP --> OSRM_SVC
    
    POI_APP --> POI_CACHE
    POI_CACHE --> ELASTIC
    POI_APP --> OSM_API
    
    SHARE_APP --> URL_GEN
    URL_GEN --> REDIS
```

## 4. データフロー アーキテクチャ

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant G as API Gateway
    participant S as Service
    participant D as Database
    participant E as External API
    
    Note over U,E: 地図表示フロー
    U->>F: 地図表示要求
    F->>G: タイル要求
    G->>S: Tile Service
    S->>D: タイルデータ取得
    D-->>S: タイルデータ
    S-->>G: タイルレスポンス
    G-->>F: タイル配信
    F-->>U: 地図表示
    
    Note over U,E: 検索フロー
    U->>F: 検索クエリ入力
    F->>G: 検索API要求
    G->>S: Geocoding Service
    S->>D: インデックス検索
    D-->>S: 検索結果
    alt 結果不十分
        S->>E: 外部API要求
        E-->>S: 追加結果
    end
    S-->>G: 統合結果
    G-->>F: 検索レスポンス
    F-->>U: 結果表示
    
    Note over U,E: 経路探索フロー
    U->>F: 経路探索要求
    F->>G: ルーティングAPI要求
    G->>S: Routing Service
    S->>D: キャッシュ確認
    alt キャッシュミス
        S->>E: OSRM API要求
        E-->>S: 経路データ
        S->>D: キャッシュ保存
    end
    D-->>S: 経路データ
    S-->>G: ルートレスポンス
    G-->>F: 経路情報
    F-->>U: ルート表示
```

## 5. セキュリティ アーキテクチャ

```mermaid
graph TB
    subgraph "Client Security"
        CSP[Content Security Policy]
        HTTPS[HTTPS Only]
        SRI[Subresource Integrity]
    end
    
    subgraph "Network Security"
        WAF[Web Application Firewall]
        DDoS[DDoS Protection]
        SSL[SSL Termination]
    end
    
    subgraph "API Security"
        AUTH_MW[Authentication Middleware]
        RATE_LIM[Rate Limiting]
        INPUT_VAL[Input Validation]
        CORS_POL[CORS Policy]
    end
    
    subgraph "Data Security"
        ENCRYPT[Data Encryption]
        ANON[Data Anonymization]
        BACKUP[Secure Backup]
    end
    
    subgraph "Infrastructure Security"
        FW[Firewall Rules]
        VPN[VPN Access]
        AUDIT[Audit Logging]
        MONITOR[Security Monitoring]
    end
    
    CSP --> WAF
    HTTPS --> SSL
    SRI --> WAF
    
    WAF --> AUTH_MW
    DDoS --> RATE_LIM
    SSL --> INPUT_VAL
    
    AUTH_MW --> ENCRYPT
    RATE_LIM --> ANON
    INPUT_VAL --> BACKUP
    CORS_POL --> ENCRYPT
    
    ENCRYPT --> FW
    ANON --> VPN
    BACKUP --> AUDIT
    
    FW --> MONITOR
    VPN --> MONITOR
    AUDIT --> MONITOR
```

## 6. キャッシュ アーキテクチャ

```mermaid
graph TB
    subgraph "Client Cache"
        BROWSER[Browser Cache]
        SW_CACHE[Service Worker Cache]
        IDB_CACHE[IndexedDB Cache]
    end
    
    subgraph "CDN Cache"
        EDGE[Edge Cache]
        REGIONAL[Regional Cache]
    end
    
    subgraph "Application Cache"
        REDIS_CACHE[Redis Cache]
        APP_CACHE[Application Memory Cache]
    end
    
    subgraph "Database Cache"
        ES_CACHE[Elasticsearch Cache]
        DB_CACHE[Database Query Cache]
    end
    
    subgraph "Cache Strategy"
        TILES_STRATEGY[Tiles: Cache-First]
        API_STRATEGY[API: Network-First]
        STATIC_STRATEGY[Static: Cache-First]
        SEARCH_STRATEGY[Search: Stale-While-Revalidate]
    end
    
    BROWSER --> EDGE
    SW_CACHE --> REGIONAL
    IDB_CACHE --> REDIS_CACHE
    
    EDGE --> APP_CACHE
    REGIONAL --> ES_CACHE
    REDIS_CACHE --> DB_CACHE
    
    TILES_STRATEGY --> BROWSER
    TILES_STRATEGY --> EDGE
    
    API_STRATEGY --> REDIS_CACHE
    API_STRATEGY --> APP_CACHE
    
    STATIC_STRATEGY --> SW_CACHE
    STATIC_STRATEGY --> EDGE
    
    SEARCH_STRATEGY --> ES_CACHE
    SEARCH_STRATEGY --> REDIS_CACHE
```

## 7. 監視・ログ アーキテクチャ

```mermaid
graph TB
    subgraph "Data Collection"
        CLIENT_METRICS[Client Metrics]
        SERVER_METRICS[Server Metrics]
        APP_LOGS[Application Logs]
        ACCESS_LOGS[Access Logs]
        ERROR_LOGS[Error Logs]
    end
    
    subgraph "Data Processing"
        LOG_AGGREGATOR[Log Aggregator]
        METRICS_PROCESSOR[Metrics Processor]
        ALERT_ENGINE[Alert Engine]
    end
    
    subgraph "Storage"
        TIME_SERIES[Time Series DB]
        LOG_STORE[Log Storage]
        METRICS_STORE[Metrics Storage]
    end
    
    subgraph "Visualization"
        DASHBOARD[Monitoring Dashboard]
        GRAFANA[Grafana]
        KIBANA[Kibana]
    end
    
    subgraph "Alerting"
        ALERT_MANAGER[Alert Manager]
        NOTIFICATION[Notification Service]
        ESCALATION[Escalation Policy]
    end
    
    CLIENT_METRICS --> LOG_AGGREGATOR
    SERVER_METRICS --> METRICS_PROCESSOR
    APP_LOGS --> LOG_AGGREGATOR
    ACCESS_LOGS --> LOG_AGGREGATOR
    ERROR_LOGS --> ALERT_ENGINE
    
    LOG_AGGREGATOR --> LOG_STORE
    METRICS_PROCESSOR --> TIME_SERIES
    ALERT_ENGINE --> ALERT_MANAGER
    
    TIME_SERIES --> GRAFANA
    LOG_STORE --> KIBANA
    METRICS_STORE --> DASHBOARD
    
    ALERT_MANAGER --> NOTIFICATION
    NOTIFICATION --> ESCALATION
```

## 8. デプロイメント アーキテクチャ

```mermaid
graph TB
    subgraph "Development"
        DEV_CODE[Source Code]
        DEV_BUILD[Build Process]
        DEV_TEST[Unit Tests]
    end
    
    subgraph "CI/CD Pipeline"
        GIT[Git Repository]
        CI[Continuous Integration]
        CD[Continuous Deployment]
        REGISTRY[Container Registry]
    end
    
    subgraph "Staging Environment"
        STAGE_LB[Staging Load Balancer]
        STAGE_APP[Staging Application]
        STAGE_DB[Staging Database]
        STAGE_TEST[Integration Tests]
    end
    
    subgraph "Production Environment"
        PROD_LB[Production Load Balancer]
        PROD_APP[Production Application]
        PROD_DB[Production Database]
        PROD_MONITOR[Production Monitoring]
    end
    
    subgraph "Infrastructure"
        K8S[Kubernetes Cluster]
        DOCKER[Docker Containers]
        HELM[Helm Charts]
    end
    
    DEV_CODE --> DEV_BUILD
    DEV_BUILD --> DEV_TEST
    DEV_TEST --> GIT
    
    GIT --> CI
    CI --> CD
    CD --> REGISTRY
    
    REGISTRY --> STAGE_LB
    STAGE_LB --> STAGE_APP
    STAGE_APP --> STAGE_DB
    STAGE_DB --> STAGE_TEST
    
    STAGE_TEST --> PROD_LB
    PROD_LB --> PROD_APP
    PROD_APP --> PROD_DB
    PROD_DB --> PROD_MONITOR
    
    DOCKER --> K8S
    HELM --> K8S
    K8S --> STAGE_APP
    K8S --> PROD_APP
```

## 9. スケーラビリティ アーキテクチャ

```mermaid
graph TB
    subgraph "Horizontal Scaling"
        LB[Load Balancer]
        APP1[App Instance 1]
        APP2[App Instance 2]
        APP3[App Instance N]
        AUTO_SCALE[Auto Scaling Group]
    end
    
    subgraph "Vertical Scaling"
        CPU_SCALE[CPU Scaling]
        MEM_SCALE[Memory Scaling]
        STORAGE_SCALE[Storage Scaling]
    end
    
    subgraph "Database Scaling"
        MASTER[Master DB]
        REPLICA1[Read Replica 1]
        REPLICA2[Read Replica 2]
        SHARD1[Shard 1]
        SHARD2[Shard 2]
    end
    
    subgraph "Cache Scaling"
        REDIS_CLUSTER[Redis Cluster]
        CACHE_NODE1[Cache Node 1]
        CACHE_NODE2[Cache Node 2]
        CACHE_NODE3[Cache Node 3]
    end
    
    subgraph "CDN Scaling"
        GLOBAL_CDN[Global CDN]
        EDGE1[Edge Location 1]
        EDGE2[Edge Location 2]
        EDGE3[Edge Location N]
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    AUTO_SCALE --> APP1
    AUTO_SCALE --> APP2
    AUTO_SCALE --> APP3
    
    CPU_SCALE --> APP1
    MEM_SCALE --> APP1
    STORAGE_SCALE --> APP1
    
    APP1 --> MASTER
    APP2 --> REPLICA1
    APP3 --> REPLICA2
    MASTER --> SHARD1
    MASTER --> SHARD2
    
    APP1 --> REDIS_CLUSTER
    REDIS_CLUSTER --> CACHE_NODE1
    REDIS_CLUSTER --> CACHE_NODE2
    REDIS_CLUSTER --> CACHE_NODE3
    
    GLOBAL_CDN --> EDGE1
    GLOBAL_CDN --> EDGE2
    GLOBAL_CDN --> EDGE3
```

## 10. 災害復旧 アーキテクチャ

```mermaid
graph TB
    subgraph "Primary Site"
        PRIMARY_LB[Primary Load Balancer]
        PRIMARY_APP[Primary Application]
        PRIMARY_DB[Primary Database]
        PRIMARY_STORAGE[Primary Storage]
    end
    
    subgraph "Secondary Site"
        SECONDARY_LB[Secondary Load Balancer]
        SECONDARY_APP[Secondary Application]
        SECONDARY_DB[Secondary Database]
        SECONDARY_STORAGE[Secondary Storage]
    end
    
    subgraph "Backup Systems"
        BACKUP_SCHEDULER[Backup Scheduler]
        BACKUP_STORAGE[Backup Storage]
        BACKUP_MONITOR[Backup Monitor]
    end
    
    subgraph "Failover Systems"
        HEALTH_CHECK[Health Check]
        FAILOVER_TRIGGER[Failover Trigger]
        DNS_SWITCH[DNS Switching]
    end
    
    subgraph "Recovery Systems"
        RECOVERY_PROCESS[Recovery Process]
        DATA_SYNC[Data Synchronization]
        ROLLBACK[Rollback Mechanism]
    end
    
    PRIMARY_DB --> SECONDARY_DB
    PRIMARY_STORAGE --> SECONDARY_STORAGE
    
    PRIMARY_DB --> BACKUP_SCHEDULER
    BACKUP_SCHEDULER --> BACKUP_STORAGE
    BACKUP_STORAGE --> BACKUP_MONITOR
    
    HEALTH_CHECK --> PRIMARY_APP
    HEALTH_CHECK --> FAILOVER_TRIGGER
    FAILOVER_TRIGGER --> DNS_SWITCH
    DNS_SWITCH --> SECONDARY_LB
    
    RECOVERY_PROCESS --> DATA_SYNC
    DATA_SYNC --> ROLLBACK
    ROLLBACK --> PRIMARY_APP
```

---

**文書バージョン**: 1.0  
**作成日**: 2025年8月13日  
**最終更新**: 2025年8月13日