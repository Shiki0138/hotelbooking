#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// カラーコード
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// エラーと警告のカウンター
let errors = 0;
let warnings = 0;

// ログ関数
function log(message, type = 'info') {
  const prefix = {
    error: `${colors.red}✗ ERROR:${colors.reset}`,
    warning: `${colors.yellow}⚠ WARNING:${colors.reset}`,
    success: `${colors.green}✓ SUCCESS:${colors.reset}`,
    info: `${colors.blue}ℹ INFO:${colors.reset}`,
    section: `${colors.cyan}▶ ${message}${colors.reset}`
  };
  
  if (type === 'section') {
    console.log('\n' + prefix[type]);
  } else {
    console.log(prefix[type] + ' ' + message);
  }
  
  if (type === 'error') errors++;
  if (type === 'warning') warnings++;
}

// コマンド実行関数
function runCommand(command, cwd = '.', showOutput = false) {
  try {
    const output = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: showOutput ? 'inherit' : 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ファイル存在チェック
function checkFileExists(filePath, required = true) {
  const exists = fs.existsSync(filePath);
  if (!exists && required) {
    log(`Required file missing: ${filePath}`, 'error');
  } else if (!exists) {
    log(`Optional file missing: ${filePath}`, 'warning');
  }
  return exists;
}

// JSONファイルの検証
function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return true;
  } catch (error) {
    log(`Invalid JSON in ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

// 環境変数チェック
function checkEnvVars(envExample, envFile) {
  if (!fs.existsSync(envExample)) {
    log(`No .env.example file found at ${envExample}`, 'warning');
    return;
  }
  
  const exampleVars = fs.readFileSync(envExample, 'utf8')
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim())
    .filter(v => v);
  
  if (!fs.existsSync(envFile)) {
    log(`No .env file found at ${envFile}`, 'error');
    log(`Required environment variables: ${exampleVars.join(', ')}`, 'info');
    return;
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  const envVars = envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim())
    .filter(v => v);
  
  exampleVars.forEach(varName => {
    if (!envVars.includes(varName)) {
      log(`Missing environment variable: ${varName}`, 'warning');
    }
  });
}

// TypeScriptエラーチェック
function checkTypeScript(projectPath) {
  log('Checking TypeScript compilation...', 'section');
  
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  if (!checkFileExists(tsconfigPath)) {
    return;
  }
  
  const result = runCommand('npx tsc --noEmit', projectPath);
  if (result.success) {
    log('TypeScript compilation successful', 'success');
  } else {
    log('TypeScript compilation failed', 'error');
    console.log(result.error);
  }
}

// ESLintチェック
function checkESLint(projectPath) {
  log('Checking ESLint...', 'section');
  
  const eslintConfig = ['.eslintrc.js', '.eslintrc.json', '.eslintrc'].find(
    file => fs.existsSync(path.join(projectPath, file))
  );
  
  if (!eslintConfig) {
    log('No ESLint configuration found', 'warning');
    return;
  }
  
  const result = runCommand('npx eslint . --ext .ts,.tsx,.js,.jsx', projectPath);
  if (result.success) {
    log('ESLint check passed', 'success');
  } else {
    log('ESLint errors found', 'warning');
  }
}

// 依存関係チェック
function checkDependencies(projectPath) {
  log('Checking dependencies...', 'section');
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!checkFileExists(packageJsonPath)) {
    return;
  }
  
  // package-lock.jsonの存在確認
  const lockFile = path.join(projectPath, 'package-lock.json');
  if (!checkFileExists(lockFile, false)) {
    log('No package-lock.json found. Run npm install to generate it.', 'warning');
  }
  
  // 未使用の依存関係チェック
  const result = runCommand('npx depcheck', projectPath);
  if (result.success && result.output.includes('No depcheck issue')) {
    log('No unused dependencies found', 'success');
  } else if (result.output) {
    log('Found potential dependency issues', 'warning');
  }
}

// ビルドテスト
function testBuild(projectPath, buildCommand = 'npm run build') {
  log('Testing build process...', 'section');
  
  const result = runCommand(buildCommand, projectPath);
  if (result.success) {
    log('Build successful', 'success');
    
    // ビルド出力の確認
    const distPath = path.join(projectPath, 'dist');
    const buildPath = path.join(projectPath, 'build');
    
    if (fs.existsSync(distPath) || fs.existsSync(buildPath)) {
      log('Build output found', 'success');
    } else {
      log('Build output directory not found', 'warning');
    }
  } else {
    log('Build failed', 'error');
    console.log(result.error);
  }
}

// Vercel設定チェック
function checkVercelConfig(projectPath) {
  log('Checking Vercel configuration...', 'section');
  
  const vercelJsonPath = path.join(projectPath, 'vercel.json');
  if (checkFileExists(vercelJsonPath, false)) {
    if (validateJSON(vercelJsonPath)) {
      log('vercel.json is valid', 'success');
    }
  }
  
  // .vercelignoreチェック
  const vercelIgnorePath = path.join(projectPath, '.vercelignore');
  if (checkFileExists(vercelIgnorePath, false)) {
    log('.vercelignore found', 'success');
  }
}

// フロントエンドチェック
function checkFrontend() {
  console.log(colors.magenta + '\n=== FRONTEND CHECKS ===' + colors.reset);
  
  const frontendPath = path.join(__dirname, 'frontend');
  
  // 基本ファイルチェック
  log('Checking required files...', 'section');
  checkFileExists(path.join(frontendPath, 'package.json'));
  checkFileExists(path.join(frontendPath, 'vite.config.ts'));
  checkFileExists(path.join(frontendPath, 'index.html'));
  checkFileExists(path.join(frontendPath, 'src/main.tsx'));
  checkFileExists(path.join(frontendPath, 'src/App.tsx'));
  
  // 環境変数チェック
  log('Checking environment variables...', 'section');
  checkEnvVars(
    path.join(frontendPath, '.env.example'),
    path.join(frontendPath, '.env')
  );
  
  // TypeScriptチェック
  checkTypeScript(frontendPath);
  
  // 依存関係チェック
  checkDependencies(frontendPath);
  
  // ビルドテスト
  testBuild(frontendPath);
  
  // Vercel設定チェック
  checkVercelConfig(frontendPath);
}

// バックエンドチェック
function checkBackend() {
  console.log(colors.magenta + '\n=== BACKEND CHECKS ===' + colors.reset);
  
  const backendPath = path.join(__dirname, 'backend');
  
  // 基本ファイルチェック
  log('Checking required files...', 'section');
  checkFileExists(path.join(backendPath, 'package.json'));
  checkFileExists(path.join(backendPath, 'tsconfig.json'));
  checkFileExists(path.join(backendPath, 'src/index.ts'));
  
  // 環境変数チェック
  log('Checking environment variables...', 'section');
  checkEnvVars(
    path.join(backendPath, '.env.example'),
    path.join(backendPath, '.env')
  );
  
  // TypeScriptチェック
  checkTypeScript(backendPath);
  
  // 依存関係チェック
  checkDependencies(backendPath);
  
  // ビルドテスト
  testBuild(backendPath);
  
  // Vercel設定チェック
  checkVercelConfig(backendPath);
}

// 共通チェック
function checkCommon() {
  console.log(colors.magenta + '\n=== COMMON CHECKS ===' + colors.reset);
  
  // Gitチェック
  log('Checking Git status...', 'section');
  const gitStatus = runCommand('git status --porcelain');
  if (gitStatus.success && !gitStatus.output.trim()) {
    log('Git working directory is clean', 'success');
  } else {
    log('Uncommitted changes found', 'warning');
  }
  
  // .gitignoreチェック
  if (checkFileExists('.gitignore')) {
    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    const requiredIgnores = ['node_modules', '.env', 'dist', 'build', '.DS_Store'];
    requiredIgnores.forEach(pattern => {
      if (!gitignoreContent.includes(pattern)) {
        log(`.gitignore should include: ${pattern}`, 'warning');
      }
    });
  }
}

// メインの実行関数
function main() {
  console.log(colors.cyan + '🚀 Deploy Readiness Check\n' + colors.reset);
  
  checkCommon();
  checkFrontend();
  checkBackend();
  
  // 結果のサマリー
  console.log(colors.cyan + '\n=== SUMMARY ===' + colors.reset);
  
  if (errors === 0 && warnings === 0) {
    console.log(colors.green + '✅ All checks passed! Ready for deployment.' + colors.reset);
  } else {
    console.log(`Found ${colors.red}${errors} errors${colors.reset} and ${colors.yellow}${warnings} warnings${colors.reset}`);
    
    if (errors > 0) {
      console.log(colors.red + '\n❌ Please fix all errors before deploying.' + colors.reset);
      process.exit(1);
    } else {
      console.log(colors.yellow + '\n⚠️  Warnings found. Review them before deploying.' + colors.reset);
    }
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}