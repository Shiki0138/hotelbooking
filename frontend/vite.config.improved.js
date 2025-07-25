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
    },
    // Disable HMR in development if service worker issues persist
    // hmr: false
  },
  
  preview: {
    port: 8080,
    strictPort: true
  },
  
  build: {
    // Performance optimizations
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          framer: ['framer-motion'],
          ui: ['@mui/material', '@emotion/react', '@emotion/styled']
        },
        // Add hash to filenames for cache busting
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`
      }
    },
    // Generate manifest for service worker
    manifest: true,
    // Bundle size optimization
    chunkSizeWarningLimit: 1000,
    sourcemap: false
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
  },
  
  // PWA and caching optimizations
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    // Add service worker version
    'process.env.SW_VERSION': JSON.stringify('2.0.0')
  }
});