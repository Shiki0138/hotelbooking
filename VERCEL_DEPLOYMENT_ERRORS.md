# Vercel デプロイメントエラー記録

## エラー1: VERCEL_ORG_ID が必要
**発生日時**: 2025-07-05  
**エラーメッセージ**: 
```
Error: You specified `VERCEL_PROJECT_ID` but you forgot to specify `VERCEL_ORG_ID`. 
You need to specify both to deploy to a custom project.
```

**原因**: 
- GitHub Actionsで`VERCEL_PROJECT_ID`環境変数を設定していたため
- 個人アカウントでは`VERCEL_ORG_ID`は不要だが、`VERCEL_PROJECT_ID`を指定すると`VERCEL_ORG_ID`も必要と判定される

**対策**: 
- `VERCEL_PROJECT_ID`と`VERCEL_ORG_ID`の環境変数設定を削除
- `.vercel/project.json`から`orgId`を削除（個人アカウント用）
- Vercel CLIにプロジェクト検出を委ねる

**コミット**: 32517b7, 50f9099

---

## エラー2: AWS認証エラー
**発生日時**: 2025-07-05  
**エラーメッセージ**: 
```
aws-actions/configure-aws-credentials@v4
Error: Credentials could not be loaded, please check your action inputs: 
Could not load credentials from any providers
```

**原因**: 
- `.github/workflows/production-deploy.yml`という古いAWS ECS用ワークフローが存在
- AWS認証情報が設定されていないため失敗
- 現在はVercelを使用しているためAWSは不要

**対策**: 
- `production-deploy.yml`を`production-deploy.yml.disabled`にリネーム
- GitHub Actionsでは実行されないが、参照用に保持

**コミット**: 9c9cc50

---

## エラー3: vercel deploy 確認エラー
**発生日時**: 2025-07-05  
**エラーメッセージ**: 
```
Error: Command `vercel deploy` requires confirmation. Use option "--yes" to confirm.
```

**原因**: 
- `vercel deploy`コマンドは対話式確認を要求
- GitHub ActionsのCI/CD環境では対話式入力ができない
- `--yes`フラグで自動確認が必要

**対策**: 
- プレビューデプロイ: `vercel deploy --yes --token=TOKEN`
- 本番デプロイ: `vercel deploy --yes --prod --token=TOKEN`

**修正ファイル**: 
- `.github/workflows/deploy.yml`

**コミット**: 未実施（次回修正予定）

---

## 個人アカウント用 最終設定

### 必要なGitHub Secrets:
```
VERCEL_TOKEN=your_vercel_token_here
```

### 不要な設定:
- ❌ `VERCEL_PROJECT_ID`
- ❌ `VERCEL_ORG_ID`  
- ❌ `VERCEL_SCOPE`

### 正しいコマンド:
```bash
# プレビュー
vercel deploy --yes --token=TOKEN

# 本番
vercel deploy --yes --prod --token=TOKEN
```

### 参考資料:
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [GitHub Actions with Vercel](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)