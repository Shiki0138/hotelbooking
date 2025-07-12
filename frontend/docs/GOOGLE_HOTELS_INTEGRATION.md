# Google Hotels日付連携実装ガイド

## 🎯 概要

ホテルカードをクリックした際に、選択された日付でGoogle Hotelsに遷移し、その日付での空室状況を確認できる機能の実装詳細。

## 🔧 実装済み機能

### 1. 日付パラメータの完全対応

```typescript
// Google Hotels用の複数パラメータフォーマット
googleDateParams = `&checkin=${checkinStr}&checkout=${checkoutStr}&adults=2&children=0`;

// 生成されるURL例:
// https://www.google.com/travel/hotels/search?q=ザ・リッツ・カールトン東京+港区&checkin=2025-07-15&checkout=2025-07-16&adults=2&children=0&hl=ja&gl=jp&ts=CAEaBAoCGgAqAggB
```

### 2. 複数予約サイト対応

| サイト | 日付パラメータ | 追加情報 |
|--------|---------------|----------|
| **Google Hotels** | `checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=2` | 最も確実に日付が反映 |
| **Booking.com** | `checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&group_adults=2&no_rooms=1` | 詳細な宿泊条件付き |
| **楽天トラベル** | `f_checkin=YYYYMMDD&f_checkout=YYYYMMDD&f_otona_su=2` | 独自フォーマット |

### 3. デバッグ機能

```typescript
// ブラウザのコンソールで確認可能
HotelBookingService.debugUrls(hotel, checkinDate, checkoutDate);
```

## 🎪 動作フロー

### 1. 日付選択時
```
ユーザーが日付を選択 
→ selectedDates状態が更新
→ 全ホテルカードに日付情報が反映
```

### 2. ホテルカードクリック時
```
カードクリック
→ selectedDatesの確認
→ 日付付きURL生成
→ Google Hotelsにタブで遷移
→ 指定日付の検索結果表示
```

### 3. 予約ボタンクリック時
```
予約ボタンクリック
→ 同様の日付付きURL生成
→ デバッグ情報をコンソール出力
→ Google Hotelsに遷移
```

## 📋 Google Hotels URLパラメータ詳細

### 基本パラメータ
- `q`: ホテル名+地域名（エンコード済み）
- `checkin`: チェックイン日（YYYY-MM-DD）
- `checkout`: チェックアウト日（YYYY-MM-DD）
- `adults`: 大人の人数（デフォルト: 2）
- `children`: 子供の人数（デフォルト: 0）

### 地域・言語パラメータ
- `hl=ja`: インターフェース言語を日本語に
- `gl=jp`: 地域を日本に設定
- `ts=CAEaBAoCGgAqAggB`: Google内部の検索設定

## 🔍 デバッグ方法

### 1. コンソールログの確認
ホテルをクリックすると以下が出力されます：
```
🔍 ホテルカードクリック: ザ・リッツ・カールトン東京
📅 選択された日付: {checkin: "2025-07-15", checkout: "2025-07-16"}
🔗 遷移先URL: https://www.google.com/travel/hotels/search?q=...
```

### 2. URL検証
生成されたURLをコピーして直接ブラウザで開き、日付が正しく反映されているか確認。

### 3. 日付未選択時の処理
```typescript
if (!selectedDates?.checkin || !selectedDates?.checkout) {
  alert('日付を選択してからホテルをクリックしてください。');
  return;
}
```

## 🎯 期待される結果

### ✅ 成功時の動作
1. ホテルカードクリック
2. 新しいタブでGoogle Hotelsが開く
3. 指定した日付での検索結果が表示
4. 該当ホテルが結果の上位に表示
5. 正確な空室状況と価格が確認可能

### ⚠️ 注意点
- Google Hotelsの検索精度は、ホテル名と地域名の組み合わせに依存
- 一部のホテルは正確にマッチしない場合がある
- 日付が遠い未来の場合、空室情報が表示されない可能性

## 🔄 今後の改善予定

1. **ホテル固有IDの活用**: 楽天ID等を使った直接リンク
2. **より精密な検索**: 住所や座標での検索
3. **エラーハンドリング**: ホテルが見つからない場合の代替検索

この実装により、ユーザーは選択した日付でのリアルタイムな空室状況を、各予約サイトで簡単に確認できます。