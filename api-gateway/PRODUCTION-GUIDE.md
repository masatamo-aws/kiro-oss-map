# Kiro OSS Map API Gateway - 本番運用ガイド

## 🚀 本番デプロイメント手順

### 1. 事前準備

#### 必要なソフトウェア
- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl または wget

#### サーバー要件
- **最小構成**: 2 CPU, 4GB RAM, 20GB SSD
- **推奨構成**: 4 CPU, 8GB RAM, 50GB SSD
- **OS**: Ubuntu 20.04 LTS または CentOS 8+

### 2. 環境設定

#### SSL証明書の準備
```bash
# Let's Encryptを使用する場合
sudo apt install certbot
sudo certbot certonly --standalone -d api.kiro-map.com

# 証明書をコピー
sudo cp /etc/letsencrypt/live/api.kiro-map.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/api.kiro-map.com/privkey.pem ./ssl/
sudo chown $USER:$USER ./ssl/*
```

#### 環境変数の設定
```bash
# .env.productionファイルを編集
cp .env.production .env.production.backup
nano .env.production

# 必須変更項目:
# - JWT_SECRET (32文字以上のランダム文字列)
# - DB_PASSWORD (強力なパスワード)
# - REDIS_PASSWORD (強力なパスワード)
# - CORS_ORIGINS (実際のドメイン)
```

### 3. デプロイメント実行

#### 基本デプロイメント
```bash
# リポジトリクローン
git clone https://github.com/kiro-oss/map.git
cd map/api-gateway

# デプロイメント実行
chmod +x deploy.sh
./deploy.sh production

# 監視付きデプロイメント
./deploy.sh production --with-monitoring
```

#### Windows環境
```powershell
# PowerShellでデプロイメント
.\deploy.ps1 -Environment production -WithMonitoring
```

### 4. 動作確認

#### ヘルスチェック
```bash
# 基本ヘルスチェック
curl http://localhost:3000/health

# 詳細ヘルスチェック
curl http://localhost:3000/health/detailed

# API動作確認
curl -H "X-API-Key: test-api-key-12345" http://localhost:3000/api/v2/maps/styles
```

## 📊 監視・運用

### 1. ログ監視

#### ログファイルの場所
- API Gateway: `./logs/combined.log`, `./logs/error.log`
- Nginx: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- PostgreSQL: Docker logs
- Redis: Docker logs

#### ログ確認コマンド
```bash
# API Gatewayログ
docker-compose logs -f api-gateway

# 全サービスログ
docker-compose logs -f

# エラーログのみ
docker-compose logs -f api-gateway | grep ERROR
```

### 2. メトリクス監視

#### Grafanaダッシュボード
- URL: `http://localhost:3001`
- ユーザー: `admin`
- パスワード: `.env.production`で設定

#### 主要メトリクス
- **レスポンス時間**: 95%ile < 1秒
- **エラー率**: < 1%
- **CPU使用率**: < 80%
- **メモリ使用率**: < 90%
- **ディスク使用率**: < 85%

### 3. アラート設定

#### 重要なアラート
- API Gateway停止
- データベース接続エラー
- Redis接続エラー
- 高エラー率 (> 5%)
- 高レスポンス時間 (> 2秒)

## 🔧 メンテナンス

### 1. 定期メンテナンス

#### 日次タスク
```bash
# ログローテーション確認
ls -la ./logs/

# ディスク使用量確認
df -h

# サービス状態確認
docker-compose ps
```

#### 週次タスク
```bash
# Docker イメージクリーンアップ
docker system prune -f

# ログファイルアーカイブ
tar -czf logs-$(date +%Y%m%d).tar.gz ./logs/*.log

# バックアップ確認
./scripts/backup-check.sh
```

#### 月次タスク
```bash
# セキュリティアップデート
sudo apt update && sudo apt upgrade -y

# SSL証明書更新確認
sudo certbot renew --dry-run

# パフォーマンスレポート生成
./scripts/performance-report.sh
```

### 2. バックアップ・復旧

#### データベースバックアップ
```bash
# バックアップ作成
docker-compose exec postgres pg_dump -U kiro_user kiro_map_prod > backup-$(date +%Y%m%d).sql

# バックアップ復元
docker-compose exec -T postgres psql -U kiro_user kiro_map_prod < backup-20250817.sql
```

#### 設定ファイルバックアップ
```bash
# 設定ファイルバックアップ
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  .env.production \
  docker-compose.prod.yml \
  nginx.prod.conf \
  ssl/
```

## 🚨 トラブルシューティング

### 1. 一般的な問題

#### API Gatewayが起動しない
```bash
# ログ確認
docker-compose logs api-gateway

# 設定確認
docker-compose config

# 環境変数確認
docker-compose exec api-gateway env | grep -E "(JWT|DB|REDIS)"
```

#### データベース接続エラー
```bash
# PostgreSQL状態確認
docker-compose exec postgres pg_isready -U kiro_user

# 接続テスト
docker-compose exec postgres psql -U kiro_user -d kiro_map_prod -c "SELECT 1;"

# ログ確認
docker-compose logs postgres
```

#### Redis接続エラー
```bash
# Redis状態確認
docker-compose exec redis redis-cli ping

# 認証テスト
docker-compose exec redis redis-cli -a "your_password" ping

# メモリ使用量確認
docker-compose exec redis redis-cli info memory
```

### 2. パフォーマンス問題

#### 高レスポンス時間
```bash
# プロセス確認
docker stats

# データベースクエリ分析
docker-compose exec postgres psql -U kiro_user -d kiro_map_prod -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Redis性能確認
docker-compose exec redis redis-cli --latency-history
```

#### メモリ不足
```bash
# メモリ使用量確認
free -h
docker stats --no-stream

# ログファイルサイズ確認
du -sh ./logs/

# 不要なDockerオブジェクト削除
docker system prune -a
```

## 🔒 セキュリティ

### 1. セキュリティチェックリスト

- [ ] SSL証明書が有効
- [ ] デフォルトパスワードを変更
- [ ] ファイアウォール設定
- [ ] 不要なポートを閉鎖
- [ ] ログ監視設定
- [ ] 定期的なセキュリティアップデート

### 2. セキュリティ監視

#### 不審なアクセス検知
```bash
# 高頻度アクセスIP確認
docker-compose logs nginx | grep -E "GET|POST" | \
  awk '{print $1}' | sort | uniq -c | sort -nr | head -10

# エラー率の高いIP確認
docker-compose logs nginx | grep " 4[0-9][0-9] \| 5[0-9][0-9] " | \
  awk '{print $1}' | sort | uniq -c | sort -nr | head -10
```

## 📞 サポート

### 緊急時連絡先
- **技術サポート**: support@kiro-map.com
- **セキュリティ**: security@kiro-map.com
- **GitHub Issues**: https://github.com/kiro-oss/map/issues

### 有用なリンク
- **API ドキュメント**: https://docs.kiro-map.com/api/v2
- **監視ダッシュボード**: https://monitoring.kiro-map.com
- **ステータスページ**: https://status.kiro-map.com

---

**最終更新**: 2025年8月17日  
**バージョン**: 2.0.0  
**作成者**: Kiro Development Team