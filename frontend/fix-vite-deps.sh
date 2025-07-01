#!/bin/bash

# Vite依存関係の404エラーを解決するスクリプト

echo "🔧 Viteの依存関係問題を解決しています..."

# 1. 古いキャッシュをクリア
echo "📦 キャッシュをクリアしています..."
rm -rf node_modules/.vite
rm -rf dist

# 2. Service Workerのキャッシュをクリア
echo "🧹 Service Workerのキャッシュをクリアしています..."
cat > public/clear-cache.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>キャッシュクリア</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>キャッシュをクリアしています...</h1>
    <div id="status"></div>
    <script>
    async function clearAllCaches() {
        const status = document.getElementById('status');
        
        // Service Workerを登録解除
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
                status.innerHTML += '<p>Service Worker登録解除: ' + registration.scope + '</p>';
            }
        }
        
        // すべてのキャッシュを削除
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (let name of cacheNames) {
                await caches.delete(name);
                status.innerHTML += '<p>キャッシュ削除: ' + name + '</p>';
            }
        }
        
        // ローカルストレージもクリア
        localStorage.clear();
        sessionStorage.clear();
        
        status.innerHTML += '<p style="color: green;">✅ すべてのキャッシュをクリアしました！</p>';
        status.innerHTML += '<p>3秒後にリダイレクトします...</p>';
        
        setTimeout(() => {
            window.location.href = '/hotelbooking/';
        }, 3000);
    }
    
    clearAllCaches();
    </script>
</body>
</html>
EOF

# 3. Viteの設定を最適化
echo "⚙️ Vite設定を更新しています..."
cat > vite.config.optimized.js << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/hotelbooking/',
  
  server: {
    port: 8080,
    strictPort: true,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  preview: {
    port: 8080,
    strictPort: true
  },
  
  build: {
    // キャッシュバスティングを有効化
    manifest: true,
    // ソースマップを生成（デバッグ用）
    sourcemap: true,
    // ロールアップオプション
    rollupOptions: {
      output: {
        // アセット名にハッシュを含める
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // マニュアルチャンク
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          framer: ['framer-motion'],
          ui: ['@mui/material', '@emotion/react', '@emotion/styled']
        }
      }
    }
  },
  
  // 依存関係の最適化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'framer-motion',
      '@mui/material',
      '@mui/icons-material',
      'axios',
      'date-fns',
      'canvas-confetti',
      'react-icons/fa',
      'react-icons/md'
    ],
    // 強制的に事前バンドル
    force: true
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@config': path.resolve(__dirname, './src/config')
    }
  }
});
EOF

# 4. 依存関係を再インストール
echo "📦 依存関係を再インストールしています..."
npm ci

# 5. 開発サーバーを再起動
echo "🚀 開発サーバーを起動しています..."
echo ""
echo "⚠️  重要な手順:"
echo "1. ブラウザで http://localhost:8080/hotelbooking/clear-cache.html を開いてキャッシュをクリア"
echo "2. ブラウザの開発者ツール → Application → Clear storage → Clear site data"
echo "3. Ctrl+Shift+R (Cmd+Shift+R on Mac) でハード再読み込み"
echo ""
echo "その後、以下のコマンドで開発サーバーを起動:"
echo "npm run dev"