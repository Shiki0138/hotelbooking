import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'classic',
    jsxImportSource: undefined,
    babel: {
      plugins: [
        ['@babel/plugin-transform-react-jsx', {
          runtime: 'classic'
        }]
      ]
    }
  })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom']
        }
      }
    }
  },
  base: '/',
  server: {
    port: 8080,
    strictPort: true
  },
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    jsxInject: `import React from 'react'`
  },
  resolve: {
    alias: {
      'react/jsx-runtime': 'react',
      'react/jsx-dev-runtime': 'react'
    }
  }
})