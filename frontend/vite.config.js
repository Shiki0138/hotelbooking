import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Fallback JavaScript configuration for Vite
// This ensures Vite will run on port 8080 regardless of which config file is used

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/',
  
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
    // Performance optimizations
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
        }
      }
    },
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
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
});