# Kiro OSS Map v1.0.0

🗺️ **オープンソース地図Webアプリケーション** - OpenStreetMapを使用したGoogle Maps風の地図サービス

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.17.0-brightgreen)](https://nodejs.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/kiro-oss/kiro-oss-map)

> **🚀 5分で起動可能** | **📱 モバイル対応** | **🌙 ダークモード** | **🔍 高速検索** | **🛣️ ルート案内**

## 🌟 特徴

- **完全オープンソース**: OpenStreetMapとオープンソースライブラリを使用
- **高速表示**: MapLibre GL JSによるベクタ地図の高速レンダリング
- **多機能**: 検索、経路探索、地点共有、PWA対応
- **レスポンシブ**: PC・モバイル・タブレット対応
- **プライバシー重視**: 最小限の個人情報収集
- **カスタマイズ可能**: 自前ホスティング対応

## � スクリーンショット

### 🗺️ 標準地図表示
OpenStreetMapベースの詳細な地図表示。検索機能、現在地表示、レスポンシブデザインを搭載。

<div align="center">
  <img src="https://raw.githubusercontent.com/masatamo-aws/kiro-oss-map/main/assets/image/Standard%20Map.png" alt="Kiro OSS Map - 標準地図表示" width="800">
  <p><em>標準地図モード - 東京駅周辺の表示例</em></p>
</div>

### 🛰️ 衛星画像表示
航空写真による詳細な地形表示。建物や道路の実際の様子を確認できます。

<div align="center">
  <img src="https://raw.githubusercontent.com/masatamo-aws/kiro-oss-map/main/assets/image/Satelite%20Map.png" alt="Kiro OSS Map - 衛星画像表示" width="800">
  <p><em>衛星画像モード - 高解像度航空写真による地形表示</em></p>
</div>

### ✨ 主な表示機能
- **🔍 リアルタイム検索**: 入力と同時に候補を表示
- **📍 詳細ピン情報**: 地点クリックで詳細情報とアクション
- **🛣️ ルート表示**: 最適経路の可視化と案内
- **🌙 ダークモード**: 目に優しい夜間表示
- **📱 モバイル最適化**: タッチ操作とレスポンシブレイアウト

## 🚀 主要機能

### MVP機能
- ✅ **地図表示**: パン・ズーム・現在地表示
- ✅ **検索機能**: 住所・ランドマーク・POI検索
- ✅ **経路探索**: 車・徒歩ルート計算
- ✅ **地点共有**: URL共有・短縮URL
- ✅ **レスポンシブUI**: モバイル・PC対応

### 拡張機能（開発予定）
- 🔄 **PWA対応**: オフライン表示・ホーム画面追加
- 🔄 **計測ツール**: 距離・面積計測
- 🔄 **ブックマーク**: お気に入り地点保存
- 🔄 **多言語対応**: 日本語・英語
- 🔄 **API公開**: 開発者向けAPI

## 🛠️ 技術スタック

### フロントエンド
- **MapLibre GL JS**: 地図表示エンジン
- **Vanilla JavaScript**: フレームワークレス
- **Web Components**: モジュラー設計
- **Tailwind CSS**: ユーティリティファーストCSS
- **Vite**: 高速ビルドツール

### バックエンド
- **Node.js + Express**: APIサーバー
- **OpenStreetMap**: 地図データ
- **Nominatim**: ジオコーディング
- **OSRM**: ルーティング
- **Overpass API**: POI検索

### インフラ
- **Docker**: コンテナ化
- **Nginx**: リバースプロキシ
- **Redis**: キャッシュ（オプション）

## 🚀 クイックスタート（5分で起動）

### 📋 前提条件
以下のソフトウェアがインストールされている必要があります：

| ソフトウェア | バージョン | 必須/推奨 | 確認コマンド |
|-------------|-----------|----------|-------------|
| **Node.js** | 18.17.0以上 | 必須 | `node --version` |
| **npm** | 9.0.0以上 | 必須 | `npm --version` |
| **Git** | 最新版 | 必須 | `git --version` |
| **Docker** | 最新版 | オプション | `docker --version` |

### ⚡ 最速起動（3ステップ）

#### 1️⃣ プロジェクトの取得
```bash
# リポジトリをクローン
git clone https://github.com/kiro-oss/kiro-oss-map.git
cd kiro-oss-map
```

#### 2️⃣ 依存関係のインストール
```bash
# パッケージをインストール（約1-2分）
npm install
```

#### 3️⃣ アプリケーション起動
```bash
# 開発サーバーを起動
npm run dev
```

### 🎉 起動完了！

✅ **アプリケーションが正常に起動しました**

**📱 アクセス方法:**
- **ローカル**: http://localhost:3000/
- **ネットワーク**: http://[あなたのIP]:3000/
- **モバイル**: 同一Wi-Fi内のスマートフォンからアクセス可能

**🔍 動作確認:**
1. ブラウザで http://localhost:3000/ を開く
2. 地図が表示されることを確認
3. 検索ボックスで「東京駅」を検索
4. 地図上にピンが表示されることを確認

## 🔧 環境別セットアップ

### 🪟 Windows環境

#### PowerShell実行ポリシーエラーの解決
```powershell
# 管理者権限でPowerShellを開き、以下を実行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 代替起動方法（エラー時）
```cmd
# コマンドプロンプト（cmd）で実行
cd kiro-oss-map
npx vite --host 0.0.0.0 --port 3000
```

### 🍎 macOS環境

#### Homebrewを使用したセットアップ
```bash
# Node.jsのインストール
brew install node

# プロジェクトセットアップ
git clone https://github.com/kiro-oss/kiro-oss-map.git
cd kiro-oss-map
npm install
npm run dev
```

### 🐧 Linux環境

#### Ubuntu/Debian
```bash
# Node.jsのインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# プロジェクトセットアップ
git clone https://github.com/kiro-oss/kiro-oss-map.git
cd kiro-oss-map
npm install
npm run dev
```

#### CentOS/RHEL
```bash
# Node.jsのインストール
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# プロジェクトセットアップ
git clone https://github.com/kiro-oss/kiro-oss-map.git
cd kiro-oss-map
npm install
npm run dev
```

### 🐳 Docker使用

#### 開発環境（推奨）
```bash
# 開発用コンテナ起動
docker-compose --profile dev up

# バックグラウンド実行
docker-compose --profile dev up -d
```

#### 本番環境
```bash
# 本番用コンテナ起動
docker-compose up

# バックグラウンド実行
docker-compose up -d
```

#### Dockerコンテナの停止
```bash
# コンテナ停止
docker-compose down

# ボリュームも削除
docker-compose down -v
```

### 🛠️ 開発モード詳細

#### 利用可能なスクリプト
```bash
# 開発サーバー起動（ホットリロード有効）
npm run dev

# 本番用ビルド
npm run build

# 本番用プレビュー
npm run preview

# バックエンドAPIサーバー起動
npm run serve

# テスト実行
npm test

# リント実行
npm run lint

# フォーマット実行
npm run format
```

#### 同時起動（フロントエンド + バックエンド）
```bash
# ターミナル1: フロントエンド
npm run dev

# ターミナル2: バックエンドAPI
npm run serve
```

### 🌐 アクセス方法

#### ローカル開発
- **フロントエンド**: http://localhost:3000/
- **バックエンドAPI**: http://localhost:8080/
- **API Health Check**: http://localhost:8080/api/v1/health

#### ネットワークアクセス
- 同一ネットワーク内の他デバイスからアクセス可能
- スマートフォンでのテストに便利

## 🔍 トラブルシューティング

### ❗ よくある問題と解決方法

#### 🚫 起動エラー

| 問題 | 症状 | 解決方法 |
|------|------|----------|
| **ポート使用中** | `Error: listen EADDRINUSE :::3000` | `npm run dev -- --port 3001` |
| **Node.js バージョン** | `engine "node" is incompatible` | Node.js 18以上にアップデート |
| **権限エラー** | `permission denied` | 管理者権限で実行 |
| **依存関係エラー** | `Module not found` | `npm install` を再実行 |

#### 🔧 詳細な解決手順

**1. ポート3000が使用中の場合**
```bash
# 使用中のプロセスを確認
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Mac/Linux

# 別のポートで起動
npm run dev -- --port 3001
npm run dev -- --port 4000
```

**2. 依存関係の問題**
```bash
# キャッシュと依存関係をクリア
rm -rf node_modules package-lock.json  # Mac/Linux
rmdir /s node_modules & del package-lock.json  # Windows

# 再インストール
npm install

# 強制的にキャッシュクリア
npm run dev -- --force
```

**3. 権限エラー（Windows）**
```powershell
# PowerShellを管理者権限で開き実行
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# または、コマンドプロンプトを使用
cmd
cd kiro-oss-map
npx vite
```

**4. 地図が表示されない**
```bash
# ブラウザのコンソールでエラーを確認
# F12 → Console タブ

# よくあるエラーと対処法:
# - CORS エラー → ブラウザを再起動
# - JavaScript無効 → ブラウザ設定を確認
# - ネットワークエラー → インターネット接続を確認
```

#### 📊 ログの確認方法

```bash
# 開発サーバーのログ
npm run dev

# APIサーバーのログ（別ターミナル）
npm run serve

# Dockerを使用している場合
docker-compose logs -f

# 特定のサービスのログ
docker-compose logs -f app
```

#### 🌐 ネットワーク関連の問題

**モバイルデバイスからアクセスできない場合:**
```bash
# PCのIPアドレスを確認
ipconfig                    # Windows
ifconfig                    # Mac/Linux
ip addr show               # Linux

# ファイアウォール設定を確認
# Windows: Windows Defender ファイアウォール
# Mac: システム環境設定 → セキュリティとプライバシー → ファイアウォール
# Linux: ufw status
```

#### 🔄 完全リセット手順

問題が解決しない場合の最終手段：
```bash
# 1. プロジェクトディレクトリを削除
cd ..
rm -rf kiro-oss-map

# 2. 再度クローンからやり直し
git clone https://github.com/kiro-oss/kiro-oss-map.git
cd kiro-oss-map
npm install
npm run dev
```

### 🆘 サポート・お問い合わせ

解決しない場合は以下にお問い合わせください：

- 🐛 **バグレポート**: [GitHub Issues](https://github.com/kiro-oss/kiro-oss-map/issues)
- 💬 **質問・相談**: [GitHub Discussions](https://github.com/kiro-oss/kiro-oss-map/discussions)
- 📧 **直接お問い合わせ**: support@kiro-oss-map.org

**お問い合わせ時に含めていただきたい情報:**
- OS（Windows/Mac/Linux）とバージョン
- Node.jsバージョン（`node --version`）
- エラーメッセージの全文
- 実行したコマンドの履歴

### 📱 モバイルテスト

#### スマートフォンでのテスト方法
1. PCとスマートフォンを同一Wi-Fiに接続
2. PCのIPアドレスを確認
3. スマートフォンブラウザで `http://[PCのIP]:3000/` にアクセス

#### IPアドレス確認方法
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

## ⚙️ 設定・カスタマイズ

### 🔧 環境変数設定

#### 基本設定（.envファイル）
```bash
# .envファイルを作成（オプション）
touch .env
```

```env
# .env - 基本設定例
NODE_ENV=development
PORT=8080
BASE_URL=http://localhost:3000

# 外部API設定
NOMINATIM_URL=https://nominatim.openstreetmap.org
OSRM_URL=https://router.project-osrm.org
OVERPASS_URL=https://overpass-api.de/api/interpreter

# キャッシュ設定（オプション）
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# セキュリティ設定（本番環境）
SESSION_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000

# 監視・分析（オプション）
SENTRY_DSN=https://your-sentry-dsn
ANALYTICS_ID=GA-XXXXXXXXX
```

### 🎨 アプリケーション設定

#### デフォルト地図位置の変更
```javascript
// src/main.js - 初期表示位置を変更
const defaultCenter = [139.7671, 35.6812]; // 東京駅（経度, 緯度）
const defaultZoom = 10; // ズームレベル（1-20）

// 例: 大阪駅を初期位置にする場合
const defaultCenter = [135.4959, 34.7024];
```

#### 地図スタイルのカスタマイズ
```javascript
// src/services/MapService.js - カスタムタイルサーバー追加
const styles = {
  custom: {
    version: 8,
    sources: {
      'custom-tiles': {
        type: 'raster',
        tiles: ['https://your-tile-server/{z}/{x}/{y}.png'],
        tileSize: 256
      }
    },
    layers: [{
      id: 'custom-layer',
      type: 'raster',
      source: 'custom-tiles'
    }]
  }
};
```

#### 検索設定のカスタマイズ
```javascript
// src/services/SearchService.js - 検索範囲を日本に限定
const defaultOptions = {
  limit: 10,
  countrycodes: ['jp'], // 日本のみ
  addressdetails: 1,
  extratags: 1,
  namedetails: 1
};
```

### 🌐 多言語対応設定

#### 言語ファイルの追加（将来対応予定）
```json
// src/locales/ja.json
{
  "search.placeholder": "場所を検索...",
  "route.from": "出発地",
  "route.to": "目的地",
  "map.currentLocation": "現在地"
}
```

### 🔒 セキュリティ設定

#### CORS設定
```javascript
// server/index.js - CORS設定
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
```

#### CSP（Content Security Policy）設定
```html
<!-- src/index.html - セキュリティヘッダー -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https://nominatim.openstreetmap.org https://router.project-osrm.org;">
```

## 🎯 使用方法

### 📍 基本操作

#### 地図操作
1. **地図表示**: ページを開くと東京駅を中心とした地図が表示されます
2. **パン操作**: マウスドラッグまたはタッチで地図を移動
3. **ズーム**: マウスホイールまたはピンチで拡大・縮小
4. **現在地**: 右上の📍ボタンで現在地を表示（位置情報許可が必要）

#### 検索機能
1. **場所検索**: 上部の検索ボックスに場所を入力
   - 例: 「東京駅」「渋谷」「東京都庁」
2. **住所検索**: 詳細な住所で検索
   - 例: 「東京都千代田区丸の内1-1」
3. **施設検索**: 施設名やカテゴリで検索
   - 例: 「コンビニ」「病院」「ATM」

#### レイヤー・テーマ切替
1. **地図レイヤー**: 右上のレイヤーボタンで切替
   - 🗺️ **標準地図**: OpenStreetMapベース
   - 🛰️ **衛星画像**: 航空写真
   - 🏔️ **地形図**: 等高線表示
2. **テーマ切替**: 右上の🌙ボタンでダーク/ライトモード切替

### 🛣️ 経路探索

#### 基本的な経路検索
1. **検索結果から**: 検索結果の「ルート」ボタンをクリック
2. **直接入力**: 
   - 出発地と目的地を入力
   - 「現在地を使用」ボタンで現在地を出発地に設定
3. **地図クリック**: 地図上をクリックして出発地・目的地を設定

#### 交通手段選択
- 🚗 **車**: 自動車での最適ルート
- 🚶 **徒歩**: 歩行者専用道路を考慮したルート

#### ルート情報
- **距離・時間**: 推定距離と所要時間を表示
- **詳細案内**: ターンバイターン方式の詳細案内
- **印刷**: ルート情報を印刷用フォーマットで出力

### 🔗 共有機能

#### 地点共有
1. **URL共有**: 現在の地図位置をURLで共有
2. **QRコード**: QRコードで簡単共有（開発予定）
3. **埋め込み**: Webサイトやブログにiframeで埋め込み

#### ルート共有
1. **ルート計算後**: 「共有」ボタンをクリック
2. **URL生成**: 出発地・目的地・交通手段を含むURL
3. **SNS共有**: ネイティブ共有API対応（対応ブラウザ）

### 🎨 カスタマイズ

#### 表示設定
- **言語**: 日本語・英語対応（開発予定）
- **単位**: メートル法・ヤード・ポンド法（開発予定）
- **デフォルト位置**: 初期表示位置の変更

#### ブックマーク（開発予定）
- **お気に入り地点**: よく使う場所を保存
- **カテゴリ分類**: 仕事・プライベートなどで分類
- **同期機能**: デバイス間でのブックマーク同期

### 📱 モバイル対応

#### スマートフォン操作
- **タッチ操作**: ピンチ・ズーム、スワイプ対応
- **縦横画面**: 画面回転に自動対応
- **ホーム画面追加**: PWA対応でアプリのように使用可能

#### タブレット操作
- **大画面最適化**: タブレット画面サイズに最適化
- **サイドバー表示**: 検索結果を横に表示
- **マルチタッチ**: 複数指での操作対応

### 🔧 高度な機能

#### 計測ツール（開発予定）
- **距離計測**: 2点間の直線距離を測定
- **面積計測**: 多角形の面積を計算
- **ルート距離**: 実際の道路距離を計測

#### オフライン機能（開発予定）
- **地図キャッシュ**: よく使うエリアをオフライン保存
- **検索履歴**: オフライン時も検索履歴を利用
- **基本機能**: ネットワーク断絶時も地図表示を維持

### ⌨️ キーボードショートカット

| キー | 機能 |
|------|------|
| `Ctrl + F` | 検索ボックスにフォーカス |
| `Esc` | ダイアログを閉じる |
| `+` / `-` | ズームイン・アウト |
| `矢印キー` | 地図を移動 |
| `Ctrl + D` | ダークモード切替 |

### 🆘 ヘルプ・サポート

#### よくある質問
1. **現在地が取得できない**: ブラウザの位置情報許可を確認
2. **検索結果が出ない**: インターネット接続を確認
3. **地図が表示されない**: ブラウザのJavaScriptが有効か確認

#### サポート窓口
- 🐛 **バグレポート**: [GitHub Issues](https://github.com/kiro-oss/kiro-oss-map/issues)
- 💡 **機能要望**: [GitHub Discussions](https://github.com/kiro-oss/kiro-oss-map/discussions)
- 📧 **お問い合わせ**: support@kiro-oss-map.org

## 🔧 設定

### 環境変数

```bash
# .env ファイル作成
NODE_ENV=development
PORT=8080
BASE_URL=http://localhost:3000

# API設定
NOMINATIM_URL=https://nominatim.openstreetmap.org
OSRM_URL=https://router.project-osrm.org
OVERPASS_URL=https://overpass-api.de/api/interpreter

# Redis（オプション）
REDIS_URL=redis://localhost:6379
```

### カスタマイズ

#### 地図スタイル変更
```javascript
// src/services/MapService.js
const styles = {
  custom: {
    version: 8,
    sources: {
      'custom-tiles': {
        type: 'raster',
        tiles: ['https://your-tile-server/{z}/{x}/{y}.png']
      }
    }
  }
};
```

#### デフォルト位置変更
```javascript
// src/main.js
const defaultCenter = [139.7671, 35.6812]; // 東京駅
const defaultZoom = 10;
```

## 📊 パフォーマンス

### 目標値
- 地図初期表示: 3秒以内
- 検索応答時間: 2秒以内
- ルート計算時間: 5秒以内

### 最適化
- タイルキャッシュ: 7日間
- API応答キャッシュ: 5分〜1時間
- 画像最適化: WebP対応
- コード分割: 遅延読み込み

## 🧪 テスト

```bash
# 単体テスト
npm test

# カバレッジ
npm run test:coverage

# E2Eテスト
npm run test:e2e

# リント
npm run lint
```

## 🚀 本番デプロイ

### 📦 本番ビルド

#### 静的ファイル生成
```bash
# 本番用ビルド
npm run build

# ビルド結果確認
ls -la dist/

# プレビュー（ローカル確認）
npm run preview
```

#### Node.js本番サーバー
```bash
# 本番サーバー起動
npm run serve

# PM2使用（推奨）
npm install -g pm2
pm2 start server/index.js --name kiro-oss-map
pm2 startup
pm2 save
```

### 🐳 Docker本番デプロイ

#### 基本デプロイ
```bash
# イメージビルド
docker build -t kiro-oss-map .

# コンテナ起動
docker run -d \
  --name kiro-oss-map \
  -p 3000:8080 \
  -e NODE_ENV=production \
  kiro-oss-map

# ログ確認
docker logs -f kiro-oss-map
```

#### Docker Compose本番環境
```bash
# 本番環境起動
docker-compose -f docker-compose.yml up -d

# スケーリング
docker-compose up -d --scale app=3

# 停止
docker-compose down
```

### ☁️ クラウドデプロイ

#### Vercel（推奨）
```bash
# Vercel CLI インストール
npm install -g vercel

# デプロイ
vercel

# 本番デプロイ
vercel --prod
```

#### Netlify
```bash
# Netlify CLI インストール
npm install -g netlify-cli

# ビルド & デプロイ
npm run build
netlify deploy --prod --dir=dist
```

#### Heroku
```bash
# Heroku CLI でログイン
heroku login

# アプリ作成
heroku create kiro-oss-map

# デプロイ
git push heroku main

# 環境変数設定
heroku config:set NODE_ENV=production
```

### 🎛️ Kubernetes

#### 基本デプロイメント
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kiro-oss-map
  labels:
    app: kiro-oss-map
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kiro-oss-map
  template:
    metadata:
      labels:
        app: kiro-oss-map
    spec:
      containers:
      - name: app
        image: kiro-oss-map:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8080"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### サービス設定
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: kiro-oss-map-service
spec:
  selector:
    app: kiro-oss-map
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

#### Ingress設定
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kiro-oss-map-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - map.example.com
    secretName: kiro-oss-map-tls
  rules:
  - host: map.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kiro-oss-map-service
            port:
              number: 80
```

#### デプロイコマンド
```bash
# Kubernetesデプロイ
kubectl apply -f k8s/

# 状態確認
kubectl get pods
kubectl get services
kubectl get ingress

# ログ確認
kubectl logs -f deployment/kiro-oss-map

# スケーリング
kubectl scale deployment kiro-oss-map --replicas=5
```

### 🔧 本番環境設定

#### 環境変数
```bash
# 本番環境変数例
export NODE_ENV=production
export PORT=8080
export BASE_URL=https://map.example.com

# API設定
export NOMINATIM_URL=https://nominatim.openstreetmap.org
export OSRM_URL=https://router.project-osrm.org

# セキュリティ
export SESSION_SECRET=your-secret-key
export CORS_ORIGIN=https://map.example.com

# 監視
export SENTRY_DSN=https://your-sentry-dsn
export ANALYTICS_ID=GA-XXXXXXXXX
```

#### Nginx設定
```nginx
# /etc/nginx/sites-available/kiro-oss-map
server {
    listen 80;
    server_name map.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name map.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # セキュリティヘッダー
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # 静的ファイル
    location /assets/ {
        root /var/www/kiro-oss-map/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API プロキシ
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA フォールバック
    location / {
        root /var/www/kiro-oss-map/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 📊 監視・ログ

#### ヘルスチェック
```bash
# アプリケーション状態確認
curl http://localhost:8080/api/v1/health

# レスポンス例
{
  "status": "ok",
  "timestamp": "2025-08-13T08:00:00.000Z",
  "version": "1.0.0"
}
```

#### ログ設定
```javascript
// 本番ログ設定例
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 🔒 セキュリティ

#### SSL/TLS設定
```bash
# Let's Encrypt証明書取得
certbot --nginx -d map.example.com

# 証明書自動更新
crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

#### セキュリティチェック
```bash
# 脆弱性スキャン
npm audit

# 修正
npm audit fix

# セキュリティヘッダーチェック
curl -I https://map.example.com
```

## 📝 API仕様

### 検索API
```http
GET /api/v1/geocoding/search?q=東京駅&limit=10
```

### 経路API
```http
GET /api/v1/routing/route?coordinates=139.767,35.681;139.777,35.676&profile=driving
```

### 共有API
```http
POST /api/v1/share/create
Content-Type: application/json

{
  "type": "location",
  "data": {
    "center": [139.767, 35.681],
    "zoom": 15
  }
}
```

詳細は [API仕様書](./specifications.md) を参照してください。

## 🤝 コントリビューション

1. フォークする
2. フィーチャーブランチ作成 (`git checkout -b feature/amazing-feature`)
3. コミット (`git commit -m 'Add amazing feature'`)
4. プッシュ (`git push origin feature/amazing-feature`)
5. プルリクエスト作成

### 開発ガイドライン
- ESLint + Prettier使用
- コミットメッセージは日本語OK
- テストカバレッジ80%以上
- ドキュメント更新必須

## 📄 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照

### 使用ライブラリ
- MapLibre GL JS: BSD-3-Clause
- OpenStreetMap: ODbL
- Nominatim: GPL-2.0
- OSRM: BSD-2-Clause

## 🙏 謝辞

- [OpenStreetMap](https://www.openstreetmap.org/) コミュニティ
- [MapLibre](https://maplibre.org/) プロジェクト
- [OSRM](http://project-osrm.org/) プロジェクト
- [Nominatim](https://nominatim.org/) プロジェクト

## 📞 サポート

- 🐛 バグレポート: [Issues](https://github.com/kiro-oss/kiro-oss-map/issues)
- 💡 機能要望: [Discussions](https://github.com/kiro-oss/kiro-oss-map/discussions)
- 📧 お問い合わせ: support@kiro-oss-map.org

## 🗺️ ロードマップ

### v1.0 (MVP) - 完了
- [x] 基本地図表示
- [x] 検索機能
- [x] 経路探索
- [x] 地点共有

### v1.1 (拡張機能)
- [ ] PWA対応
- [ ] オフライン機能
- [ ] 計測ツール
- [ ] ブックマーク

### v1.2 (国際化)
- [ ] 多言語対応
- [ ] 地域別設定
- [ ] RTL言語対応

### v2.0 (API公開)
- [ ] 公開API
- [ ] 埋め込みウィジェット
- [ ] 開発者ポータル

---

**Made with ❤️ by Kiro OSS Map Team**