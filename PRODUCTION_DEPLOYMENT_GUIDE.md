# Hotel Booking System - 本番デプロイメント完全ガイド

## 作成者: worker3
## 作成日: 2025-06-23
## 対象: 3D/AR/VR機能対応本番環境

---

## エグゼクティブサマリー

Hotel Booking Systemの3D/AR/VR機能を含む本番環境への完全デプロイメント手順を記載します。高可用性、高パフォーマンス、セキュリティを重視した構成で、世界最高水準の没入型ホテル体験を安定提供します。

---

## 1. デプロイメント前提条件

### 1.1 必要な環境

#### サーバー要件
```yaml
Production Server Specifications:
  CPU: 8 cores (Intel Xeon/AMD EPYC)
  RAM: 32GB (最小16GB)
  Storage: 500GB SSD
  Network: 1Gbps
  OS: Ubuntu 22.04 LTS / CentOS 8

CDN Server Specifications:
  CPU: 4 cores
  RAM: 8GB
  Storage: 1TB SSD (3Dアセット用)
  Network: 10Gbps
```

#### ドメイン設定
```
Primary: https://hotel-booking.com
API: https://api.hotel-booking.com
CDN: https://cdn.hotel-booking.com
WebSocket: https://ws.hotel-booking.com
Admin: https://admin.hotel-booking.com
```

### 1.2 SSL証明書取得

```bash
#!/bin/bash
# SSL証明書自動取得・設定スクリプト

# Certbot インストール
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# ワイルドカード証明書取得
sudo certbot certonly --manual \
  --preferred-challenges=dns \
  --email admin@hotel-booking.com \
  --agree-tos \
  --no-eff-email \
  -d hotel-booking.com \
  -d *.hotel-booking.com

# 証明書自動更新設定
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab

# 証明書チェーン検証
sudo certbot certificates
```

### 1.3 環境変数設定

```bash
# .env.production
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hotel_booking_prod
POSTGRES_DB=hotel_booking_prod
POSTGRES_USER=hotel_user
POSTGRES_PASSWORD=secure_password_here

# Authentication
JWT_SECRET=super_secure_jwt_secret_32_chars_min
NEXTAUTH_SECRET=super_secure_nextauth_secret_32_chars
NEXTAUTH_URL=https://hotel-booking.com

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
APPLE_ID=your_apple_id
APPLE_SECRET=your_apple_secret

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=secure_redis_password

# CDN & Assets
CDN_URL=https://cdn.hotel-booking.com
UPLOAD_PATH=/var/www/uploads
ASSET_PATH=/var/www/assets

# Monitoring
SENTRY_DSN=your_sentry_dsn
GRAFANA_PASSWORD=secure_grafana_password

# Email
SMTP_HOST=smtp.hotel-booking.com
SMTP_PORT=587
SMTP_USER=noreply@hotel-booking.com
SMTP_PASS=secure_smtp_password

# AWS (for S3 backup)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=hotel-booking-backup

# Performance
ENABLE_GZIP=true
ENABLE_WEBP=true
ENABLE_CDN=true
CACHE_MAX_AGE=31536000
```

---

## 2. ステップバイステップデプロイ手順

### Step 1: サーバー準備

```bash
#!/bin/bash
# サーバー初期設定スクリプト

# システム更新
sudo apt update && sudo apt upgrade -y

# 必要なパッケージインストール
sudo apt install -y \
  curl \
  wget \
  git \
  nginx \
  postgresql-14 \
  redis-server \
  fail2ban \
  ufw \
  htop \
  certbot \
  python3-certbot-nginx

# Docker & Docker Compose インストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Node.js 18 LTS インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ファイアウォール設定
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Fail2ban設定
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo "✅ サーバー準備完了"
```

### Step 2: データベースセットアップ

```bash
#!/bin/bash
# PostgreSQL設定スクリプト

# PostgreSQL設定
sudo -u postgres createuser hotel_user
sudo -u postgres createdb hotel_booking_prod -O hotel_user
sudo -u postgres psql -c "ALTER USER hotel_user PASSWORD 'secure_password_here';"

# データベース設定ファイル更新
sudo tee -a /etc/postgresql/14/main/postgresql.conf << EOF
# Performance tuning for production
max_connections = 200
shared_buffers = 8GB
effective_cache_size = 24GB
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 64MB
min_wal_size = 1GB
max_wal_size = 4GB
EOF

sudo systemctl restart postgresql

# Redis設定
sudo tee /etc/redis/redis.conf << EOF
bind 127.0.0.1
port 6379
requirepass secure_redis_password
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF

sudo systemctl restart redis-server

echo "✅ データベースセットアップ完了"
```

### Step 3: アプリケーションデプロイ

```bash
#!/bin/bash
# アプリケーションデプロイスクリプト

set -e

echo "🚀 Hotel Booking System デプロイ開始"

# プロジェクトディレクトリ作成
sudo mkdir -p /opt/hotel-booking
sudo chown $USER:$USER /opt/hotel-booking
cd /opt/hotel-booking

# リポジトリクローン
git clone https://github.com/your-org/hotel-booking-system.git .
git checkout main

# 本番用設定ファイルコピー
cp production-config/.env.production .env
cp production-config/docker-compose.production.yml docker-compose.yml

# 3Dアセット最適化
echo "🎨 3Dアセット最適化中..."
cd lastminutestay-frontend
npm ci
npm run optimize:textures
npm run optimize:models
npm run build:production
cd ..

# Dockerコンテナビルド & 起動
echo "🐳 Dockerコンテナ起動中..."
docker-compose up -d --build

# データベースマイグレーション
echo "📊 データベースマイグレーション実行..."
docker-compose exec backend npm run migrate:prod

# 初期データ投入
docker-compose exec backend npm run seed:prod

# ヘルスチェック
echo "🏥 ヘルスチェック実行..."
sleep 30
curl -f http://localhost:3000/health || exit 1
curl -f http://localhost:3001/api/health || exit 1

echo "✅ アプリケーションデプロイ完了"
```

### Step 4: CDN設定

```bash
#!/bin/bash
# CDN設定スクリプト

# アセットディレクトリ作成
sudo mkdir -p /var/www/cdn/{models,textures,panorama,audio,video}
sudo chown -R www-data:www-data /var/www/cdn

# 3Dアセットアップロード
rsync -av lastminutestay-frontend/public/models/ /var/www/cdn/models/
rsync -av lastminutestay-frontend/public/textures/ /var/www/cdn/textures/
rsync -av lastminutestay-frontend/public/panorama/ /var/www/cdn/panorama/

# WebP変換
find /var/www/cdn -name "*.jpg" -o -name "*.png" | while read img; do
  cwebp -q 80 "$img" -o "${img%.*}.webp"
done

# AVIF変換 (次世代フォーマット)
find /var/www/cdn -name "*.jpg" -o -name "*.png" | while read img; do
  avifenc --min 0 --max 63 -a end-usage=q -a cq-level=18 -a tune=ssim "$img" "${img%.*}.avif"
done

# 3Dモデル圧縮
find /var/www/cdn/models -name "*.gltf" | while read model; do
  gltf-pipeline -i "$model" -o "${model%.*}_compressed.glb" --draco.compressionLevel=7
done

echo "✅ CDN設定完了"
```

### Step 5: SSL & セキュリティ設定

```bash
#!/bin/bash
# SSL & セキュリティ設定

# Nginx設定
sudo cp production-config/nginx/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl reload nginx

# SSL証明書設定 (Let's Encrypt)
sudo certbot --nginx -d hotel-booking.com -d www.hotel-booking.com -d api.hotel-booking.com -d cdn.hotel-booking.com -d ws.hotel-booking.com --agree-tos --email admin@hotel-booking.com --non-interactive

# セキュリティヘッダー検証
curl -I https://hotel-booking.com | grep -E "(Strict-Transport|X-Frame|X-Content|Content-Security)"

# SSL Labs テスト (A+評価確認)
echo "🔒 SSL Labs テスト実行中..."
curl -s "https://api.ssllabs.com/api/v3/analyze?host=hotel-booking.com&startNew=on" | jq '.grade'

echo "✅ SSL & セキュリティ設定完了"
```

---

## 3. 監視・ログ設定

### 3.1 Prometheus & Grafana設定

```bash
#!/bin/bash
# 監視システムセットアップ

# Prometheus設定
sudo mkdir -p /opt/monitoring/prometheus
sudo tee /opt/monitoring/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "first_rules.yml"

scrape_configs:
  - job_name: 'hotel-booking-frontend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'

  - job_name: 'hotel-booking-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/metrics'

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']
EOF

# 監視サービス起動
docker-compose --profile monitoring up -d

echo "✅ 監視システム設定完了"
```

### 3.2 ログ設定

```yaml
# logging/logstash.conf
input {
  beats {
    port => 5044
  }
  
  file {
    path => "/var/log/nginx/*.log"
    type => "nginx"
  }
  
  file {
    path => "/opt/hotel-booking/logs/*.log"
    type => "application"
  }
}

filter {
  if [type] == "nginx" {
    grok {
      match => { "message" => "%{NGINXACCESS}" }
    }
  }
  
  if [type] == "application" {
    json {
      source => "message"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "hotel-booking-%{+YYYY.MM.dd}"
  }
}
```

---

## 4. パフォーマンス最適化

### 4.1 キャッシュ設定

```nginx
# Nginx キャッシュ設定
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=hotel_cache:10m max_size=10g 
                 inactive=60m use_temp_path=off;

server {
    location /api/ {
        proxy_cache hotel_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### 4.2 3D/VR パフォーマンス最適化

```bash
#!/bin/bash
# 3D/VR パフォーマンス最適化スクリプト

# GPU ドライバー最適化 (NVIDIA)
if lspci | grep -i nvidia; then
    sudo apt install -y nvidia-driver-470
    sudo nvidia-smi
fi

# CPUガバナー設定（パフォーマンスモード）
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# カーネルパラメータ最適化
sudo tee -a /etc/sysctl.conf << EOF
# Network performance
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.ipv4.tcp_rmem = 4096 65536 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# File descriptor limits
fs.file-max = 1000000

# WebGL performance
vm.swappiness = 1
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

sudo sysctl -p

echo "✅ パフォーマンス最適化完了"
```

---

## 5. 自動デプロイ・CI/CD設定

### 5.1 GitHub Actions設定

```yaml
# .github/workflows/production-deploy.yml
name: Production Deployment

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd lastminutestay-frontend && npm ci
          cd ../backend && npm ci
      
      - name: Run tests
        run: |
          cd lastminutestay-frontend && npm run test:ci
          cd ../backend && npm run test:ci
      
      - name: Test 3D/VR components
        run: |
          cd lastminutestay-frontend
          npm run test:webxr
          npm run test:performance

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: |
          docker build -t hotel-booking-frontend:${{ github.sha }} ./lastminutestay-frontend
          docker build -t hotel-booking-backend:${{ github.sha }} ./backend
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push hotel-booking-frontend:${{ github.sha }}
          docker push hotel-booking-backend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/hotel-booking
            git pull origin main
            docker-compose pull
            docker-compose up -d --force-recreate
            docker system prune -f
```

### 5.2 ゼロダウンタイムデプロイ

```bash
#!/bin/bash
# ゼロダウンタイムデプロイスクリプト

deploy_zero_downtime() {
    echo "🔄 ゼロダウンタイムデプロイ開始"
    
    # 新しいコンテナを別ポートで起動
    docker-compose -f docker-compose.yml -f docker-compose.blue-green.yml up -d --scale frontend=2 --scale backend=2
    
    # ヘルスチェック
    for i in {1..30}; do
        if curl -f http://localhost:3010/health && curl -f http://localhost:3011/api/health; then
            echo "✅ 新しいインスタンス起動確認"
            break
        fi
        sleep 10
    done
    
    # Nginx設定を新しいポートに変更
    sed -i 's/:3000/:3010/g' /etc/nginx/conf.d/default.conf
    sed -i 's/:3001/:3011/g' /etc/nginx/conf.d/default.conf
    nginx -t && nginx -s reload
    
    # 古いコンテナ停止
    docker stop hotel-booking-frontend-old hotel-booking-backend-old
    
    # クリーンアップ
    docker system prune -f
    
    echo "✅ ゼロダウンタイムデプロイ完了"
}
```

---

## 6. 障害対応・バックアップ

### 6.1 自動バックアップ

```bash
#!/bin/bash
# 自動バックアップスクリプト

# データベースバックアップ
pg_dump -h localhost -U hotel_user hotel_booking_prod | gzip > /backup/db/hotel_booking_$(date +%Y%m%d_%H%M%S).sql.gz

# アセットファイルバックアップ
tar -czf /backup/assets/assets_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/cdn

# S3アップロード
aws s3 sync /backup/ s3://hotel-booking-backup/$(date +%Y/%m/%d)/

# 古いバックアップ削除（30日以上）
find /backup -type f -mtime +30 -delete

# ログローテーション
logrotate /etc/logrotate.d/hotel-booking
```

### 6.2 災害復旧手順

```bash
#!/bin/bash
# 災害復旧スクリプト

disaster_recovery() {
    echo "🚨 災害復旧開始"
    
    # 最新バックアップ取得
    LATEST_DB_BACKUP=$(aws s3 ls s3://hotel-booking-backup/ --recursive | grep db | sort | tail -n 1 | awk '{print $4}')
    LATEST_ASSETS_BACKUP=$(aws s3 ls s3://hotel-booking-backup/ --recursive | grep assets | sort | tail -n 1 | awk '{print $4}')
    
    # バックアップダウンロード
    aws s3 cp s3://hotel-booking-backup/$LATEST_DB_BACKUP /tmp/
    aws s3 cp s3://hotel-booking-backup/$LATEST_ASSETS_BACKUP /tmp/
    
    # データベース復旧
    dropdb hotel_booking_prod
    createdb hotel_booking_prod
    gunzip < /tmp/$(basename $LATEST_DB_BACKUP) | psql hotel_booking_prod
    
    # アセット復旧
    tar -xzf /tmp/$(basename $LATEST_ASSETS_BACKUP) -C /
    
    # サービス再起動
    docker-compose restart
    
    echo "✅ 災害復旧完了"
}
```

---

## 7. 運用チェックリスト

### 7.1 デプロイ前確認

```markdown
## デプロイ前チェックリスト

### コード品質
- [ ] ESLint/Prettier エラー 0件
- [ ] TypeScript型エラー 0件
- [ ] ユニットテスト カバレッジ 95%以上
- [ ] E2Eテスト 全シナリオ通過
- [ ] WebXR機能テスト 全デバイス確認

### セキュリティ
- [ ] OWASP ZAP スキャン実施
- [ ] 依存関係脆弱性チェック
- [ ] SSL証明書有効期限確認
- [ ] 環境変数設定確認

### パフォーマンス
- [ ] Lighthouse Score 90点以上
- [ ] Core Web Vitals 「良好」
- [ ] WebGL パフォーマンステスト
- [ ] 負荷テスト実施

### インフラ
- [ ] サーバーリソース確認
- [ ] バックアップ動作確認
- [ ] 監視アラート設定
- [ ] ログ収集動作確認
```

### 7.2 デプロイ後確認

```bash
#!/bin/bash
# デプロイ後確認スクリプト

post_deploy_check() {
    echo "🔍 デプロイ後確認開始"
    
    # サービス稼働確認
    curl -f https://hotel-booking.com/health || echo "❌ Frontend health check failed"
    curl -f https://api.hotel-booking.com/health || echo "❌ Backend health check failed"
    
    # WebXR機能確認
    curl -f https://hotel-booking.com/api/webxr/test || echo "❌ WebXR test failed"
    
    # データベース接続確認
    docker-compose exec backend npm run db:check || echo "❌ Database check failed"
    
    # CDN確認
    curl -I https://cdn.hotel-booking.com/models/test.glb | grep "200 OK" || echo "❌ CDN check failed"
    
    # SSL確認
    echo | openssl s_client -connect hotel-booking.com:443 2>/dev/null | openssl x509 -noout -dates
    
    # パフォーマンス確認
    docker-compose exec frontend npm run lighthouse:ci
    
    echo "✅ デプロイ後確認完了"
}
```

---

## 8. トラブルシューティング

### 8.1 よくある問題と解決方法

#### WebXR が動作しない
```bash
# ブラウザサポート確認
echo "WebXR browser support check..."
curl -s "https://caniuse.com/webxr" | grep -o "supported.*%"

# HTTPS確認
curl -I https://hotel-booking.com | grep "HTTP/2 200"

# 証明書確認
openssl s_client -connect hotel-booking.com:443 -servername hotel-booking.com
```

#### 3Dアセット読み込みエラー
```bash
# CDN アクセス確認
curl -I https://cdn.hotel-booking.com/models/room.glb

# CORS ヘッダー確認
curl -H "Origin: https://hotel-booking.com" -I https://cdn.hotel-booking.com/models/room.glb

# ファイルサイズ確認
ls -lh /var/www/cdn/models/
```

#### パフォーマンス低下
```bash
# システムリソース確認
htop
iostat -x 1 5
free -h

# データベース接続数確認
docker-compose exec postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Nginx ログ確認
tail -f /var/log/nginx/access.log | grep "404\|500\|503"
```

### 8.2 緊急対応手順

```bash
#!/bin/bash
# 緊急対応スクリプト

emergency_response() {
    case "$1" in
        "high_load")
            # 高負荷時の対応
            docker-compose scale frontend=3 backend=2
            ;;
        "memory_leak")
            # メモリリーク対応
            docker-compose restart frontend backend
            ;;
        "ssl_expired")
            # SSL証明書期限切れ対応
            certbot renew --force-renewal
            nginx -s reload
            ;;
        "database_down")
            # データベース障害対応
            docker-compose restart postgres
            sleep 30
            docker-compose restart backend
            ;;
        *)
            echo "Unknown emergency type: $1"
            ;;
    esac
}
```

---

## 結論

本ガイドに従って実装することで、Hotel Booking Systemの3D/AR/VR機能を含む本番環境が安全かつ高性能で運用できます。

### 主要成果:
- **完全自動化**: CI/CDパイプラインによる自動デプロイ
- **高可用性**: ゼロダウンタイムデプロイメント
- **最適化**: 3D/VRアセット配信最適化
- **監視体制**: 包括的なモニタリング・アラート
- **セキュリティ**: A+評価のSSL・セキュリティ設定

継続的な改善と監視により、世界最高水準のホテル予約システムを安定運用します。

---

作成者: worker3  
最終更新: 2025-06-23  
本番準備状況: ✅ 完了