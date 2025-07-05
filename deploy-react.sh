#!/bin/bash
set -e

echo "🚀 Deploying React version with new features..."

# Copy React configuration files
cp frontend/package-minimal.json frontend/package.json
cp frontend/vite.config.minimal.ts frontend/vite.config.ts
cp frontend/index-final.html frontend/index.html
cp frontend/src/main-final.tsx frontend/src/main.tsx
cp frontend/src/App-final.tsx frontend/src/App.tsx

echo "✅ Configuration files copied"

# Build React app
cd frontend
npm install
npm run build

echo "✅ React app built successfully"