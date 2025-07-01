# 楽天トラベルAPI実装ガイド

## 概要
このドキュメントは、楽天トラベルAPIの実装と使用方法について説明します。

## 実装内容

### 1. API統合モジュール
- **ファイル**: `/src/services/api/rakutenTravel.js`
- **機能**:
  - エリア検索（東京・大阪・京都の主要都市対応）
  - キーワード検索
  - 空室検索（日付・人数指定）
  - ホテル詳細取得
  - キャッシュ機能（5分間）
  - エラーハンドリング（モックデータフォールバック）

### 2. 対応エリア

#### 東京都
- 新宿 (shinjuku)
- 渋谷 (shibuya)
- 六本木・麻布・赤坂 (roppongi)
- 銀座・日本橋・東京駅周辺 (ginza)
- 浅草・両国・錦糸町 (asakusa)
- 池袋 (ikebukuro)
- 上野・浅草・両国 (ueno)
- お台場・汐留・新橋 (odaiba)

#### 大阪府
- 梅田・大阪駅・中之島 (umeda)
- 心斎橋・なんば・本町 (namba)
- 新大阪・淀川区 (shin-osaka)
- 天王寺・阿倍野 (tennoji)
- ベイエリア・USJ (bay)

#### 京都府
- 京都駅周辺 (station)
- 祇園・東山 (gion)
- 河原町・烏丸・四条大宮 (kawaramachi)
- 嵐山・嵯峨野 (arashiyama)
- 北山・金閣寺 (kita)

### 3. 統合されたサービス
- **ファイル**: `/src/services/HotelSearchService.js`
- **機能**:
  - 楽天トラベル、Amadeus、Booking.comの統合検索
  - 日本国内検索時は楽天トラベルを優先
  - 重複排除とデータマージ
  - 統一フォーマットへの正規化

### 4. テストツール
- **URL**: `/test-rakuten`
- **ファイル**: `/src/components/Testing/RakutenAPITest.jsx`
- **機能**:
  - 各APIエンドポイントのテスト
  - リアルタイムデータ取得確認
  - エラーハンドリング確認

## 使用方法

### 基本的な使い方

```javascript
import rakutenAPI from './services/api/rakutenTravel';

// 1. エリア検索
const tokyoHotels = await rakutenAPI.searchTokyoHotels('shinjuku', {
  limit: 20,
  sort: '+roomCharge' // 料金の安い順
});

// 2. 空室検索
const vacantHotels = await rakutenAPI.searchVacantRooms({
  area: 'osaka',
  subArea: 'umeda',
  checkinDate: '2024-03-01',
  checkoutDate: '2024-03-02',
  adults: 2,
  rooms: 1
});

// 3. キーワード検索
const stationHotels = await rakutenAPI.searchByKeyword('東京駅', {
  limit: 30,
  sort: '-reviewAverage' // レビュー評価の高い順
});
```

### 統合サービスでの使用

```javascript
import HotelSearchService from './services/HotelSearchService';

// 統合検索（楽天トラベルAPIも含む）
const results = await HotelSearchService.searchHotels({
  location: {
    name: '東京',
    city: '東京',
    country: '日本',
    latitude: 35.6762,
    longitude: 139.6503
  },
  checkIn: '2024-03-01',
  checkOut: '2024-03-02',
  guests: 2,
  rooms: 1
});
```

## API設定

### 環境変数
```env
# .env ファイル
REACT_APP_RAKUTEN_APP_ID=your_rakuten_app_id_here
VITE_RAKUTEN_APP_ID=your_rakuten_app_id_here
```

### APIキーの取得
1. [楽天ウェブサービス](https://webservice.rakuten.co.jp/)にアクセス
2. アカウント登録
3. アプリケーションIDを取得
4. 環境変数に設定

## 注意事項

### API制限
- 1秒間に1リクエストまで
- 開発時はキャッシュ機能を活用
- 本番環境では適切なレート制限を実装

### エラーハンドリング
- API認証エラー時はモックデータを返却
- ネットワークエラー時は空配列を返却
- すべてのエラーはコンソールに記録

### データ形式
- 価格は日本円（JPY）で統一
- 日付はYYYY-MM-DD形式
- 座標は世界測地系（WGS84）

## トラブルシューティング

### CORSエラーが発生する場合
- 開発環境ではプロキシ設定を確認
- 本番環境ではサーバーサイドでAPI呼び出しを実装

### データが取得できない場合
1. APIキーが正しく設定されているか確認
2. ネットワーク接続を確認
3. ブラウザの開発者ツールでエラーを確認
4. `/test-rakuten`でテストツールを使用して診断

### モックデータが返される場合
- APIキーが無効または未設定
- API制限に達している
- 楽天トラベルAPIのメンテナンス中

## 今後の拡張予定

1. **エリア拡張**
   - 全国の主要都市対応
   - 観光地・温泉地の追加

2. **機能追加**
   - プラン詳細取得
   - 予約可能プランのリアルタイム取得
   - レビュー詳細の取得

3. **パフォーマンス改善**
   - より効率的なキャッシュ戦略
   - バッチ処理の実装
   - 画像の遅延読み込み