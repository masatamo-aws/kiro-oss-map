# Kiro OSS Map - Map Service v2.1.0

地図タイル配信・スタイル管理・CDN統合を担当するマイクロサービス

## 概要

Map Serviceは、Kiro OSS Mapプロジェクトの地図関連機能を提供するマイクロサービスです。高性能なタイル配信、柔軟なスタイル管理、CDN統合による最適化を実現します。

## 主要機能

### 🗺️ タイル配信
- **高速タイル配信**: Redis キャッシュによる高速レスポンス
- **複数フォーマット対応**: PNG, JPEG, WebP, PBF
- **動的タイル生成**: リアルタイムタイル生成・変換
- **事前生成**: バッチ処理による事前タイル生成

### 🎨 スタイル管理
- **MapLibre GL JS対応**: 標準的なスタイル仕様
- **動的スタイル切り替え**: リアルタイムスタイル変更
- **カスタムスタイル**: ユーザー定義スタイル作成・管理
- **プレビュー生成**: スタイルプレビュー画像生成

### 🚀 パフォーマンス最適化
- **CDN統合**: Cloudflare, AWS CloudFront, GCP CDN対応
- **キャッシュ戦略**: 多層キャッシュによる最適化
- **圧縮**: Gzip, Brotli圧縮対応
- **レート制限**: API保護・負荷制御

### 📊 監視・分析
- **Prometheusメトリクス**: 詳細なパフォーマンス監視
- **分散トレーシング**: Jaeger統合
- **ヘルスチェック**: Kubernetes対応
- **ログ集約**: 構造化ログ出力

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Cache     │    │   Load Balancer │    │   API Gateway   │
│  (Cloudflare)   │    │     (Nginx)     │    │     (Kong)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Map Service   │
                    │   (Express.js)  │
                    └─────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Redis       │ │    Storage      │ │   Monitoring    │
│    (Cache)      │ │  (S3/GCS/Local) │ │ (Prometheus)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## クイックスタート

### 前提条件

- Node.js 20.0.0以上
- Redis 6.0以上
- Docker & Docker Compose（オプション）

### インストール

```bash
# リポジトリクローン
git clone https://github.com/masatamo-aws/kiro-oss-map.git
cd kiro-oss-map/services/map

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集

# 開発サーバー起動
npm run dev
```

### Docker使用

```bash
# Docker Compose起動
docker-compose up -d

# ログ確認
docker-compose logs -f map-service
```

## API仕様

### タイル配信API

#### タイル取得
```http
GET /tiles/{z}/{x}/{y}.{format}
```

**パラメータ:**
- `z`: ズームレベル (0-18)
- `x`: タイルX座標
- `y`: タイルY座標
- `format`: タイル形式 (png, jpg, webp, pbf)

**レスポンス:**
```http
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: public, max-age=86400
ETag: "1-0-0-png"

[バイナリデータ]
```

#### タイル統計
```http
GET /tiles/stats
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "totalTiles": 1234567,
    "cacheHitRate": 0.95,
    "averageResponseTime": 45,
    "formats": {
      "png": 800000,
      "jpg": 300000,
      "webp": 134567
    }
  }
}
```

### スタイル管理API

#### スタイル一覧
```http
GET /styles
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "styles": [
      {
        "id": "basic",
        "name": "Basic Style",
        "description": "基本的な地図スタイル",
        "version": "1.0.0",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "count": 1
  }
}
```

#### スタイル取得
```http
GET /styles/{styleId}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "version": 8,
    "name": "Basic Style",
    "sources": {
      "tiles": {
        "type": "raster",
        "tiles": ["http://localhost:3002/tiles/{z}/{x}/{y}.png"],
        "tileSize": 256
      }
    },
    "layers": [
      {
        "id": "background",
        "type": "background",
        "paint": {
          "background-color": "#f0f0f0"
        }
      }
    ]
  }
}
```

### 監視API

#### ヘルスチェック
```http
GET /health
```

**レスポンス:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "version": "2.1.0",
  "uptime": 3600,
  "services": {
    "redis": {
      "status": "up",
      "responseTime": 2
    },
    "storage": {
      "status": "up",
      "responseTime": 15
    }
  }
}
```

#### メトリクス
```http
GET /metrics
```

**レスポンス:**
```
# HELP map_service_requests_total Total number of requests
# TYPE map_service_requests_total counter
map_service_requests_total{operation="get_tile"} 1234567
```

## 設定

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `NODE_ENV` | 実行環境 | `development` |
| `PORT` | サーバーポート | `3002` |
| `REDIS_HOST` | Redisホスト | `localhost` |
| `REDIS_PORT` | Redisポート | `6379` |
| `STORAGE_TYPE` | ストレージタイプ | `local` |
| `TILE_MAX_ZOOM` | 最大ズームレベル | `18` |
| `CDN_ENABLED` | CDN有効化 | `false` |

詳細は `.env.example` を参照してください。

### ストレージ設定

#### ローカルストレージ
```env
STORAGE_TYPE=local
STORAGE_LOCAL_BASE_PATH=./data
```

#### Amazon S3
```env
STORAGE_TYPE=s3
S3_BUCKET=kiro-map-tiles
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

#### Google Cloud Storage
```env
STORAGE_TYPE=gcs
GCS_BUCKET=kiro-map-tiles
GCS_KEY_FILENAME=./gcs-key.json
GCS_PROJECT_ID=your-project-id
```

## 開発

### 開発環境セットアップ

```bash
# 依存関係インストール
npm install

# 開発サーバー起動（ホットリロード）
npm run dev

# TypeScript型チェック
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

### テスト

```bash
# 全テスト実行
npm test

# テスト監視モード
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage
```

### ビルド

```bash
# 本番ビルド
npm run build

# ビルド結果確認
npm start
```

### Docker開発

```bash
# 開発用コンテナビルド
docker build --target development -t kiro/map-service:dev .

# 開発用コンテナ起動
docker run -p 3002:3002 -v $(pwd):/app kiro/map-service:dev

# 本番用コンテナビルド
docker build --target production -t kiro/map-service:latest .
```

## デプロイ

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: map-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: map-service
  template:
    metadata:
      labels:
        app: map-service
    spec:
      containers:
      - name: map-service
        image: kiro/map-service:v2.1.0
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis-service"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Docker Compose

```yaml
version: '3.8'
services:
  map-service:
    image: kiro/map-service:v2.1.0
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    depends_on:
      - redis
    volumes:
      - ./data:/app/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## 監視・運用

### メトリクス監視

Prometheusメトリクスエンドポイント: `GET /metrics`

主要メトリクス:
- `map_service_requests_total`: 総リクエスト数
- `map_service_request_duration_seconds`: レスポンス時間
- `map_service_errors_total`: エラー数
- `map_service_active_connections`: アクティブ接続数

### ログ監視

構造化ログ出力（JSON形式）:
```json
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "level": "info",
  "service": "map-service",
  "version": "2.1.0",
  "message": "Tile served successfully",
  "metadata": {
    "z": 10,
    "x": 512,
    "y": 384,
    "format": "png",
    "responseTime": 45
  }
}
```

### アラート設定

推奨アラート:
- エラー率 > 5%
- レスポンス時間 > 1000ms
- メモリ使用率 > 80%
- Redis接続エラー

## トラブルシューティング

### よくある問題

#### 1. タイルが表示されない
```bash
# ストレージ接続確認
curl http://localhost:3002/health

# タイル存在確認
ls -la ./data/tiles/

# Redis接続確認
redis-cli ping
```

#### 2. メモリ使用量が多い
```bash
# メモリ使用量確認
curl http://localhost:3002/metrics/json | jq '.data.memory'

# キャッシュクリア
curl -X DELETE http://localhost:3002/tiles/cache
```

#### 3. レスポンスが遅い
```bash
# パフォーマンス確認
curl http://localhost:3002/metrics/performance

# Redis統計確認
redis-cli info stats
```

## ライセンス

MIT License - 詳細は [LICENSE](../../LICENSE) を参照

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

- GitHub Issues: https://github.com/masatamo-aws/kiro-oss-map/issues
- ドキュメント: https://github.com/masatamo-aws/kiro-oss-map/wiki