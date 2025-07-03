# 🚨 緊急対策計画（即座実行可能）

## ⏰ T+2.4h時点の対策準備

### 🔴 Worker1（楽天API）緊急対策
**症状**: API接続不可・CORS問題
```javascript
// 緊急対策1: プロキシ経由実装
const PROXY_URL = '/api/proxy/rakuten';

// 緊急対策2: モックデータ実装
const MOCK_HOTELS = [
  {
    hotelNo: '12345',
    hotelName: '東京グランドホテル',
    hotelInformationUrl: '#',
    hotelMinCharge: 8000,
    reviewAverage: 4.5,
    // ... 実データ形式
  }
];

// 緊急対策3: キャッシュ実装
const cacheResults = (area, data) => {
  localStorage.setItem(`hotels_${area}`, JSON.stringify(data));
};
```

### 🔴 Worker2（認証）緊急対策
**症状**: JWT実装遅延・Supabase認証問題
```javascript
// 緊急対策1: 簡易セッション実装
const simpleAuth = {
  login: (email, password) => {
    // 簡易認証
    sessionStorage.setItem('user', JSON.stringify({email}));
    return {success: true};
  },
  isAuthenticated: () => {
    return sessionStorage.getItem('user') !== null;
  }
};

// 緊急対策2: ローカルストレージ認証
const localAuth = {
  register: (email, name) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push({email, name, id: Date.now()});
    localStorage.setItem('users', JSON.stringify(users));
  }
};
```

### 🔴 Worker3（DB）緊急対策
**症状**: RLS設定問題・スキーマ遅延
```sql
-- 緊急対策1: 簡素化スキーマ
CREATE TABLE simple_watchlist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  hotel_id VARCHAR(50),
  hotel_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 緊急対策2: RLS無効化（開発用）
ALTER TABLE simple_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "開発用全許可" ON simple_watchlist FOR ALL USING (true);
```

## 🎯 統合テスト代替案

### Plan A: 全Worker順調（90%確率）
- 予定通り22:30統合テスト実行
- 全機能統合確認

### Plan B: 1Worker遅延（75%確率）
- 遅延Worker機能を簡素化
- 他2Workerで基本統合テスト
- 遅延機能は次フェーズで実装

### Plan C: 2Worker遅延（60%確率）
- コア機能のみ統合テスト
- 検索機能優先実装
- UI/認証は最小限実装

## ⚡ 即座実行コマンド

### 楽天API問題対応
```bash
# プロキシサーバー起動
npm run proxy-server

# モックデータ切替
export USE_MOCK_DATA=true
```

### Supabase問題対応
```bash
# ローカル認証切替
export AUTH_MODE=local

# Supabaseリセット
supabase db reset
```

### 統合問題対応
```bash
# 簡易モード起動
npm run demo-simple

# 機能制限版デプロイ
vercel --prod --env MODE=limited
```

## 📊 リスク別対応マトリックス

| リスクレベル | 遅延時間 | 対応策 | 影響範囲 |
|------------|---------|--------|----------|
| 🟢 低 | <30分 | 継続監視 | なし |
| 🟡 中 | 30分-1時間 | 機能簡素化 | 一部機能 |
| 🔴 高 | >1時間 | 緊急対策実行 | 全体調整 |

## 🚀 成功確率向上策

### 技術サポート体制
- Boss1技術支援待機
- 問題別対応ガイド準備
- 代替実装パターン準備

### 機能優先度（削減可能順）
1. メール通知（後回し可）
2. ウォッチリスト詳細機能
3. 高度な検索フィルタ
4. ユーザープロフィール

### コア機能死守項目
1. ホテル検索・表示
2. 基本的なユーザー登録
3. シンプルなお気に入り登録

---
**Status**: 全対策準備完了  
**実行基準**: Worker進捗報告による判断  
**次回評価**: T+4h (20:30)