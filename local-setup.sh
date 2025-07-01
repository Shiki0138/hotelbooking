#!/bin/bash

echo "🚀 LastMinuteStay ローカル環境セットアップ"
echo "==========================================="

# 1. 依存関係のインストール
echo ""
echo "📦 依存関係のインストール中..."

# ルートレベルの依存関係（軽量化）
echo "ルートレベルの依存関係をインストール..."
npm install --ignore-scripts 2>/dev/null || echo "ルートレベルのnpm installでエラーが発生しましたが続行します"

# フロントエンドの依存関係
echo ""
echo "フロントエンドの依存関係をインストール..."
cd frontend
npm install --ignore-scripts 2>/dev/null || echo "フロントエンドのnpm installでエラーが発生しましたが続行します"
cd ..

# 2. 環境変数の確認
echo ""
echo "🔧 環境変数の確認..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local が設定済みです"
    echo "設定内容:"
    grep -E "^[A-Z_]+=" .env.local | head -5
else
    echo "❌ .env.local が見つかりません"
fi

# 3. 必要なディレクトリの作成
echo ""
echo "📁 必要なディレクトリを作成..."
mkdir -p tmp
mkdir -p logs
mkdir -p frontend/dist

# 4. ローカルサーバー用のスクリプト作成
echo ""
echo "🖥️ ローカルサーバースクリプトを作成..."

cat > start-local.sh << 'EOF'
#!/bin/bash

echo "🌐 LastMinuteStay ローカルサーバーを起動中..."

# ポートの確認とクリーンアップ
echo "ポート3000をクリーンアップ中..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "ポート3000は使用されていません"

# 環境変数の確認
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local が見つかりません。先にlocal-setup.shを実行してください。"
    exit 1
fi

# フロントエンドサーバーの起動
echo ""
echo "フロントエンドサーバーを http://localhost:3000 で起動中..."
cd frontend

# Viteサーバーまたは簡易サーバーを起動
if command -v npx >/dev/null 2>&1; then
    echo "Vite開発サーバーを起動..."
    npx vite --port 3000 --host localhost 2>/dev/null &
    FRONTEND_PID=$!
else
    echo "簡易HTTPサーバーを起動..."
    python3 -m http.server 3000 2>/dev/null &
    FRONTEND_PID=$!
fi

cd ..

echo ""
echo "✅ サーバー起動完了!"
echo ""
echo "🌐 アクセスURL:"
echo "   メイン: http://localhost:3000"
echo "   テスト1: http://localhost:3000/test-phase1.html"
echo "   テスト2: http://localhost:3000/test-phase2.html"
echo ""
echo "⚠️  注意: APIエンドポイントはダミーデータを返します"
echo ""
echo "🛑 サーバーを停止するには Ctrl+C を押してください"

# プロセス終了時の処理
cleanup() {
    echo ""
    echo "🛑 サーバーを停止中..."
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ サーバーが停止されました"
    exit 0
}

trap cleanup SIGINT SIGTERM

# サーバーの稼働を待機
wait $FRONTEND_PID
EOF

chmod +x start-local.sh

# 5. APIモックサーバーの作成
echo ""
echo "🔌 APIモックサーバーを作成..."

cat > api-mock-server.js << 'EOF'
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    // CORS対応
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    // モックレスポンス
    let response = {};
    
    if (path === '/api/health') {
        response = { status: 'ok', message: 'Mock API Server Running' };
    } else if (path.startsWith('/api/search/rakuten')) {
        response = {
            success: true,
            hotels: [
                {
                    id: 'mock-hotel-1',
                    name: 'ザ・リッツ・カールトン東京（モック）',
                    address: '東京都港区赤坂9-7-1',
                    price: 45000,
                    stars: 5,
                    image: 'https://via.placeholder.com/300x200'
                },
                {
                    id: 'mock-hotel-2', 
                    name: 'パークハイアット東京（モック）',
                    address: '東京都新宿区西新宿3-7-1-2',
                    price: 38000,
                    stars: 5,
                    image: 'https://via.placeholder.com/300x200'
                }
            ]
        };
    } else if (path.startsWith('/api/auth/')) {
        response = { success: true, message: 'Mock authentication successful' };
    } else if (path.startsWith('/api/preferences/')) {
        response = { success: true, preferences: [], message: 'Mock preferences' };
    } else if (path.startsWith('/api/email/')) {
        response = { success: true, messageId: 'mock-email-id', message: 'Mock email sent' };
    } else {
        response = { error: 'Mock API - Endpoint not found' };
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🔌 Mock API Server running on http://localhost:${PORT}`);
});
EOF

# 6. 簡易テストページの作成
echo ""
echo "🧪 ローカルテストページを作成..."

cat > local-test.html << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LastMinuteStay - ローカルテスト</title>
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; }
        .success { background: #4caf50; color: white; }
        .error { background: #f44336; color: white; }
        button { background: #2196f3; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .result { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; max-height: 300px; overflow-y: auto; }
    </style>
</head>
<body>
    <h1>🏨 LastMinuteStay ローカルテスト</h1>
    
    <div class="container">
        <h2>🔍 システム状態</h2>
        <p>API サーバー: <span id="apiStatus" class="status error">未確認</span></p>
        <p>フロントエンド: <span id="frontendStatus" class="status success">稼働中</span></p>
        <button onclick="checkAPI()">API接続テスト</button>
    </div>
    
    <div class="container">
        <h2>🔌 APIテスト</h2>
        <button onclick="testHealth()">ヘルスチェック</button>
        <button onclick="testHotelSearch()">ホテル検索</button>
        <button onclick="testAuth()">認証テスト</button>
        <div id="apiResult" class="result"></div>
    </div>
    
    <div class="container">
        <h2>🌐 ページリンク</h2>
        <a href="/" target="_blank">トップページ</a> |
        <a href="/test-phase1.html" target="_blank">Phase 1テスト</a> |
        <a href="/test-phase2.html" target="_blank">Phase 2テスト</a>
    </div>

    <script>
        const API_BASE = 'http://localhost:3001';
        
        async function checkAPI() {
            try {
                const response = await fetch(`${API_BASE}/api/health`);
                const data = await response.json();
                document.getElementById('apiStatus').textContent = '接続成功';
                document.getElementById('apiStatus').className = 'status success';
            } catch (error) {
                document.getElementById('apiStatus').textContent = '接続失敗';
                document.getElementById('apiStatus').className = 'status error';
            }
        }
        
        async function testHealth() {
            showResult('ヘルスチェック実行中...');
            try {
                const response = await fetch(`${API_BASE}/api/health`);
                const data = await response.json();
                showResult(`✅ ヘルスチェック成功\n${JSON.stringify(data, null, 2)}`);
            } catch (error) {
                showResult(`❌ ヘルスチェック失敗\n${error.message}`);
            }
        }
        
        async function testHotelSearch() {
            showResult('ホテル検索実行中...');
            try {
                const response = await fetch(`${API_BASE}/api/search/rakuten?prefecture=東京都`);
                const data = await response.json();
                showResult(`✅ ホテル検索成功\n${JSON.stringify(data, null, 2)}`);
            } catch (error) {
                showResult(`❌ ホテル検索失敗\n${error.message}`);
            }
        }
        
        async function testAuth() {
            showResult('認証テスト実行中...');
            try {
                const response = await fetch(`${API_BASE}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'test@example.com', password: 'test123' })
                });
                const data = await response.json();
                showResult(`✅ 認証テスト成功\n${JSON.stringify(data, null, 2)}`);
            } catch (error) {
                showResult(`❌ 認証テスト失敗\n${error.message}`);
            }
        }
        
        function showResult(text) {
            document.getElementById('apiResult').innerHTML = `<pre>${text}</pre>`;
        }
        
        // 自動チェック
        checkAPI();
    </script>
</body>
</html>
EOF

echo ""
echo "✅ ローカル環境セットアップ完了!"
echo ""
echo "🚀 次のステップ:"
echo "1. ./start-local.sh でローカルサーバーを起動"
echo "2. http://localhost:3000/local-test.html でテスト実行"
echo "3. 必要に応じて node api-mock-server.js でAPIモックサーバーを起動"
echo ""
echo "📂 作成されたファイル:"
echo "   - .env.local (環境変数)"
echo "   - start-local.sh (サーバー起動スクリプト)"
echo "   - api-mock-server.js (APIモックサーバー)"
echo "   - local-test.html (テストページ)"