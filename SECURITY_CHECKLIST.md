# 🔒 セキュリティチェックリスト

**プロジェクト**: ラストミニット・マッチ (Last-Minute Match)  
**作成日**: 2025-06-26  
**作成者**: worker5

## 🎯 セキュリティ目標

- OWASP Top 10 準拠
- SOC 2 相当のログ管理
- GDPR/APPI 準拠
- ゼロトラストアーキテクチャ採用

## 🛡️ アプリケーションセキュリティ

### 1. 認証・認可

#### ✅ 必須チェック項目
- [ ] Auth0統合実装
- [ ] JWT適切な実装
- [ ] リフレッシュトークン管理
- [ ] セッション管理
- [ ] RBAC実装

#### 実装例
```typescript
// JWT検証ミドルウェア
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});
```

### 2. 入力検証

#### ✅ 必須チェック項目
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] CSRF対策
- [ ] パラメータ汚染対策
- [ ] ファイルアップロード検証

#### 実装例
```typescript
// 入力検証例
import { body, validationResult } from 'express-validator';

const validateHotelSearch = [
  body('location').isString().trim().escape(),
  body('checkIn').isISO8601().toDate(),
  body('checkOut').isISO8601().toDate(),
  body('guests').isInt({ min: 1, max: 10 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### 3. データ保護

#### ✅ 必須チェック項目
- [ ] HTTPS強制
- [ ] 暗号化実装（転送時・保存時）
- [ ] PII暗号化
- [ ] APIキー管理
- [ ] シークレット管理

#### 実装例
```typescript
// Cloud KMS暗号化
import { KeyManagementServiceClient } from '@google-cloud/kms';

const kmsClient = new KeyManagementServiceClient();

async function encryptPII(plaintext: string): Promise<string> {
  const [result] = await kmsClient.encrypt({
    name: kmsKeyName,
    plaintext: Buffer.from(plaintext),
  });
  return result.ciphertext.toString('base64');
}
```

## 🌐 インフラセキュリティ

### 1. ネットワークセキュリティ

#### ✅ 必須チェック項目
- [ ] Cloud Armor WAF設定
- [ ] DDoS対策
- [ ] VPC設定
- [ ] ファイアウォールルール
- [ ] SSL/TLS設定

#### Cloud Armor設定例
```yaml
# cloud-armor-policy.yaml
name: hotel-api-security-policy
rules:
  - action: deny(403)
    priority: 1000
    match:
      expr:
        expression: "origin.region_code == 'XX'"
  - action: throttle
    priority: 2000
    match:
      expr:
        expression: "true"
    rateLimit:
      conformAction: allow
      exceedAction: deny(429)
      enforceOnKey: IP
      rateLimitThreshold:
        count: 100
        intervalSec: 60
```

### 2. アクセス制御

#### ✅ 必須チェック項目
- [ ] IAMポリシー最小権限
- [ ] サービスアカウント管理
- [ ] Identity-Aware Proxy設定
- [ ] 監査ログ有効化
- [ ] MFA強制

### 3. シークレット管理

#### ✅ 必須チェック項目
- [ ] Secret Manager使用
- [ ] 定期的なローテーション
- [ ] アクセス監査
- [ ] 環境変数分離
- [ ] ハードコード禁止

## 📊 モニタリング・監査

### 1. ログ管理

#### ✅ 必須チェック項目
- [ ] アクセスログ記録
- [ ] エラーログ記録
- [ ] 監査ログ記録
- [ ] ログ保存期間設定
- [ ] ログ暗号化

#### Cloud Logging設定例
```typescript
// ログ記録設定
import { Logging } from '@google-cloud/logging';

const logging = new Logging();
const log = logging.log('security-events');

function logSecurityEvent(event: SecurityEvent) {
  const metadata = {
    severity: 'WARNING',
    labels: {
      event_type: event.type,
      user_id: event.userId,
      ip_address: event.ipAddress,
    },
  };
  
  const entry = log.entry(metadata, event);
  log.write(entry);
}
```

### 2. 脅威検知

#### ✅ 必須チェック項目
- [ ] 異常検知設定
- [ ] リアルタイムアラート
- [ ] セキュリティスキャン自動化
- [ ] 脆弱性管理
- [ ] インシデント対応計画

## 🔍 定期的なセキュリティレビュー

### 週次チェック
- [ ] アクセスログレビュー
- [ ] 異常検知アラート確認
- [ ] パッチ適用状況

### 月次チェック
- [ ] 脆弱性スキャン実施
- [ ] アクセス権限レビュー
- [ ] セキュリティ設定確認

### 四半期チェック
- [ ] ペネトレーションテスト
- [ ] セキュリティ監査
- [ ] インシデント対応訓練

## 🚨 インシデント対応

### 対応手順
1. **検知**: 異常を検知
2. **評価**: 影響範囲確認
3. **封じ込め**: 被害拡大防止
4. **根絶**: 原因除去
5. **復旧**: サービス復旧
6. **事後分析**: 再発防止策

### 連絡体制
- セキュリティチーム: security@lastminute-match.com
- インシデント対応: +81-XX-XXXX-XXXX (24/7)
- 外部CSIRT: csirt@partner.com

## 📋 コンプライアンス

### GDPR対応
- [ ] プライバシーポリシー整備
- [ ] データ削除機能実装
- [ ] 同意管理機能
- [ ] データポータビリティ

### PCI DSS対応
- [ ] カード情報非保持
- [ ] トークン化実装
- [ ] 決済プロバイダー連携
- [ ] 監査証跡管理

## 🔗 参考資料
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GCP Security Best Practices](https://cloud.google.com/security/best-practices)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)