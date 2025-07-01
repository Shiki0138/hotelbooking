# Vite依存関係404エラーの解決方法

## 問題の根本原因

1. **開発環境とビルド環境の不一致**
   - 開発時: Viteは`node_modules/.vite/deps/`から依存関係を提供
   - ビルド後: すべての依存関係は`dist/assets/`にバンドルされる
   - 問題: 何らかの理由で古い開発用パスへの参照が残っている

2. **バージョンハッシュの不一致**
   - エラーで表示される`v=91838c71`は存在しない
   - 現在の_metadata.jsonのハッシュは`ea50bd44`
   - Service Workerまたはブラウザキャッシュが古いバージョンを保持

3. **Service Workerの影響**
   - Service Workerが古いファイルパスをキャッシュ
   - Viteの開発サーバーとService Workerの間でリソース競合

## 即時解決策

### 方法1: 自動修復スクリプトの実行

```bash
# 修復スクリプトを実行
./fix-vite-deps.sh

# ブラウザでキャッシュクリアページを開く
open http://localhost:8080/hotelbooking/clear-cache.html

# 開発サーバーを再起動
npm run dev
```

### 方法2: 手動でのクリーンアップ

1. **Viteキャッシュの削除**
   ```bash
   rm -rf node_modules/.vite
   rm -rf dist
   ```

2. **ブラウザのキャッシュクリア**
   - Chrome DevTools → Application → Storage → Clear site data
   - またはCtrl+Shift+R（Mac: Cmd+Shift+R）

3. **Service Workerの無効化（一時的）**
   ```javascript
   // vite.config.jsに追加
   export default defineConfig({
     // ... 既存の設定
     server: {
       headers: {
         'Service-Worker-Allowed': '/'
       }
     }
   });
   ```

4. **依存関係の再インストール**
   ```bash
   npm ci
   npm run dev
   ```

## 長期的な解決策

### 1. Vite設定の最適化

```javascript
// vite.config.js
export default defineConfig({
  // 依存関係の事前バンドルを強制
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      // ... その他の依存関係
    ],
    force: true // キャッシュを無視して再バンドル
  },
  
  // ビルド設定の最適化
  build: {
    manifest: true, // マニフェストファイルを生成
    sourcemap: true, // デバッグ用ソースマップ
    rollupOptions: {
      output: {
        // ファイル名にハッシュを含める
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});
```

### 2. Service Worker戦略の改善

```javascript
// sw.js - 開発環境での無効化
if (process.env.NODE_ENV === 'development') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => self.clients.claim());
  return;
}

// キャッシュバージョン管理
const CACHE_VERSION = 'v2';
const CACHE_NAME = `app-${CACHE_VERSION}`;

// Vite関連のパスをキャッシュから除外
const shouldCache = (url) => {
  return !url.includes('/.vite/') && 
         !url.includes('/node_modules/') &&
         !url.includes('/@vite/');
};
```

### 3. 開発環境のベストプラクティス

1. **定期的なキャッシュクリア**
   ```bash
   # package.jsonにスクリプトを追加
   "scripts": {
     "clean": "rm -rf node_modules/.vite dist",
     "dev:fresh": "npm run clean && npm run dev"
   }
   ```

2. **環境変数による制御**
   ```javascript
   // .env.development
   VITE_DISABLE_SW=true
   
   // main.jsx
   if (import.meta.env.VITE_DISABLE_SW !== 'true') {
     // Service Workerを登録
   }
   ```

## トラブルシューティング

### 問題が継続する場合

1. **完全なクリーンインストール**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Viteのバージョン確認**
   ```bash
   npm list vite
   # 最新版へアップデート
   npm update vite @vitejs/plugin-react
   ```

3. **ポートの競合確認**
   ```bash
   lsof -i :8080
   # 他のプロセスが使用している場合は終了
   ```

4. **ネットワークタブでの確認**
   - DevTools → Network → 404エラーのリクエストを確認
   - Initiatorを確認して、どのファイルから呼ばれているか特定

## 予防策

1. **CI/CDパイプラインでのキャッシュクリア**
2. **ビルド時のハッシュ値管理**
3. **Service Workerのバージョニング戦略**
4. **定期的な依存関係の更新**

この問題は、モダンなWebアプリケーション開発でよく遭遇する、開発環境とプロダクション環境の違いに起因するものです。適切なキャッシュ管理とビルド設定により、完全に解決可能です。