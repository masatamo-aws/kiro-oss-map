# 🏗️ Kiro OSS Map v2.1.0 - マイクロサービス

**バージョン**: v2.1.0 - マイクロサービス化・CI/CD統合  
**アーキテクチャ**: Cloud Native・マイクロサービス  
**開始日**: 2025年8月19日

---

## 🎯 マイクロサービス概要

### 🌟 アーキテクチャ進化

#### 現在（v2.0.0 Enhanced）
```
Frontend ←→ API Gateway (Monolith) ←→ Database/Redis
```

#### 目標（v2.1.0）
```
Frontend ←→ API Gateway ←→ Auth Service
                        ←→ Map Service
                        ←→ Search Service
                        ←→ Route Service
                        ←→ User Service
```

---

## 🔧 マイクロサービス一覧

### 🔐 認証サービス (Auth Service)
**ディレクトリ**: `services/auth/`  
**ポート**: 3001  
**責任**: ユーザー認証・認可・セッション管理

#### 主要機能
- ユーザー登録・ログイン・ログアウト
- JWT・OAuth2.0・OIDC対応
- セッション・トークン管理
- パスワードリセット・変更
- ロールベースアクセス制御 (RBAC)

#### 技術スタック
- **Runtime**: Node.js 20 + TypeScript 5
- **Framework**: Express.js + Helmet + CORS
- **Database**: PostgreSQL 15 (ユーザー情報)
- **Cache**: Redis 7 (セッション・トークン)
- **Security**: bcrypt + jsonwebtoken + passport

### 🗺️ 地図サービス (Map Service)
**ディレクトリ**: `services/map/`  
**ポート**: 3002  
**責任**: 地図タイル配信・スタイル管理

#### 主要機能
- 地図タイルの高速配信
- 地図スタイルの管理・配信
- タイル・スタイルのキャッシュ戦略
- CDN統合・コンテンツ配信
- カスタムスタイル対応

#### 技術スタック
- **Runtime**: Node.js 20 + TypeScript 5
- **Framework**: Express.js + Sharp (画像処理)
- **Tile Server**: TileServer GL + MapProxy
- **Cache**: Redis + CDN (CloudFlare/AWS CloudFront)
- **Storage**: S3 Compatible (MinIO/AWS S3)

### 🔍 検索サービス (Search Service)
**ディレクトリ**: `services/search/`  
**ポート**: 3003  
**責任**: ジオコーディング・POI検索・分析

#### 主要機能
- ジオコーディング・逆ジオコーディング
- POI検索・フィルタリング
- オートコンプリート・検索候補
- 検索分析・統計
- 検索履歴管理

#### 技術スタック
- **Runtime**: Node.js 20 + TypeScript 5
- **Framework**: Express.js + Joi
- **Search Engine**: Elasticsearch 8 + OpenSearch
- **External API**: Nominatim + Overpass API
- **Cache**: Redis (検索結果・候補)

### 🛣️ ルーティングサービス (Route Service)
**ディレクトリ**: `services/route/`  
**ポート**: 3004  
**責任**: 経路計算・ナビゲーション・交通情報

#### 主要機能
- 経路計算・最適化
- 複数交通手段対応（車・徒歩・自転車・公共交通）
- リアルタイム交通情報
- ターンバイターン案内
- 経路共有・保存

#### 技術スタック
- **Runtime**: Node.js 20 + TypeScript 5
- **Framework**: Express.js + Turf.js
- **Routing Engine**: OSRM + GraphHopper
- **Cache**: Redis (経路・交通情報)
- **Queue**: Bull (重い計算処理)

### 👤 ユーザーサービス (User Service)
**ディレクトリ**: `services/user/`  
**ポート**: 3005  
**責任**: ユーザーデータ・ブックマーク・設定管理

#### 主要機能
- ブックマーク管理・カテゴリ分類
- ユーザー設定・プリファレンス
- 検索・ルート履歴管理
- デバイス間データ同期
- プライバシー・データ削除権

#### 技術スタック
- **Runtime**: Node.js 20 + TypeScript 5
- **Framework**: Express.js + Prisma
- **Database**: PostgreSQL 15 (ユーザーデータ)
- **Cache**: Redis (設定・セッション)
- **Encryption**: AES-256-GCM (機密データ)

---

## 🚀 開発・デプロイ

### 📁 ディレクトリ構造
```
services/
├── auth/                 # 認証サービス
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── map/                  # 地図サービス
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── search/               # 検索サービス
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── route/                # ルーティングサービス
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── user/                 # ユーザーサービス
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── shared/               # 共通ライブラリ
│   ├── types/
│   ├── utils/
│   ├── middleware/
│   └── config/
└── docker-compose.yml    # 開発環境用
```

### 🔄 開発ワークフロー

#### 1. 個別サービス開発
```bash
# 特定サービスの開発
cd services/auth
npm install
npm run dev

# テスト実行
npm run test
npm run test:watch
```

#### 2. 統合開発・テスト
```bash
# 全サービス起動
docker-compose up -d

# 統合テスト実行
npm run test:integration

# E2Eテスト実行
npm run test:e2e
```

#### 3. 本番デプロイ
```bash
# Kubernetes デプロイ
kubectl apply -f k8s/

# Helm デプロイ
helm upgrade --install kiro ./helm/kiro
```

---

## 📊 監視・運用

### 🔍 ヘルスチェック
各サービスは以下のエンドポイントを提供：
- `GET /health` - 基本ヘルスチェック
- `GET /health/detailed` - 詳細ヘルスチェック
- `GET /metrics` - Prometheusメトリクス

### 📈 メトリクス
- **HTTP リクエスト**: 数・レスポンス時間・エラー率
- **データベース**: 接続数・クエリ時間
- **キャッシュ**: ヒット率・使用量
- **システム**: CPU・メモリ・ディスク使用量

### 📝 ログ
- **構造化ログ**: JSON形式・統一フォーマット
- **分散トレーシング**: Jaeger・OpenTelemetry
- **ログ集約**: Fluentd・Elasticsearch・Kibana

---

## 🔒 セキュリティ

### 🛡️ サービス間通信
- **mTLS**: 相互TLS認証
- **API Gateway**: 統一認証・認可
- **Service Mesh**: Istio・Linkerd

### 🔐 データ保護
- **暗号化**: データベース・通信暗号化
- **Secret管理**: Kubernetes Secrets・Vault
- **監査ログ**: セキュリティイベント記録

---

## 🎯 パフォーマンス目標

### 📊 レスポンス時間
| サービス | エンドポイント | 目標 |
|----------|----------------|------|
| Auth | POST /login | <200ms |
| Map | GET /tiles | <50ms |
| Search | GET /geocode | <300ms |
| Route | POST /calculate | <1000ms |
| User | GET /bookmarks | <100ms |

### 🚀 スループット
| サービス | 目標RPS | 同時接続 |
|----------|---------|----------|
| Auth | 1,000 | 10,000 |
| Map | 5,000 | 50,000 |
| Search | 2,000 | 20,000 |
| Route | 500 | 5,000 |
| User | 1,500 | 15,000 |

---

## 📚 開発ガイド

### 🛠️ 開発環境セットアップ
1. **前提条件**: Node.js 20, Docker, kubectl
2. **依存関係インストール**: `npm install`
3. **開発サーバー起動**: `npm run dev:services`
4. **テスト実行**: `npm run test:all`

### 📖 API設計ガイドライン
- **RESTful**: REST原則準拠
- **OpenAPI**: API仕様書必須
- **バージョニング**: セマンティックバージョニング
- **エラーハンドリング**: 統一エラーフォーマット

### 🧪 テスト戦略
- **単体テスト**: 70%カバレッジ
- **統合テスト**: 20%カバレッジ
- **E2Eテスト**: 10%カバレッジ
- **パフォーマンステスト**: 継続的実行

---

**作成日**: 2025年8月19日  
**作成者**: Kiro AI Assistant  
**バージョン**: 1.0  
**次回更新**: サービス実装完了時