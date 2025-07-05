# 📝 Supabase手動設定手順

**重要**: 以下の手順を実行してデータベース構築を完了してください。

## 🔴 今すぐ実行する手順

### 1. Supabaseアカウント作成とプロジェクト作成

1. **[Supabase](https://supabase.com)にアクセス**
2. **「Start your project」をクリック**
3. **GitHubでサインイン**
4. **「New project」をクリック**
5. **以下を入力:**
   ```
   Organization: 個人アカウントを選択
   Project name: lastminutestay-prod
   Database Password: [強力なパスワードを生成してメモ]
   Region: Northeast Asia (Tokyo)
   Pricing Plan: Free tier (0-500MB)
   ```
6. **「Create new project」をクリック**

### 2. 認証情報の取得（プロジェクト作成完了後）

1. **Settings → API へ移動**
2. **以下の3つをコピー:**
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 3. データベーススキーマの適用

1. **SQL Editor → New query**
2. **`PRODUCTION_DATABASE_SCHEMA.sql`の内容をコピー**
3. **SQLエディタに貼り付け**
4. **「RUN」をクリック**

**エラーが出た場合:**
- `pg_cron`関連のエラー → その部分を削除して再実行
- その他のエラー → セクションごとに分割して実行

### 4. シードデータの適用

1. **SQL Editor → New query**
2. **`PRODUCTION_SEED_DATA.sql`の内容をコピー**
3. **SQLエディタに貼り付け**
4. **「RUN」をクリック**

### 5. 認証設定

1. **Authentication → URL Configuration**
2. **Site URL:** `https://lastminutestay.vercel.app`
3. **Redirect URLs に以下を追加:**
   ```
   https://lastminutestay.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   http://localhost:5173/auth/callback
   http://localhost:8080/auth/callback
   ```
4. **「Save」をクリック**

### 6. テストユーザーの作成

1. **Authentication → Users**
2. **「Invite user」をクリック**
3. **以下を入力:**
   ```
   Email: demo@lastminutestay.com
   Password: DemoUser123!
   ```
4. **「Send invitation」をクリック**

## 📋 取得した情報を記録

以下の形式で情報を保存してください：

```env
# Supabase Production Credentials
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[your-service-key]
DATABASE_PASSWORD=[your-database-password]
```

## ✅ 確認事項

- [ ] プロジェクト作成完了
- [ ] 認証情報3つ取得完了
- [ ] データベースパスワード保存完了
- [ ] スキーマ適用成功
- [ ] シードデータ適用成功
- [ ] 認証URL設定完了
- [ ] テストユーザー作成完了

## 🚨 トラブルシューティング

### プロジェクト作成できない
- 無料枠の制限（2プロジェクトまで）
- 既存プロジェクトを削除するか、別のメールアドレスを使用

### SQL実行エラー
- エラーメッセージをコピーして報告
- セクションごとに分割実行

### 認証エラー
- API キーが正しくコピーされているか確認
- プロジェクトがアクティブになるまで数分待つ

---

**完了したら、取得した認証情報を報告してください。**