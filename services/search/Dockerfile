# Kiro OSS Map - Search Service Dockerfile v2.2.0
FROM node:20-alpine

# 作業ディレクトリ設定
WORKDIR /app

# パッケージファイルコピー
COPY package*.json ./
COPY tsconfig.json ./

# 依存関係インストール
RUN npm ci --only=production

# ソースコードコピー
COPY src/ ./src/
COPY tests/ ./tests/

# TypeScriptビルド
RUN npm run build

# ポート公開
EXPOSE 3003

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# 非rootユーザー作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S kiro -u 1001
USER kiro

# アプリケーション起動
CMD ["npm", "start"]
