# 🚨 緊急404エラー修正手順

## 問題状況
- URL: https://hotelbookingsystem-seven.vercel.app/
- エラー: 404 NOT_FOUND
- 原因: index.htmlファイルが不足

## 🔧 即座に実行すべき修正手順

### 1. index.htmlファイルの確認
```bash
# プロジェクトルートにindex.htmlがあることを確認
ls -la index.html
```

### 2. Vercelに再ログイン
```bash
vercel login
```
メールアドレスを入力し、認証メールから確認

### 3. 緊急再デプロイ
```bash
# プロジェクト再初期化（必要に応じて）
vercel

# 本番環境に強制デプロイ
vercel --prod --yes
```

### 4. 設定ファイルの確認

#### vercel.json
```json
{
  "version": 2,
  "buildCommand": "echo 'No build needed'",
  "outputDirectory": ".",
  "framework": null,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

## 📁 必要なファイル構成

```
プロジェクトルート/
├── index.html              ✅ メインページ（必須）
├── test-phase1.html         ✅ Phase1テストページ
├── test-phase2.html         ✅ Phase2テストページ
├── vercel.json             ✅ Vercel設定
├── api/                    ✅ APIディレクトリ
│   ├── health.js           ✅ ヘルスチェック
│   ├── auth/               ✅ 認証API
│   ├── search/             ✅ 検索API
│   └── ...                 ✅ その他API
└── package.json            ✅ 依存関係
```

## 🎯 修正後の確認項目

### URL動作確認
- ✅ https://hotelbookingsystem-seven.vercel.app/ → メインページ表示
- ✅ https://hotelbookingsystem-seven.vercel.app/test-phase1.html → Phase1テスト
- ✅ https://hotelbookingsystem-seven.vercel.app/test-phase2.html → Phase2テスト
- ✅ https://hotelbookingsystem-seven.vercel.app/api/health → APIヘルスチェック

### API動作確認
```bash
# ヘルスチェック
curl https://hotelbookingsystem-seven.vercel.app/api/health

# ホテル検索
curl "https://hotelbookingsystem-seven.vercel.app/api/search/rakuten?prefecture=東京都"
```

## 🔥 緊急代替案

index.htmlが作成できない場合の代替案：

### 代替案1: 既存HTMLファイルの利用
```bash
# test-phase1.htmlをindex.htmlとしてコピー
cp test-phase1.html index.html
```

### 代替案2: 最小限のindex.html作成
```bash
cat > index.html << 'EOF'
<!DOCTYPE html>
<html><head><title>LastMinuteStay</title></head>
<body>
<h1>LastMinuteStay - 高級ホテル直前予約システム</h1>
<p>システム稼働中</p>
<a href="/test-phase1.html">Phase1テスト</a>
<a href="/test-phase2.html">Phase2テスト</a>
<a href="/api/health">API確認</a>
</body></html>
EOF
```

## ⚡ 最速修正コマンド

```bash
# 1. index.html作成（最小版）
echo '<!DOCTYPE html><html><head><title>LastMinuteStay</title></head><body><h1>LastMinuteStay</h1><p>稼働中</p><a href="/test-phase1.html">Phase1</a> <a href="/test-phase2.html">Phase2</a> <a href="/api/health">API</a></body></html>' > index.html

# 2. 再デプロイ
vercel login  # 認証が必要な場合
vercel --prod --yes
```

## 📊 修正完了確認

修正完了後、以下を確認：
1. https://hotelbookingsystem-seven.vercel.app/ にアクセス
2. 404エラーが解消されていること
3. APIエンドポイントが正常動作すること
4. テストページにアクセス可能なこと

この手順で404エラーを緊急修正できます。