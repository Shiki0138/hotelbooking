# 本番稼働プラン

## 必要な作業

### Worker1: 環境変数設定
1. Vercelダッシュボードで環境変数を設定
   - SUPABASE_URL（Supabaseプロジェクト作成）
   - SUPABASE_ANON_KEY（Supabaseから取得）
   - SUPABASE_SERVICE_ROLE_KEY（Supabaseから取得）
   - SENDGRID_API_KEY（SendGrid無料アカウント作成）
   - REACT_APP_GOOGLE_MAPS_API_KEY（Google Cloud Console）
   - JWT_SECRET（ランダム文字列生成）

### Worker2: データベース設定
1. Supabaseプロジェクトの作成
   - 無料プランで十分
   - schema.sqlを実行してテーブル作成
   - RLSポリシーの設定

### Worker3: API接続確認
1. 楽天トラベルAPIの動作確認
2. Google Maps APIの有効化
3. SendGridメール送信テスト
4. フロントエンドとバックエンドの疎通確認

## 必要なサービス（すべて無料枠で利用可能）
- **Supabase**: PostgreSQLデータベース（500MB無料）
- **SendGrid**: メール送信（100通/日無料）
- **Google Maps API**: 地図表示（月$200クレジット）
- **楽天トラベルAPI**: ホテル情報（無料）

## ゴール
実際に動作するホテル検索・通知システムを稼働させる