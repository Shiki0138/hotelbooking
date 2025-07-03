# Worker タスク分担表

## Worker1: 認証・セキュリティ担当
1. Supabase Auth実装
   - `/api/auth/register.js` - ユーザー登録
   - `/api/auth/login.js` - ログイン
   - `/api/auth/logout.js` - ログアウト
   - `/components/AuthModal.jsx` - 認証UI
   - セッション管理・CSRF対策

## Worker2: 予約・決済担当
1. 予約システム実装
   - `/api/booking/create.js` - 予約作成
   - `/api/booking/confirm.js` - 予約確認
   - `/api/payment/stripe.js` - Stripe決済
   - `/components/BookingForm.jsx` - 予約フォーム
   - メール通知連携

## Worker3: データベース・法的要件担当
1. Supabaseデータベース構築
   - テーブル作成（users, bookings, hotels）
   - リアルタイム同期設定
2. 法的ページ作成
   - `/pages/terms.html` - 利用規約
   - `/pages/privacy.html` - プライバシーポリシー
   - `/pages/legal.html` - 特定商取引法
   - Cookieバナー実装