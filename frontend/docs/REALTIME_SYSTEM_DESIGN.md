# リアルタイム価格・空室状況システム設計

## 🎯 システム概要

高級ホテルのリアルタイム価格と空室状況を取得し、急な空き状況をユーザーに通知するシステム

## 📊 データソース

### 1. 主要予約サイトAPI
- **楽天トラベルAPI**: リアルタイム価格・空室状況
- **じゃらんAPI**: 空室情報・特価情報
- **一休.comAPI**: 高級ホテル専門データ
- **Booking.com API**: 国際ブランドホテル
- **Expedia API**: グローバル価格比較
- **Google Hotel Ads API**: 総合価格情報

### 2. ホテル公式API
- **PMS (Property Management System)** 直接連携
- **Channel Manager** 経由での空室状況
- **Revenue Management System** 動的価格情報

## 🏗️ システム構成

### バックエンド（Vercel Edge Functions + Supabase）

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド   │    │  Vercel Edge    │    │   Supabase DB   │
│                │────│   Functions     │────│                │
│  - 検索UI      │    │                │    │  - ホテルマスタ │
│  - 結果表示    │    │  - API統合     │    │  - 価格履歴    │
│  - 通知受信    │    │  - データ加工   │    │  - 空室履歴    │
└─────────────────┘    │  - キャッシング │    │  - ユーザー設定 │
                       └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   外部API群     │
                       │                │
                       │ - 楽天トラベル  │
                       │ - じゃらん     │
                       │ - 一休.com     │
                       │ - Booking.com  │
                       │ - Google Hotels │
                       └─────────────────┘
```

### データフロー

```
1. 定期データ取得 (5分間隔)
   └── 外部API → Edge Function → Supabase

2. リアルタイム検索
   └── ユーザー入力 → Edge Function → 外部API → 結果表示

3. 急な空き通知
   └── 空室検出 → Push通知 → ユーザー

4. 価格変動監視
   └── 価格変化 → アラート → 登録ユーザー
```

## 🔧 実装フェーズ

### フェーズ1: 基盤構築 (2-3週間)
1. **Supabaseデータベース設計**
   - ホテルマスタテーブル
   - 価格履歴テーブル
   - 空室履歴テーブル
   - ユーザー設定テーブル

2. **基本API実装**
   - 楽天トラベルAPI連携
   - じゃらんAPI連携
   - 基本的な価格取得機能

### フェーズ2: 機能拡張 (3-4週間)
1. **複数API統合**
   - 一休.com API
   - Booking.com API
   - Google Hotels API

2. **リアルタイム機能**
   - 定期的データ更新
   - 空室状況監視
   - 価格変動検知

### フェーズ3: 通知システム (2-3週間)
1. **急な空き通知**
   - Push通知
   - メール通知
   - LINE通知

2. **価格アラート**
   - 指定価格以下通知
   - 特価情報アラート

## 📋 必要なAPI契約

### 優先度高（必須）
1. **楽天トラベルAPI**
   - 料金: 月額10,000円〜
   - 取得可能: 価格、空室、ホテル詳細

2. **じゃらんAPI**
   - 料金: 月額5,000円〜
   - 取得可能: 空室状況、プラン情報

### 優先度中（推奨）
3. **一休.com API**
   - 料金: 要相談
   - 取得可能: 高級ホテル専門データ

4. **Booking.com API**
   - 料金: 従量課金
   - 取得可能: 国際ホテル価格

### 優先度低（将来）
5. **Google Hotel Ads API**
   - 料金: 要相談
   - 取得可能: 総合価格比較

## 💰 運用コスト試算

### 月額費用
- **API利用料**: 20,000円〜50,000円
- **Vercel Pro**: $20 (約3,000円)
- **Supabase Pro**: $25 (約3,800円)
- **通知サービス**: 5,000円〜10,000円
- **合計**: 約30,000円〜70,000円/月

### 収益化方法
1. **予約手数料**: 3-5%
2. **広告収入**: ホテル直接契約
3. **プレミアム機能**: 月額999円
4. **法人向けAPI**: 月額50,000円〜

## ⚡ 急な空き状況検知の仕組み

### 1. 空室状況監視
```javascript
// 5分ごとに実行される監視処理
async function monitorAvailability() {
  const hotels = await getMonitoredHotels();
  
  for (const hotel of hotels) {
    const currentAvailability = await checkAvailability(hotel);
    const previousAvailability = await getPreviousAvailability(hotel);
    
    // 新しい空きが発生した場合
    if (!previousAvailability.available && currentAvailability.available) {
      await notifyUsers({
        type: 'sudden_availability',
        hotel: hotel,
        dates: currentAvailability.dates,
        price: currentAvailability.price
      });
    }
  }
}
```

### 2. 通知システム
```javascript
// ユーザーへの通知
async function notifyUsers(alertData) {
  const users = await getUsersWatchingHotel(alertData.hotel.id);
  
  for (const user of users) {
    // Push通知
    await sendPushNotification(user, {
      title: `${alertData.hotel.name}に空きが出ました！`,
      body: `${alertData.dates} ¥${alertData.price.toLocaleString()}/泊`,
      url: `/hotel/${alertData.hotel.id}?dates=${alertData.dates}`
    });
    
    // メール通知
    await sendEmailAlert(user, alertData);
  }
}
```

## 📈 スケーラビリティ対策

### 1. キャッシング戦略
- **Redis**: 価格データ（5分キャッシュ）
- **CDN**: 静的データ（24時間キャッシュ）
- **メモリキャッシュ**: ホテル基本情報（1時間）

### 2. レート制限対策
- **APIクォータ管理**: 1日あたりの制限監視
- **優先度制御**: 人気ホテル優先取得
- **バッチ処理**: 夜間一括更新

### 3. 可用性向上
- **複数データソース**: API障害時のフォールバック
- **ヘルスチェック**: API状態監視
- **エラーハンドリング**: 適切な降格処理

## 🔒 データ品質管理

### 1. データ検証
- **価格妥当性チェック**: 異常値検出
- **空室状況整合性**: 複数ソース照合
- **更新頻度監視**: データ鮮度確認

### 2. 品質指標
- **データ精度**: 95%以上
- **応答時間**: 2秒以内
- **可用性**: 99.9%以上

この設計により、リアルタイムの価格・空室状況取得と急な空き通知が可能になります。