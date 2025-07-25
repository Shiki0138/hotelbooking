# LastMinuteStay UI/UXデザイン仕様書

## ビジョン
市場最高クラスのホテル予約体験を提供する

## デザインコンセプト

### 1. ミニマルラグジュアリー
- シンプルで洗練されたデザイン
- 余白を活かしたレイアウト
- 高級感のあるタイポグラフィ

### 2. マイクロインタラクション
- ホバーエフェクト
- スムーズなトランジション
- スケルトンスクリーン
- プログレッシブイメージローディング

### 3. ビジュアルヒエラルキー
- 重要情報の強調
- カードベースレイアウト
- グリッドシステム

## ページ別デザイン

### ランディングページ
```
ヒーローセクション:
- フルスクリーン背景動画/画像
- キャッチコピー：「最高の宿泊体験を、今すぐ」
- 検索バー（フローティング）
- CTAボタン

フィーチャー:
- 3カラムグリッド
- アイコン + タイトル + 説明
- アニメーションon scroll

人気ホテル:
- カルーセル/スライダー
- ホテルカード
- レーティング
- 価格表示
```

### 検索結果ページ
```
サイドバー:
- フィルターオプション
- 価格スライダー
- 評価フィルター
- アメニティチェックボックス

メインエリア:
- ソートオプション
- ホテルリスト（グリッド/リスト切り替え）
- 地図表示トグル
- ページネーション
```

### ホテル詳細ページ
```
ギャラリー:
- フルスクリーンギャラリー
- サムネイルナビゲーション
- 360度ビューオプション

情報セクション:
- タブ式ナビゲーション
- 概要/客室/設備/レビュー
- スティッキー予約バー
```

### 予約フロー
```
STEP 1: 客室選択
- 利用可能な客室一覧
- 価格比較
- キャンセルポリシー表示

STEP 2: ゲスト情報
- スマートフォーム
- オートコンプリート
- バリデーション

STEP 3: 支払い
- セキュアな支払いフォーム
- 複数の支払いオプション
- 料金内訳の透明性

STEP 4: 確認
- 予約サマリー
- メール送信
- PDFダウンロード
```

## コンポーネントライブラリ

### 基本コンポーネント
1. **ヘッダー**
   - スティッキー/スクロール時に変化
   - ロゴ + ナビゲーション + CTA

2. **検索バー**
   - オートサジェスト
   - 日付ピッカー
   - ゲスト選択

3. **ホテルカード**
   - 画像スライダー
   - 価格バッジ
   - レーティング
   - CTAボタン

4. **モーダル**
   - オーバーレイ
   - スムーズアニメーション
   - 閉じるボタン

5. **ローディング状態**
   - スケルトンスクリーン
   - プログレスバー
   - スピナー

## アニメーション仕様

### ページ遷移
- フェードイン/アウト
- スライドイン
- スケールエフェクト

### マイクロアニメーション
- ホバー時のスケール
- クリック時のリップル
- スクロール連動アニメーション

### ローディング
- プログレッシブ画像読み込み
- レイジーロード
- インフィニットスクロール

## レスポンシブデザイン

### ブレークポイント
- Mobile: 0-639px
- Tablet: 640-1023px
- Desktop: 1024-1279px
- Wide: 1280px+

### モバイル最適化
- タッチジェスチャー
- ボトムナビゲーション
- スワイプ操作
- 大きめのタップターゲット

## パフォーマンス目標
- FCP: < 1.8s
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1
- Lighthouseスコア: 95+

## アクセシビリティ
- WCAG 2.1 AA準拠
- キーボードナビゲーション
- スクリーンリーダー対応
- 高コントラストモード