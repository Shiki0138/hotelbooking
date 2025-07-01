# Vercel環境変数設定値

## 生成済みシークレット

```
CRON_SECRET=2zZ1P7+D4m0HrNiI1bo4LitJRjE1JhKQpsQVXubGN0A=
NEXTAUTH_SECRET=Z7qteiRN+ZNHHnSVfG+x71McQOpBdsYbjaOPorvenes=
```

## 必要な環境変数リスト

以下をVercelダッシュボードで設定してください：

### Supabase関連（Supabaseダッシュボードから取得）
```
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_ANON_KEY=[Settings > API > anon public key]
SUPABASE_SERVICE_KEY=[Settings > API > service_role key]
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Settings > API > anon public key]
```

### API Keys
```
RAKUTEN_API_KEY=[楽天Developersから取得]
RESEND_API_KEY=[Resendダッシュボードから取得]
```

### アプリケーション設定
```
NEXT_PUBLIC_APP_URL=https://lastminutestay.vercel.app
NEXTAUTH_URL=https://lastminutestay.vercel.app
```

### セキュリティ（上記生成値を使用）
```
CRON_SECRET=2zZ1P7+D4m0HrNiI1bo4LitJRjE1JhKQpsQVXubGN0A=
NEXTAUTH_SECRET=Z7qteiRN+ZNHHnSVfG+x71McQOpBdsYbjaOPorvenes=
```

## 設定手順

1. Vercelダッシュボード → Settings → Environment Variables
2. 各変数を追加（Production、Preview、Developmentすべてにチェック）
3. Save

## 重要な注意事項

- CRON_SECRETは外部に漏れないよう注意
- SUPABASE_SERVICE_KEYは管理者権限を持つため厳重に管理
- 本番環境のみで使用する値は、Productionのみチェック