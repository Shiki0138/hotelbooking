const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const API_PORT = 3001;

// CORS設定
app.use(cors());
app.use(express.json());

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'frontend/public')));
app.use('/src', express.static(path.join(__dirname, 'frontend/src')));

console.log('🚀 LastMinuteStay ローカル開発サーバー起動中...');

// ルートページ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

// テストページ
app.get('/test-phase1.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-phase1.html'));
});

app.get('/test-phase2.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-phase2.html'));
});

app.get('/local-test.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'local-test.html'));
});

// API プロキシ（API サーバーへの転送）
app.use('/api', (req, res) => {
    const apiUrl = `http://localhost:${API_PORT}${req.originalUrl}`;
    console.log(`🔌 API リクエスト: ${req.method} ${apiUrl}`);
    
    // 簡単なプロキシ実装
    res.json({
        message: 'ローカルAPI開発中',
        endpoint: req.originalUrl,
        method: req.method,
        note: 'APIサーバーをポート3001で起動してください'
    });
});

app.listen(PORT, () => {
    console.log('✅ フロントエンドサーバー起動完了');
    console.log(`🌐 メインサイト: http://localhost:${PORT}`);
    console.log(`🧪 Phase1テスト: http://localhost:${PORT}/test-phase1.html`);
    console.log(`🧪 Phase2テスト: http://localhost:${PORT}/test-phase2.html`);
    console.log(`🔧 ローカルテスト: http://localhost:${PORT}/local-test.html`);
    console.log('');
    console.log('📝 注意: APIサーバーをポート3001で起動してください');
    console.log('   npm run api-server または node api-server.js');
});