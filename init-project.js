const { execSync } = require('child_process');
const path = require('path');

// Clean up and create project directory
execSync('rm -rf lastminutestay', { stdio: 'inherit' });
execSync('mkdir lastminutestay', { stdio: 'inherit' });

// Change to project directory
process.chdir(path.join(__dirname, 'lastminutestay'));

// Create Next.js app with all defaults
execSync('npx --yes create-next-app@latest . --typescript --tailwind --app --use-npm --no-src-dir --import-alias "@/*" --eslint --turbopack', {
  stdio: 'inherit'
});