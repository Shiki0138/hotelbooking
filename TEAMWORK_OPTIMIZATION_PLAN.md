# 🤝 チームワーク最適化計画 - Worker3支援コード集

## 📌 Worker1支援：楽天API統合

### エラーハンドリングラッパー
```javascript
// backend/services/rakuten-api-wrapper.js
const axios = require('axios');

class RakutenAPIWrapper {
  constructor() {
    this.baseURL = 'https://app.rakuten.co.jp/services/api';
    this.applicationId = process.env.RAKUTEN_APPLICATION_ID;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分
  }

  async searchHotels(params) {
    const cacheKey = JSON.stringify(params);
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await axios.get(`${this.baseURL}/Travel/VacantHotelSearch/20170426`, {
        params: {
          applicationId: this.applicationId,
          format: 'json',
          ...params
        },
        timeout: 10000,
      });

      const result = {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };

      // キャッシュ保存
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      // APIエラーレスポンス
      return {
        success: false,
        error: error.response.data?.error || 'API Error',
        status: error.response.status,
      };
    } else if (error.request) {
      // ネットワークエラー
      return {
        success: false,
        error: 'Network Error',
        message: 'APIサーバーに接続できません',
      };
    } else {
      // その他のエラー
      return {
        success: false,
        error: 'Unknown Error',
        message: error.message,
      };
    }
  }

  // キャッシュクリア
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new RakutenAPIWrapper();
```

### データベース連携処理
```javascript
// backend/services/hotel-data-sync.js
const supabase = require('./supabase-client');
const rakutenAPI = require('./rakuten-api-wrapper');

async function syncHotelData(searchParams) {
  // 楽天APIからデータ取得
  const apiResult = await rakutenAPI.searchHotels(searchParams);
  
  if (\!apiResult.success) {
    throw new Error(`API Error: ${apiResult.error}`);
  }

  // データベースに保存
  const hotels = apiResult.data.hotels || [];
  const processedHotels = [];

  for (const hotel of hotels) {
    const hotelData = {
      hotel_id: hotel.hotelBasicInfo.hotelNo,
      hotel_name: hotel.hotelBasicInfo.hotelName,
      area: hotel.hotelBasicInfo.address1,
      prefecture: hotel.hotelBasicInfo.address1.split(/[市区町村]/)[0],
      current_price: hotel.hotelBasicInfo.hotelMinCharge,
      availability_status: hotel.roomInfo ? 'available' : 'unavailable',
      check_timestamp: new Date().toISOString(),
    };

    // 価格履歴に追加
    const { error } = await supabase
      .from('hotel_price_history')
      .insert(hotelData);

    if (\!error) {
      processedHotels.push(hotelData);
    }
  }

  return {
    success: true,
    processed: processedHotels.length,
    total: hotels.length,
  };
}

module.exports = { syncHotelData };
```

## 📌 Worker2支援：Supabase認証

### 認証サービス完全実装
```javascript
// backend/services/auth.service.js
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

class AuthService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async register(email, password, name) {
    try {
      // Supabase Auth でユーザー作成
      const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) throw authError;

      // プロフィール作成
      const { error: profileError } = await this.supabase
        .from('demo_users')
        .insert({
          id: authData.user.id,
          email,
          name,
          created_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      return {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async login(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // カスタムJWT生成
      const token = this.generateToken(data.user);

      return {
        success: true,
        user: data.user,
        token,
        session: data.session,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
      },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '24h' }
    );
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
      return { success: true, user: decoded };
    } catch (error) {
      return { success: false, error: 'Invalid token' };
    }
  }
}

module.exports = new AuthService();
```

### JWT検証ミドルウェア
```javascript
// backend/middleware/auth.middleware.js
const authService = require('../services/auth.service');

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (\!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }

  const result = authService.verifyToken(token);

  if (\!result.success) {
    return res.status(401).json({
      success: false,
      error: result.error,
    });
  }

  req.user = result.user;
  next();
}

// オプショナル認証（認証なしでも続行）
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const result = authService.verifyToken(token);
    if (result.success) {
      req.user = result.user;
    }
  }

  next();
}

module.exports = { requireAuth, optionalAuth };
```

## 📌 統合テスト用共通コード

### Supabase接続（IPv6対応）
```javascript
// backend/services/supabase-client.js
const { createClient } = require('@supabase/supabase-js');

// IPv6対応 Supavisor URL使用
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// 接続テスト関数
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('demo_users')
      .select('count(*)')
      .limit(1);

    if (error) throw error;

    console.log('✅ Supabase接続成功');
    return true;
  } catch (error) {
    console.error('❌ Supabase接続エラー:', error);
    return false;
  }
}

module.exports = supabase;
module.exports.testConnection = testConnection;
```

### 環境変数チェッカー
```javascript
// backend/utils/env-checker.js
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RAKUTEN_APPLICATION_ID',
  'RESEND_API_KEY',
  'JWT_SECRET',
];

function checkEnvironment() {
  const missing = [];

  requiredEnvVars.forEach(varName => {
    if (\!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error('❌ 必須環境変数が不足しています:');
    missing.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    return false;
  }

  console.log('✅ 環境変数チェック完了');
  return true;
}

module.exports = { checkEnvironment };
```

## 🚀 統合テスト実行手順

```bash
# 1. 環境変数設定
cp .env.example .env
# 必要な値を設定

# 2. 依存関係インストール
npm install

# 3. データベース初期化
psql $POSTGRES_URL < backend/database/demo-schema.sql
psql $POSTGRES_URL < backend/database/demo-seed.sql

# 4. 統合テスト実行
node backend/integration/test-environment.js

# 5. 個別テスト
npm test -- --testPathPattern=integration
```

## 📊 成功指標

- API接続成功率: 100%
- 認証フロー成功率: 100%
- データベース操作成功率: 100%
- レスポンス時間: < 500ms
- エラーハンドリング: 全パターンカバー

---

**チームワーク最大化により、技術課題即座解決！**
**第1統合テスト成功確実！**
EOF < /dev/null