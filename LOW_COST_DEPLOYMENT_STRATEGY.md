# 超低コスト本番運用戦略

## 1. 無料/超低コスト構成 (月額$0-10)

### **Vercel + Supabase構成**
```
Frontend: Vercel (無料)
Backend: Vercel Functions (無料枠)
Database: Supabase (無料枠500MB)
Email: Resend (無料枠3,000通/月)
Queue: Upstash Redis (無料枠10,000コマンド/日)
```

### **Netlify + PlanetScale構成**
```
Frontend: Netlify (無料)
Backend: Netlify Functions (無料枠125k/月)
Database: PlanetScale (無料枠5GB)
Email: SendGrid (無料枠100通/日)
Queue: Railway Redis (無料枠$5クレジット)
```

## 2. 実装例 (Vercel + Supabase)

### ディレクトリ構造
```
/api
  /notifications
    - send.js (メール送信API)
    - webhook.js (空室通知トリガー)
/frontend
  - (既存のReactアプリ)
```

### メール通知実装 (Vercel Functions)
```javascript
// api/notifications/send.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const { email, hotelInfo } = req.body;
  
  await resend.emails.send({
    from: 'notifications@yourdomain.com',
    to: email,
    subject: '空室が出ました！',
    html: `<h1>${hotelInfo.name}に空室が出ました</h1>`
  });
  
  res.status(200).json({ success: true });
}
```

## 3. デプロイ手順

```bash
# 1. Vercelにデプロイ
npm i -g vercel
vercel

# 2. Supabase設定
npm install @supabase/supabase-js

# 3. 環境変数設定
SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-key
RESEND_API_KEY=your-key
```

## 4. コスト比較

| サービス | 無料枠 | 月額コスト |
|---------|--------|-----------|
| Vercel | 100GB帯域 | $0 |
| Supabase | 500MB DB | $0 |
| Resend | 3,000通/月 | $0 |
| Upstash | 10k cmd/日 | $0 |
| **合計** | - | **$0** |

## 5. スケール時の移行パス

無料枠超過時:
1. Vercel Pro ($20/月)
2. Supabase Pro ($25/月)
3. または自前VPS (月額$5-10)