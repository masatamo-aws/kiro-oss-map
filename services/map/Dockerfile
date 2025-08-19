# Kiro OSS Map v2.1.0 - Map Service Dockerfile
# マルチステージビルドによる最適化されたコンテナイメージ

# ベースイメージ（Node.js 20 Alpine）
FROM node:20-alpine AS base

# 作業ディレクトリ設定
WORKDIR /app

# システム依存関係インストール
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    pkgconfig \
    && ln -sf python3 /usr/bin/python

# 依存関係ステージ
FROM base AS dependencies

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
COPY ../shared/package*.json ../shared/

# 依存関係インストール
RUN npm ci --only=production && npm cache clean --force

# 開発依存関係ステージ
FROM base AS dev-dependencies

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
COPY ../shared/package*.json ../shared/

# 全依存関係インストール
RUN npm ci && npm cache clean --force

# ビルドステージ
FROM dev-dependencies AS build

# 共有ライブラリコピー
COPY ../shared ../shared

# ソースコードコピー
COPY src ./src
COPY tsconfig.json ./

# TypeScriptビルド
RUN npm run build

# 本番ステージ
FROM base AS production

# 非rootユーザー作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mapservice -u 1001

# 本番依存関係コピー
COPY --from=dependencies /app/node_modules ./node_modules

# 共有ライブラリコピー
COPY --from=build /app/../shared/dist ../shared/dist
COPY --from=dependencies /app/../shared/node_modules ../shared/node_modules

# ビルド済みアプリケーションコピー
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# データディレクトリ作成
RUN mkdir -p /app/data/tiles /app/data/styles && \
    chown -R mapservice:nodejs /app

# ユーザー切り替え
USER mapservice

# ポート公開
EXPOSE 3002

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "
        const http = require('http');
        const options = {
            host: 'localhost',
            port: 3002,
            path: '/health/live',
            timeout: 5000
        };
        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                process.exit(0);
            } else {
                process.exit(1);
            }
        });
        req.on('error', () => process.exit(1));
        req.on('timeout', () => process.exit(1));
        req.end();
    "

# 環境変数設定
ENV NODE_ENV=production
ENV PORT=3002
ENV STORAGE_TYPE=local
ENV STORAGE_LOCAL_BASE_PATH=/app/data

# アプリケーション起動
CMD ["node", "dist/index.js"]

# 開発ステージ
FROM dev-dependencies AS development

# 共有ライブラリコピー
COPY ../shared ../shared

# ソースコードコピー
COPY . .

# 開発用ポート公開
EXPOSE 3002

# 開発用起動コマンド
CMD ["npm", "run", "dev"]

# テストステージ
FROM development AS test

# テスト実行
RUN npm run test

# テストカバレッジ確認
RUN npm run test:coverage

# ビルド検証
RUN npm run build

# Linting実行
RUN npm run lint