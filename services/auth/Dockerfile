# Kiro OSS Map v2.1.0 - 認証サービス Dockerfile
# マルチステージビルド・最適化・セキュリティ強化

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS dependencies

# セキュリティ: 非rootユーザー作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S kiro -u 1001

# 作業ディレクトリ設定
WORKDIR /app

# パッケージファイルコピー
COPY package*.json ./
COPY ../shared/package*.json ../shared/ || true

# 依存関係インストール（本番用のみ）
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# ソースコードコピー
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY ../shared/ ../shared/

# 開発依存関係インストール
RUN npm ci

# TypeScriptビルド
RUN npm run build

# ============================================================================
# Stage 3: Production
# ============================================================================
FROM node:20-alpine AS production

# セキュリティ強化
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S kiro -u 1001

# 作業ディレクトリ設定
WORKDIR /app

# 本番依存関係コピー
COPY --from=dependencies --chown=kiro:nodejs /app/node_modules ./node_modules

# ビルド成果物コピー
COPY --from=builder --chown=kiro:nodejs /app/dist ./dist
COPY --from=builder --chown=kiro:nodejs /app/package.json ./

# 共有ライブラリコピー
COPY --from=builder --chown=kiro:nodejs /app/../shared ./shared

# ヘルスチェックスクリプト作成
RUN echo '#!/bin/sh\ncurl -f http://localhost:3001/health || exit 1' > /usr/local/bin/healthcheck && \
    chmod +x /usr/local/bin/healthcheck

# 非rootユーザーに切り替え
USER kiro

# ポート公開
EXPOSE 3001

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck

# 環境変数設定
ENV NODE_ENV=production
ENV PORT=3001

# アプリケーション起動
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# ============================================================================
# Metadata
# ============================================================================
LABEL maintainer="Kiro AI Assistant"
LABEL version="2.1.0"
LABEL description="Kiro OSS Map Authentication Service"
LABEL org.opencontainers.image.title="kiro-auth-service"
LABEL org.opencontainers.image.description="Authentication microservice for Kiro OSS Map"
LABEL org.opencontainers.image.version="2.1.0"
LABEL org.opencontainers.image.vendor="Kiro OSS Map"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/masatamo-aws/kiro-oss-map"