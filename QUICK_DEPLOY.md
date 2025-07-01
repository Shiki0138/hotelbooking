# 緊急デプロイ手順 - LastMinuteStay

## 現在の状況
✅ UIは完成済み（frontend/dist/index.html）
✅ ホテル検索機能動作確認済み
✅ モックデータで10件のホテル表示

## 最速デプロイ方法（Vercel Web UI使用）

### 手順:
1. https://vercel.com にアクセス
2. 「Add New...」→「Project」をクリック
3. 「Import Third-Party Git Repository」の下の「Continue with CLI/Directory Upload」を選択
4. ドラッグ&ドロップエリアが表示される
5. **frontend/dist**フォルダをドラッグ&ドロップ
6. Project Name: `lastminutestay`
7. 「Deploy」をクリック

## デプロイ後の確認
- URL: https://lastminutestay.vercel.app
- 確認項目:
  - ✅ トップページ表示
  - ✅ 10件のホテル表示
  - ✅ 検索機能（東京、京都、大阪）
  - ✅ 予約ボタン

## 代替方法（GitHub経由）
```bash
cd /Users/leadfive/Desktop/system/hotelbooking
git add frontend/dist/index.html frontend/vercel.json
git commit -m "Deploy working UI to production"
git push origin main
```
その後Vercelで「Import Git Repository」を選択