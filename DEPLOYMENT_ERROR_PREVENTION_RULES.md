# 🛡️ Vercel/Supabaseデプロイエラー回避開発ルール

## 🚨 必須遵守事項（全開発者）

### 1. 環境変数の設定と管理
#### Vercelで必須の環境変数
```bash
# Supabase IPv6移行対応 (2024年1月29日以降必須)
POSTGRES_URL=<Supavisor URL>
POSTGRES_PRISMA_URL=<Supavisor URL>
POSTGRES_URL_NON_POOLING=<Supavisor URL>

# Supabase認証
SUPABASE_SERVICE_ROLE_KEY=<サービスロールキー>
SUPABASE_ANON_KEY=<匿名キー>
SUPABASE_URL=<プロジェクトURL>

# Next.js公開環境変数
NEXT_PUBLIC_SUPABASE_ANON_KEY=<公開匿名キー>
NEXT_PUBLIC_SUPABASE_URL=<公開URL>
```

⚠️ **重要**: SupabaseのIPv6移行により、Vercelでは必ずSupavisor URLを使用すること

### 2. CORS設定
#### Supabaseダッシュボードでの設定
- 許可ドメイン: `*.vercel.app`, `本番ドメイン`
- 認証リダイレクトURI: 全てのVercelドメインを追加

### 3. デプロイ前チェックリスト
- [ ] ローカルでビルド成功確認 (`npm run build`)
- [ ] 環境変数の設定確認
- [ ] CORS設定の確認
- [ ] Supabase RLSポリシーの確認
- [ ] バージョン依存関係の確認

### 4. エラー別対処法

| エラー種別 | 原因 | 対処法 |
|-----------|------|--------|
| データベース接続エラー | IPv6非対応 | Supavisor URLを使用 |
| CORS エラー | ドメイン未許可 | Supabaseで許可リストに追加 |
| 認証エラー | 環境変数未設定 | Vercelで環境変数を設定 |
| ビルドエラー | バージョン不一致 | package.jsonでバージョン固定 |
| 500エラー | RLSポリシー | Supabaseでポリシー確認 |

### 5. 開発フロー
1. **開発環境でテスト**
   ```bash
   npm run dev
   npm run build
   npm test
   ```

2. **Vercelプレビューでテスト**
   - PRを作成してプレビューURLで確認
   - エラーログを確認

3. **本番デプロイ**
   - 全てのチェックをパス後にマージ
   - デプロイ後の動作確認

## 📚 参考資料
- [Supabase Vercel統合ガイド](https://supabase.com/docs/guides/hosting/vercel)
- [Supabase IPv6移行ブログ](https://supabase.com/blog/supabase-ipv6-migration)
- [Vercelトラブルシューティング](https://vercel.com/docs/deployments/troubleshoot-a-build)

## ⚡ Worker専用注意事項
- Worker1: 認証APIではservice_role_keyを使用
- Worker2: 公開環境変数にはNEXT_PUBLIC_プレフィックス必須
- Worker3: データベース接続は必ずSupavisor URL使用

## 🔴 絶対に避けるべきこと
1. 環境変数をコードにハードコード
2. CORS設定なしでAPIコール
3. IPv4アドレスでのDB接続
4. デプロイ前のテスト省略
5. エラーログの無視

---
最終更新: 2025年7月2日
このルールは全開発者が必ず遵守すること