# 🎯 ボス-スタッフ間 指示・報告ワークフロー

## システム概要
このシステムは、ボス（チームリーダー）とスタッフ（実行担当者）間での効率的な指示・完了報告を実現します。

## 基本構成
- **BOSS** (hotel_team:0.0): チームリーダー
- **STAFF1-5** (hotel_team:0.1-0.5): 実行担当者

## 基本的なワークフロー

### 1. 指示フェーズ
```bash
# BOSSからスタッフへの指示
./agent-send.sh staff1 "あなたはstaff1です。データベースの更新作業を実行してください"
./agent-send.sh staff2 "あなたはstaff2です。フロントエンドの修正作業を実行してください"
```

### 2. 作業実行フェーズ
各スタッフが指示された作業を実行
```bash
# スタッフ側での作業実行例
echo "作業を開始します: データベース更新作業"
# 実際の作業コマンド実行
echo "作業が完了しました"
```

### 3. 完了報告フェーズ
```bash
# スタッフからBOSSへの完了報告
./agent-send.sh boss "Staff1 作業完了: データベース更新作業"
./agent-send.sh boss "Staff2 作業完了: フロントエンド修正作業"
```

### 4. 統合報告フェーズ
```bash
# BOSSから上位（PRESIDENT等）への報告
./agent-send.sh president "チーム作業完了: データベース更新・フロントエンド修正が完了しました"
```

## 作業パターン

### 並行作業パターン
同時に複数の作業を並行実行
```bash
# BOSS指示
./agent-send.sh staff1 "データベース更新作業"
./agent-send.sh staff2 "API修正作業"  
./agent-send.sh staff3 "テスト実行作業"

# 各スタッフ完了報告
./agent-send.sh boss "Staff1 作業完了: データベース更新作業"
./agent-send.sh boss "Staff2 作業完了: API修正作業"
./agent-send.sh boss "Staff3 作業完了: テスト実行作業"
```

### 順次作業パターン
順序が重要な作業を段階的に実行
```bash
# Step 1
./agent-send.sh staff1 "Step1: 設定ファイル作成"
# Staff1完了報告後
./agent-send.sh staff2 "Step2: サーバー起動"
# Staff2完了報告後
./agent-send.sh staff3 "Step3: 動作確認"
```

## エラーハンドリング

### エラー発生時の報告
```bash
# スタッフからのエラー報告
./agent-send.sh boss "Staff1 作業完了（エラーあり）: データベース接続エラーが発生しました"

# BOSSからの対応指示
./agent-send.sh staff1 "エラーの詳細を確認し、再試行してください"
```

### 進捗確認
```bash
# BOSSからの進捗確認
./agent-send.sh staff2 "現在の進捗状況を報告してください"

# スタッフからの進捗報告
./agent-send.sh boss "Staff2 進捗報告: 70%完了、残り5分程度で完了予定"
```

## 重要なポイント

### BOSS側のポイント
- 作業を適切に分散して効率化
- スタッフの進捗を把握し、必要に応じてサポート
- 完了報告は上位に要約して報告
- エラー発生時は迅速に対応指示

### STAFF側のポイント
- 自分のstaff番号を明確に報告
- 作業内容を具体的に報告
- エラーがあった場合も詳細を報告
- 不明な点は遠慮なく確認を求める

## 使用例

### 基本的な作業指示例
```bash
# BOSS → STAFF
./agent-send.sh staff1 "あなたはstaff1です。Hello World プログラムを作成し、実行してください"

# STAFF → BOSS
./agent-send.sh boss "Staff1 作業完了: Hello World プログラム作成・実行"
```

### 複雑な作業分散例
```bash
# BOSS → 複数STAFF
./agent-send.sh staff1 "Webサイトのヘッダー部分の修正"
./agent-send.sh staff2 "データベースのマイグレーション実行"
./agent-send.sh staff3 "テストスイートの実行"
./agent-send.sh staff4 "デプロイ準備"

# 各STAFF完了後
./agent-send.sh boss "Staff1 作業完了: ヘッダー修正"
./agent-send.sh boss "Staff2 作業完了: DBマイグレーション"
./agent-send.sh boss "Staff3 作業完了: テスト実行（全て合格）"
./agent-send.sh boss "Staff4 作業完了: デプロイ準備"

# BOSS → PRESIDENT
./agent-send.sh president "チーム作業完了: Webサイト更新作業が完了しました"
```

このワークフローにより、効率的で追跡可能な作業管理が実現されます。