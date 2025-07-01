// Vercel用ビルドスクリプト
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Vercelビルドを開始...');

// ビルドディレクトリの作成
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 静的ファイルのコピー
const publicFiles = ['index.html', 'favicon.ico', 'manifest.json'];
publicFiles.forEach(file => {
  const src = path.join(__dirname, 'public', file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ コピー: ${file}`);
  }
});

// srcディレクトリのコピー
const srcDir = path.join(__dirname, 'src');
const destSrcDir = path.join(distDir, 'src');
if (fs.existsSync(srcDir)) {
  fs.cpSync(srcDir, destSrcDir, { recursive: true });
  console.log('✅ srcディレクトリをコピー');
}

// テストファイルのコピー
const testFiles = ['test-phase1.html', 'test-phase2.html'];
testFiles.forEach(file => {
  const src = path.join(__dirname, '..', file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ コピー: ${file}`);
  }
});

// package.jsonの調整
const packageJson = {
  name: "lastminutestay-frontend",
  version: "1.0.0",
  private: true,
  scripts: {
    start: "serve -s ."
  },
  dependencies: {
    "serve": "^14.0.0"
  }
};

fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('✅ Vercelビルド完了!');