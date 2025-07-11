#!/bin/bash

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Quick Deploy Check${NC}\n"

# エラーカウンター
errors=0
warnings=0

# フロントエンドチェック
echo -e "${BLUE}=== Frontend Checks ===${NC}"
cd frontend

# 必須ファイルチェック
echo "Checking required files..."
files=("package.json" "vite.config.ts" "index.html" "src/main.tsx" "src/App.tsx")
for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}✗ Missing: $file${NC}"
    ((errors++))
  fi
done

# ビルドテスト
echo "Testing build..."
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Frontend build successful${NC}"
else
  echo -e "${RED}✗ Frontend build failed${NC}"
  ((errors++))
fi

cd ..

# バックエンドチェック
echo -e "\n${BLUE}=== Backend Checks ===${NC}"
cd backend

# 必須ファイルチェック
echo "Checking required files..."
files=("package.json" "tsconfig.json" "src/test-server.ts")
for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}✗ Missing: $file${NC}"
    ((errors++))
  fi
done

# TypeScriptコンパイルチェック
echo "Checking TypeScript compilation..."
if npx tsc --noEmit > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Backend TypeScript OK${NC}"
else
  echo -e "${YELLOW}⚠ Backend TypeScript has issues${NC}"
  ((warnings++))
fi

cd ..

# 環境変数チェック
echo -e "\n${BLUE}=== Environment Variables ===${NC}"
if [ ! -f "frontend/.env" ]; then
  echo -e "${YELLOW}⚠ No frontend/.env file${NC}"
  ((warnings++))
fi
if [ ! -f "backend/.env" ]; then
  echo -e "${YELLOW}⚠ No backend/.env file${NC}"
  ((warnings++))
fi

# 結果
echo -e "\n${BLUE}=== Summary ===${NC}"
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
else
  echo -e "Found ${RED}$errors errors${NC} and ${YELLOW}$warnings warnings${NC}"
  if [ $errors -gt 0 ]; then
    echo -e "${RED}❌ Fix errors before deploying${NC}"
    exit 1
  else
    echo -e "${YELLOW}⚠ Review warnings before deploying${NC}"
    exit 0
  fi
fi