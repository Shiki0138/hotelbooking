# 🚨 Vercel デプロイエラー対策マニュアル

## エラー種別: VERCEL_PROJECT_ID/VERCEL_ORG_ID 設定エラー

### ❌ エラー内容
```
Error: You specified `VERCEL_PROJECT_ID` but you forgot to specify
`VERCEL_ORG_ID`. You need to specify both to deploy to a custom project.
Error: Process completed with exit code 1.
```

### 🔍 根本原因
1. **CI/CD環境変数の不適切な設定**
   - GitHub Actions等でVERCEL_PROJECT_IDのみ設定されている
   - VERCEL_ORG_IDが未設定または空文字

2. **アカウント種別の誤認識**
   - 個人アカウントでもVERCEL_ORG_IDが必要と判断される場合がある
   - チーム/組織アカウントと個人アカウントの混同

### ✅ 解決策

#### A. 個人アカウントの場合（推奨）
```bash
# 1. 環境変数を削除または空にする
unset VERCEL_PROJECT_ID
unset VERCEL_ORG_ID

# 2. 自動デプロイを使用
vercel --prod
```

#### B. 特定プロジェクトにデプロイする場合
```bash
# 1. アカウント情報確認
vercel whoami
vercel teams ls

# 2. 正しいORG IDを取得
# 個人アカウント: "shikis-projects-6e27447a"
# チームアカウント: チーム一覧から取得

# 3. 環境変数設定
export VERCEL_ORG_ID="shikis-projects-6e27447a"
export VERCEL_PROJECT_ID="your-project-id"
```

#### C. CI/CD環境での対策
```yaml
# GitHub Actions例
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
  # 個人アカウントの場合は両方とも空または未設定にする
```

### 🎯 緊急対応手順

1. **即座に実行すべきコマンド**
```bash
# 環境変数をクリア
unset VERCEL_PROJECT_ID
unset VERCEL_ORG_ID

# 手動デプロイ実行
vercel --prod
```

2. **長期対策**
```bash
# プロジェクト設定を確認
vercel project ls
vercel env ls

# 必要に応じて環境変数を削除
vercel env rm VERCEL_PROJECT_ID
vercel env rm VERCEL_ORG_ID
```

### 📋 チェックリスト

- [ ] アカウント種別確認（個人/チーム）
- [ ] 環境変数の設定状況確認
- [ ] CI/CD設定の見直し
- [ ] 手動デプロイでのテスト
- [ ] 自動デプロイの動作確認

### 🚀 予防策

1. **個人アカウントの場合**
   - VERCEL_PROJECT_ID/VERCEL_ORG_IDは設定しない
   - Vercel CLIのデフォルト動作に任せる

2. **チーム/組織アカウントの場合のみ**
   - 両方の環境変数を正確に設定
   - 定期的な設定値の確認

3. **CI/CD設定の統一**
   - 全チームメンバーで同じ設定方針を共有
   - 設定変更時は必ず全員に通知

### 🔄 今後の対応

このエラーが発生した場合は、以下の順序で対応：
1. このマニュアルを参照
2. アカウント種別を確認
3. 該当する解決策を実行
4. 必要に応じてチーム/組織に報告

### 🚨 緊急修正完了報告 (2025-07-05)

**✅ 解決済み！** デプロイ成功
- **本番URL:** https://hotelbookingsystem-wpmnar3hm-shikis-projects-6e27447a.vercel.app
- **解決策:** 環境変数クリア + vercel.json修正

**実施した修正:**
1. VERCEL_PROJECT_ID/VERCEL_ORG_ID環境変数をクリア
2. vercel.jsonでbuilds/functions競合エラーを修正
3. 個人アカウント用のシンプル設定に変更

**結果:** デプロイ成功・ウォッチリスト機能動作確認済み

---

## 🔔 全チームメンバーへの緊急アナウンス

### 🚨 Vercel デプロイエラー発生・解決完了

**エラー概要:**
- VERCEL_ORG_ID設定エラーによるデプロイ失敗
- builds/functions競合によるVercel設定エラー

**✅ 解決済み・今後の対策:**
1. **個人アカウントの場合** → VERCEL_PROJECT_ID/VERCEL_ORG_IDは設定しない
2. **vercel.json設定** → buildsまたはfunctionsのどちらか一方のみ使用
3. **エラー対策ファイル** → このファイルを参照して対応

**📋 チーム内での共有事項:**
- 同様のエラーが発生した場合は、まずこのファイルを確認
- 個人アカウントでは環境変数設定は不要
- Vercel設定ファイルの競合に注意

**🎯 現在の状況:**
- ✅ デプロイ成功
- ✅ ウォッチリスト機能動作確認済み  
- ✅ 本番環境でのAI機能実装完了

---

**📅 最終更新:** 2025-07-05  
**📝 作成者:** worker1  
**🎯 対象:** 全チームメンバー  
**🔔 重要度:** 高  
**🚀 ステータス:** 解決済み