# 🚨 デモモード緊急対策計画書

## ⚡ 遅延・技術課題対策マニュアル

### 🔍 Worker1遅延・課題対策

#### 楽天API関連問題
**問題1: API Key・認証エラー**
```javascript
// 緊急対策: モックAPI実装
const MOCK_HOTEL_DATA = {
  hotels: [
    {
      hotelNo: "mock001",
      hotelName: "デモホテル東京",
      planInfos: [{ planName: "スタンダード", charge: 12000 }]
    }
  ]
};

// フォールバック機能
const getHotelData = async (params) => {
  try {
    return await callRakutenAPI(params);
  } catch (error) {
    console.warn('Falling back to mock data');
    return MOCK_HOTEL_DATA;
  }
};
```

**問題2: CORS設定問題**
```javascript
// 緊急対策: プロキシ実装
app.get('/api/hotels/proxy', async (req, res) => {
  try {
    const response = await fetch(rakutenURL, {
      headers: { 'User-Agent': 'LastMinuteStay-Demo' }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json(MOCK_HOTEL_DATA);
  }
});
```

**問題3: レスポンス遅延**
```javascript
// 緊急対策: キャッシュ強化
const hotelCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

const getCachedHotels = (key) => {
  const cached = hotelCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};
```

### 👤 Worker2遅延・課題対策

#### 認証システム問題
**問題1: Supabase Auth設定エラー**
```javascript
// 緊急対策: 簡易JWT認証
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// 簡易ユーザー登録
app.post('/api/auth/simple-register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // メモリまたは簡易DB保存
  const user = { id: Date.now(), email, password: hashedPassword };
  users.set(email, user);
  
  res.json({ user: { id: user.id, email: user.email } });
});

// 簡易ログイン
app.post('/api/auth/simple-login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.get(email);
  
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

**問題2: フロントエンド認証状態管理**
```javascript
// 緊急対策: 簡易状態管理
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const login = async (credentials) => {
    try {
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();
      
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        return true;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, login, token }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 🗄️ Worker3遅延・課題対策

#### データベース問題
**問題1: Supabase接続エラー**
```javascript
// 緊急対策: インメモリDB
class MemoryDB {
  constructor() {
    this.users = new Map();
    this.watchlists = new Map();
    this.alerts = new Map();
  }
  
  // ユーザー管理
  createUser(userData) {
    const id = Date.now().toString();
    const user = { ...userData, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }
  
  // ウォッチリスト管理
  addToWatchlist(userId, hotelData) {
    const id = Date.now().toString();
    const item = { ...hotelData, id, userId, createdAt: new Date() };
    this.watchlists.set(id, item);
    return item;
  }
  
  getUserWatchlist(userId) {
    return Array.from(this.watchlists.values())
      .filter(item => item.userId === userId);
  }
}

const memoryDB = new MemoryDB();
```

**問題2: メール送信問題**
```javascript
// 緊急対策: ログベース通知
const notifications = [];

const sendAlert = async (userId, alertData) => {
  try {
    // Resend送信試行
    await resend.emails.send({
      from: 'demo@lastminutestay.com',
      to: alertData.email,
      subject: 'ホテル価格アラート',
      html: `<p>価格が下がりました: ${alertData.hotelName}</p>`
    });
  } catch (error) {
    // フォールバック: ログ保存
    notifications.push({
      userId,
      type: 'price_alert',
      data: alertData,
      timestamp: new Date(),
      status: 'pending'
    });
    console.log('Alert queued for later delivery:', alertData);
  }
};

// 通知履歴API
app.get('/api/notifications/:userId', (req, res) => {
  const userNotifications = notifications.filter(n => n.userId === req.params.userId);
  res.json(userNotifications);
});
```

## 🔄 統合テスト緊急対策

### 第1統合テスト失敗時
**シナリオA: API統合失敗**
- モックデータでUI確認
- 検索→表示フローのみ確認
- 実API統合は第2テストで実施

**シナリオB: 認証統合失敗**
- 簡易認証で基本フロー確認
- セッション管理確認
- Supabase統合は第2テストで実施

**シナリオC: 全体統合失敗**
- 個別機能確認のみ実施
- 問題特定と修正計画策定
- 第2テストまでに統合完成

### 機能優先度（緊急時削減対象）

#### 高優先度（必須）
- 基本検索機能
- ユーザー登録・ログイン
- 検索結果表示

#### 中優先度（可能なら実装）
- 詳細フィルター
- ウォッチリスト機能
- 基本アラート

#### 低優先度（削減可能）
- 高度なソート機能
- 複雑なアラート設定
- 詳細なユーザー設定

## 📞 緊急エスカレーション

### Boss1介入基準
- 複数Worker同時遅延
- 技術的解決困難
- 統合テスト失敗

### 緊急対応手順
1. 即座に問題Worker支援
2. 機能優先度再調整
3. 代替実装実行
4. 統合テスト延期判断

---
**あらゆる遅延・課題に対する対策準備完了**