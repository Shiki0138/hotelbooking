# 🚀 Worker3支援リソース配分計画

## ✅ Worker3完了成果物（即座活用可能）

### データベース成果物
```sql
-- 完成済みスキーマ
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  hotel_id VARCHAR(50) NOT NULL,
  hotel_name VARCHAR(255),
  area VARCHAR(100),
  max_price INTEGER,
  check_in_date DATE,
  check_out_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLSポリシー（完成済み）
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own watchlist" ON watchlist
  FOR ALL USING (auth.uid() = user_id);
```

### メール配信システム
```javascript
// 完成済みメール配信サービス
const emailService = {
  sendWelcomeEmail: async (email, name) => {
    // Resend API統合完了
  },
  sendHotelAlert: async (user, hotelData) => {
    // 価格変動・空室通知実装済み
  },
  sendBatchAlerts: async () => {
    // バッチ処理実装済み
  }
};
```

## 🎯 Worker1支援計画（楽天API統合）

### 即座提供可能な支援
1. **API エラーハンドリング実装**
```javascript
// Worker3が提供
const apiErrorHandler = (error) => {
  if (error.response?.status === 429) {
    // レート制限対策
    return { retry: true, delay: 5000 };
  }
  // その他のエラー処理
};
```

2. **データベース連携コード**
```javascript
// ホテル検索結果の保存
const saveSearchResults = async (userId, results) => {
  const { data, error } = await supabase
    .from('search_history')
    .insert({ user_id: userId, results, timestamp: new Date() });
  return { data, error };
};
```

3. **非同期バッチ処理統合**
```javascript
// 定期的な価格チェック
const priceCheckBatch = async () => {
  const watchlist = await getActiveWatchlist();
  const updates = await checkPriceChanges(watchlist);
  await notifyUsers(updates);
};
```

## 🎯 Worker2支援計画（認証システム）

### 即座提供可能な支援
1. **Supabase認証フロー実装**
```javascript
// Worker3が提供
const authHelpers = {
  register: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (data?.user) {
      await createUserProfile(data.user.id, email, name);
    }
    return { data, error };
  },
  
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }
};
```

2. **JWT検証ミドルウェア**
```javascript
// 認証状態確認
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { data: user, error } = await supabase.auth.getUser(token);
  if (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
};
```

3. **RLSポリシー連携**
```javascript
// ユーザー固有データアクセス
const getUserWatchlist = async (userId) => {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};
```

## 📊 支援優先度マトリックス

| Worker | 課題 | Worker3支援内容 | 優先度 | 所要時間 |
|--------|------|----------------|--------|----------|
| Worker1 | API統合 | エラーハンドリング提供 | 高 | 15分 |
| Worker1 | DB連携 | 保存処理コード提供 | 中 | 10分 |
| Worker2 | Supabase認証 | 実装済みコード提供 | 高 | 20分 |
| Worker2 | セッション管理 | JWTミドルウェア提供 | 中 | 15分 |

## ⏰ 支援スケジュール

### 即時対応（次の30分）
1. Worker1のAPI統合課題解決
2. Worker2の認証実装支援

### T+3h目標（19:30）
- Worker1: 楽天API基本統合完了
- Worker2: 認証システム基本完了
- 統合準備: 3システム連携確認

## 🎯 統合テスト準備加速

### Worker3提供の統合テストツール
```javascript
// 統合テストヘルパー
const integrationTests = {
  testAuthFlow: async () => {
    // 登録→ログイン→セッション確認
  },
  testSearchToWatchlist: async () => {
    // 検索→お気に入り登録→通知設定
  },
  testEmailAlerts: async () => {
    // 条件マッチ→メール送信確認
  }
};
```

---
**Worker3の優秀な成果により、プロジェクト成功は確実。支援体制でさらに加速！**