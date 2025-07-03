# 🆘 緊急フロントエンド代替計画

## 🚨 Worker2遅延時の緊急対応

### 最小限UI実装（Boss1緊急対応）

#### 1. 緊急ログインフォーム（15分実装）
```html
<!DOCTYPE html>
<html>
<head>
    <title>LastMinuteStay - Emergency Login</title>
    <style>
        .form-container { max-width: 400px; margin: 50px auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        input { width: 100%; padding: 10px; margin: 5px 0; }
        button { background: #007bff; color: white; padding: 12px 20px; border: none; width: 100%; }
    </style>
</head>
<body>
    <div class="form-container">
        <h2>緊急ログイン</h2>
        <form id="loginForm">
            <div class="form-group">
                <input type="email" id="email" placeholder="メールアドレス" required>
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="パスワード" required>
            </div>
            <button type="submit">ログイン</button>
        </form>
        
        <hr>
        
        <h2>新規登録</h2>
        <form id="registerForm">
            <div class="form-group">
                <input type="email" id="regEmail" placeholder="メールアドレス" required>
            </div>
            <div class="form-group">
                <input type="password" id="regPassword" placeholder="パスワード" required>
            </div>
            <button type="submit">登録</button>
        </form>
    </div>

    <script>
        const API_BASE = '/api';
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    window.location.href = '/booking.html';
                } else {
                    alert('ログイン失敗: ' + data.error);
                }
            } catch (error) {
                alert('エラー: ' + error.message);
            }
        });
        
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            
            try {
                const response = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                if (data.user) {
                    alert('登録成功！ログインしてください。');
                } else {
                    alert('登録失敗: ' + data.error);
                }
            } catch (error) {
                alert('エラー: ' + error.message);
            }
        });
    </script>
</body>
</html>
```

#### 2. 緊急予約フォーム（20分実装）
```html
<!DOCTYPE html>
<html>
<head>
    <title>LastMinuteStay - Emergency Booking</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        .container { max-width: 600px; margin: 20px auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        input, select { width: 100%; padding: 10px; margin: 5px 0; }
        .payment-section { border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
        button { background: #007bff; color: white; padding: 12px 20px; border: none; width: 100%; }
    </style>
</head>
<body>
    <div class="container">
        <h2>緊急予約フォーム</h2>
        <form id="bookingForm">
            <div class="form-group">
                <label>ホテル名</label>
                <input type="text" id="hotelName" value="テストホテル東京" readonly>
            </div>
            
            <div class="form-group">
                <label>チェックイン</label>
                <input type="date" id="checkin" required>
            </div>
            
            <div class="form-group">
                <label>チェックアウト</label>
                <input type="date" id="checkout" required>
            </div>
            
            <div class="form-group">
                <label>ゲスト数</label>
                <select id="guests">
                    <option value="1">1名</option>
                    <option value="2">2名</option>
                    <option value="3">3名</option>
                    <option value="4">4名</option>
                </select>
            </div>
            
            <div class="payment-section">
                <h3>決済情報</h3>
                <div id="card-element"></div>
                <div id="card-errors" role="alert"></div>
            </div>
            
            <button type="submit" id="submit-button">予約確定・決済</button>
        </form>
    </div>

    <script>
        const stripe = Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        const elements = stripe.elements();
        const cardElement = elements.create('card');
        cardElement.mount('#card-element');
        
        document.getElementById('bookingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = localStorage.getItem('token');
            if (!token) {
                alert('ログインが必要です');
                window.location.href = '/login.html';
                return;
            }
            
            const bookingData = {
                hotel_id: 'test-hotel-001',
                check_in: document.getElementById('checkin').value,
                check_out: document.getElementById('checkout').value,
                guests: parseInt(document.getElementById('guests').value),
                total_amount: 25000
            };
            
            try {
                // 予約作成
                const bookingResponse = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bookingData)
                });
                
                const booking = await bookingResponse.json();
                
                // Stripe決済
                const { error, paymentMethod } = await stripe.createPaymentMethod({
                    type: 'card',
                    card: cardElement,
                });
                
                if (!error) {
                    const paymentResponse = await fetch('/api/payment/process', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            booking_id: booking.id,
                            payment_method_id: paymentMethod.id,
                            amount: bookingData.total_amount
                        })
                    });
                    
                    const paymentResult = await paymentResponse.json();
                    if (paymentResult.success) {
                        alert('予約・決済完了！確認メールを送信しました。');
                    } else {
                        alert('決済エラー: ' + paymentResult.error);
                    }
                } else {
                    alert('決済情報エラー: ' + error.message);
                }
            } catch (error) {
                alert('予約エラー: ' + error.message);
            }
        });
    </script>
</body>
</html>
```

## ⚡ 実装タイムライン（緊急時）

### 0-15分: ログインフォーム作成
### 15-35分: 予約フォーム作成  
### 35-45分: 統合テスト開始

## 🎯 最小限機能確保
- ユーザー認証（登録・ログイン）
- 基本予約作成
- Stripe決済処理
- 結果表示

この緊急UI により、Worker2遅延時でも統合テスト実行可能。