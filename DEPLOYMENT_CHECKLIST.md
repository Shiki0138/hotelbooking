# LastMinuteStay 本番デプロイチェックリスト

## 🔐 環境変数（生成済み）
- ✅ CRON_SECRET: `2zZ1P7+D4m0HrNiI1bo4LitJRjE1JhKQpsQVXubGN0A=`
- ✅ NEXTAUTH_SECRET: `Z7qteiRN+ZNHHnSVfG+x71McQOpBdsYbjaOPorvenes=`

## 📋 デプロイ手順

### 1. Vercelログイン
```bash
vercel login
```

### 2. プロジェクト初期化
```bash
vercel
```
- Project name: **lastminutestay**
- Directory: **./**

### 3. Supabase設定
1. https://app.supabase.io で新規プロジェクト作成
2. プロジェクト名: **lastminutestay-prod**
3. リージョン: **Tokyo (ap-northeast-1)**
4. SQLエディタで `supabase/schema.sql` の内容を実行

### 4. API Keys取得

#### Rakuten Travel API
1. https://webservice.rakuten.co.jp/
2. 新規アプリ作成
3. 楽天トラベル施設検索APIを有効化

#### Resend
1. https://resend.com/
2. API Keys → Create API Key
3. ドメイン設定（任意）

### 5. Vercel環境変数設定

https://vercel.com/[your-account]/lastminutestay/settings/environment-variables

以下をすべて設定:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY
- RAKUTEN_API_KEY
- RESEND_API_KEY
- NEXT_PUBLIC_APP_URL=https://lastminutestay.vercel.app
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- CRON_SECRET（上記の値）
- NEXTAUTH_URL=https://lastminutestay.vercel.app
- NEXTAUTH_SECRET（上記の値）

### 6. 本番デプロイ
```bash
vercel --prod
```

## ✅ 動作確認項目

### 基本機能
- [ ] トップページ表示
- [ ] ユーザー登録
- [ ] ログイン/ログアウト
- [ ] ホテル検索

### Phase 2機能
- [ ] リアルタイム更新（WebSocket接続）
- [ ] 希望条件登録
- [ ] メール通知テスト
- [ ] Cronジョブ実行確認

### テストページ
- [ ] https://lastminutestay.vercel.app/test-phase1.html
- [ ] https://lastminutestay.vercel.app/test-phase2.html

## 🔍 確認コマンド

### ログ確認
```bash
vercel logs
```

### Function実行状況
```bash
vercel functions ls
```

### 再デプロイ
```bash
vercel --prod --force
```

## 📊 完了報告フォーマット

```
デプロイ完了報告：
- URL: https://lastminutestay.vercel.app
- 状態: ✅ 正常稼働
- 基本機能: ✅ 全機能動作確認
- リアルタイム: ✅ WebSocket接続確認
- メール通知: ✅ テスト送信成功
- Cron: ✅ 設定完了
```