# 緊急404修正手順

## 方法1: Vercelダッシュボードで確認

1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. 「Functions」タブでエラーを確認
4. 「Settings」→「General」でRoot Directoryが空白であることを確認

## 方法2: 手動再デプロイ

1. Vercelダッシュボードから：
   - 「Deployments」タブ
   - 最新のデプロイメントの「...」メニュー
   - 「Redeploy」をクリック

## 方法3: プロジェクト再作成

1. 現在のプロジェクトを削除
2. 新規プロジェクトとして再インポート
3. Root Directory: 空白のまま
4. Framework Preset: Other

## 確認URL

- メインページ: https://hotelbookingsystem-seven.vercel.app/
- テストページ: https://hotelbookingsystem-seven.vercel.app/test.html
- API: https://hotelbookingsystem-seven.vercel.app/api/health

## 代替デプロイ（即座に動作）

もし404が続く場合：
```bash
npx vercel --prod
```

または、Netlifyへの即時移行：
```bash
# Netlifyにドラッグ&ドロップでデプロイ
# https://app.netlify.com/drop
```