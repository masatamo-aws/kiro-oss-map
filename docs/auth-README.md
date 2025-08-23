# 🔐 Kiro OSS Map - 認証サービス

**バージョン**: v2.1.0  
**アーキテクチャ**: マイクロサービス・Cloud Native  
**技術スタック**: Node.js + TypeScript + Express.js + PostgreSQL + Redis

---

## 🎯 サービス概要

Kiro OSS Map の認証・認可を担当するマイクロサービスです。JWT ベースの認証、ユーザー管理、セッション管理、パスワードリセット機能を提供します。

### 主要機能
- **ユーザー認証**: 登録・ログイン・ログアウト
- **JWT管理**: アクセス・リフレッシュトークン
- **セッション管理**: Redis ベース高速セッション
- **セキュリティ**: ログイン試行制限・アカウントロック
- **ユーザー管理**: プロフィール・パスワード変更
- **監視**: Prometheus メトリクス・ヘルスチェック

---

## 🚀 クイックスタート

### 前提条件
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose（オプション）

### 1. 依存関係インストール
```bash
npm install
```

### 2. 環境変数設定
```bash
cp .env.example .env
# .env ファイルを編集
```

### 3. データベース初期化
```bash
# PostgreSQL データベース作成
createdb kiro_auth

# Redis 起動確認
redis-cli ping
```

### 4. 開発サーバー起動
```bash
npm run dev
```

サービスは http://localhost:3001 で起動します。

---

## 📋 API エンドポイント

### 🔐 認証 API

#### ユーザー登録
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

#### ログイン
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### トークンリフレッシュ
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### ログアウト
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### 👤 ユーザー管理 API

#### プロフィール取得
```http
GET /users/me
Authorization: Bearer <access_token>
```

#### プロフィール更新
```http
PUT /users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "new@example.com"
}
```

#### パスワード変更
```http
PUT /users/me/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### 🏥 監視 API

#### ヘルスチェック
```http
GET /health
GET /health/detailed
GET /health/ready
GET /health/live
```

#### メトリクス
```http
GET /metrics
GET /metrics/summary
GET /metrics/auth
```

---

## 🔧 設定

### 環境変数

#### 基本設定
```env
NODE_ENV=development
PORT=3001
```

#### データベース設定
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=kiro_auth
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_SSL=false
DATABASE_POOL_SIZE=10
```

#### Redis設定
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0
REDIS_KEY_PREFIX=auth:
```

#### JWT設定
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ISSUER=kiro-auth-service
JWT_AUDIENCE=kiro-services
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

#### セキュリティ設定
```env
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=30
PASSWORD_RESET_EXPIRY=60
```

#### CORS設定
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://kiro-map.com
```

---

## 🐳 Docker

### Docker ビルド
```bash
docker build -t kiro/auth-service:v2.1.0 .
```

### Docker 実行
```bash
docker run -p 3001:3001 \
  -e DATABASE_HOST=host.docker.internal \
  -e REDIS_HOST=host.docker.internal \
  kiro/auth-service:v2.1.0
```

### Docker Compose
```yaml
version: '3.8'
services:
  auth-service:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kiro_auth
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 🧪 テスト

### 単体テスト
```bash
npm run test
```

### テスト監視
```bash
npm run test:watch
```

### カバレッジ
```bash
npm run test:coverage
```

### 統合テスト
```bash
npm run test:integration
```

---

## 📊 監視・運用

### ヘルスチェック
- **基本**: `GET /health` - サービス生存確認
- **詳細**: `GET /health/detailed` - 依存関係・システム情報
- **準備状態**: `GET /health/ready` - Kubernetes Readiness Probe
- **生存確認**: `GET /health/live` - Kubernetes Liveness Probe

### メトリクス
- **Prometheus**: `GET /metrics` - 標準メトリクス形式
- **サマリー**: `GET /metrics/summary` - JSON形式統計
- **認証統計**: `GET /metrics/auth` - 認証関連統計
- **システム**: `GET /metrics/system` - システムリソース

### ログ
- **構造化ログ**: JSON形式・統一フォーマット
- **分散トレーシング**: OpenTelemetry対応
- **ログレベル**: DEBUG, INFO, WARN, ERROR

---

## 🔒 セキュリティ

### 認証・認可
- **JWT**: アクセス・リフレッシュトークン分離
- **パスワード**: bcrypt ハッシュ化（設定可能ラウンド数）
- **セッション**: Redis ベース・TTL管理
- **ログイン保護**: 試行回数制限・アカウントロック

### セキュリティヘッダー
- **Helmet**: セキュリティヘッダー自動設定
- **CORS**: オリジン制限・認証情報対応
- **レート制限**: IP ベース・設定可能制限

### データ保護
- **暗号化**: 機密データ暗号化
- **入力検証**: express-validator による検証
- **SQLインジェクション**: パラメータ化クエリ

---

## 🚀 デプロイ

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: kiro/auth-service:v2.1.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
```

### Helm Chart
```bash
helm upgrade --install auth-service ./helm/auth-service \
  --set image.tag=v2.1.0 \
  --set environment=production
```

---

## 🛠️ 開発

### 開発サーバー
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### 型チェック
```bash
npm run type-check
```

### リント
```bash
npm run lint
npm run lint:fix
```

### データベース初期化
```bash
# 開発環境でのスキーマ初期化
npm run db:init
```

---

## 📚 アーキテクチャ

### レイヤー構成
```
┌─────────────────┐
│   Routes        │ ← HTTP エンドポイント
├─────────────────┤
│   Middleware    │ ← 認証・バリデーション・メトリクス
├─────────────────┤
│   Services      │ ← ビジネスロジック
├─────────────────┤
│   Data Access   │ ← データベース・Redis アクセス
└─────────────────┘
```

### 依存関係
- **PostgreSQL**: ユーザー・セッション永続化
- **Redis**: セッション・キャッシュ・レート制限
- **Prometheus**: メトリクス収集・監視
- **OpenTelemetry**: 分散トレーシング

---

## 🤝 コントリビューション

### 開発フロー
1. Issue 作成・確認
2. Feature ブランチ作成
3. 実装・テスト
4. Pull Request 作成
5. コードレビュー
6. マージ・デプロイ

### コーディング規約
- **TypeScript**: 厳密な型定義
- **ESLint**: コード品質チェック
- **Prettier**: コードフォーマット
- **Jest**: テスト実装

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](../../LICENSE) ファイルを参照

---

## 📞 サポート

- **GitHub Issues**: [問題報告・機能要求](https://github.com/masatamo-aws/kiro-oss-map/issues)
- **GitHub Discussions**: [質問・議論](https://github.com/masatamo-aws/kiro-oss-map/discussions)
- **Email**: support@kiro-map.com

---

**Kiro OSS Map 認証サービス v2.1.0**  
**作成日**: 2025年8月19日  
**最終更新**: 2025年8月19日