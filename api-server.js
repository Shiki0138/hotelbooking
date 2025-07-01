const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// ログ機能
const log = (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
};

console.log('🔌 LastMinuteStay APIサーバー起動中...');

// ヘルスチェック
app.get('/api/health', (req, res) => {
    log('Health check requested');
    res.json({
        status: 'ok',
        message: 'LastMinuteStay API Server Running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 認証API
app.post('/api/auth/signup', (req, res) => {
    log('Signup request received');
    const { email, password, fullName } = req.body;
    
    // 基本的なバリデーション
    if (!email || !password) {
        return res.status(400).json({
            error: 'メールアドレスとパスワードが必要です'
        });
    }
    
    res.json({
        success: true,
        message: 'ユーザー登録が完了しました',
        user: {
            id: 'mock-user-' + Date.now(),
            email: email,
            fullName: fullName || 'テストユーザー',
            createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token-' + Date.now()
    });
});

app.post('/api/auth/login', (req, res) => {
    log('Login request received');
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            error: 'メールアドレスとパスワードが必要です'
        });
    }
    
    res.json({
        success: true,
        message: 'ログインに成功しました',
        user: {
            id: 'mock-user-12345',
            email: email,
            fullName: 'テストユーザー'
        },
        token: 'mock-jwt-token-' + Date.now()
    });
});

// ホテル検索API
app.get('/api/search/rakuten', (req, res) => {
    log('Hotel search request received');
    const { prefecture, checkIn, checkOut, guests } = req.query;
    
    // モックホテルデータ
    const mockHotels = [
        {
            id: 'hotel-001',
            name: 'ザ・リッツ・カールトン東京',
            nameEn: 'The Ritz-Carlton Tokyo',
            address: '東京都港区赤坂9-7-1',
            prefecture: '東京都',
            city: '港区',
            stars: 5,
            price: 45000,
            currency: 'JPY',
            availableRooms: 3,
            images: ['https://via.placeholder.com/400x300'],
            amenities: ['WiFi', 'スパ', 'フィットネス', 'レストラン'],
            description: '東京の中心部に位置する最高級ホテル',
            isLastMinute: true,
            discount: 15
        },
        {
            id: 'hotel-002',
            name: 'パークハイアット東京',
            nameEn: 'Park Hyatt Tokyo',
            address: '東京都新宿区西新宿3-7-1-2',
            prefecture: '東京都',
            city: '新宿区',
            stars: 5,
            price: 38000,
            currency: 'JPY',
            availableRooms: 2,
            images: ['https://via.placeholder.com/400x300'],
            amenities: ['WiFi', 'プール', 'スパ', 'バー'],
            description: '新宿の高層階から東京を一望できるラグジュアリーホテル',
            isLastMinute: false,
            discount: 0
        },
        {
            id: 'hotel-003',
            name: 'グランドハイアット東京',
            nameEn: 'Grand Hyatt Tokyo',
            address: '東京都港区六本木6-10-3',
            prefecture: '東京都',
            city: '港区',
            stars: 5,
            price: 32000,
            currency: 'JPY',
            availableRooms: 5,
            images: ['https://via.placeholder.com/400x300'],
            amenities: ['WiFi', 'スパ', 'レストラン', 'ショッピング'],
            description: '六本木ヒルズ内の都市型リゾートホテル',
            isLastMinute: true,
            discount: 20
        }
    ];
    
    // フィルタリング
    let filteredHotels = mockHotels;
    if (prefecture) {
        filteredHotels = filteredHotels.filter(hotel => 
            hotel.prefecture.includes(prefecture) || hotel.city.includes(prefecture)
        );
    }
    
    res.json({
        success: true,
        searchParams: {
            prefecture,
            checkIn,
            checkOut,
            guests: guests || 2
        },
        totalCount: filteredHotels.length,
        hotels: filteredHotels,
        lastMinuteDeals: filteredHotels.filter(h => h.isLastMinute),
        timestamp: new Date().toISOString()
    });
});

// 希望条件管理API
app.get('/api/preferences/manage', (req, res) => {
    log('Get preferences request');
    res.json({
        success: true,
        preferences: [
            {
                id: 'pref-001',
                areaName: '東京都',
                minPrice: 20000,
                maxPrice: 50000,
                checkinDate: '2025-07-01',
                flexibilityDays: 3,
                notifyLastMinute: true,
                notifyPriceDrop: true,
                createdAt: new Date().toISOString()
            }
        ]
    });
});

app.post('/api/preferences/manage', (req, res) => {
    log('Create preference request');
    const preference = req.body;
    
    res.json({
        success: true,
        message: '希望条件を登録しました',
        preference: {
            id: 'pref-' + Date.now(),
            ...preference,
            createdAt: new Date().toISOString()
        }
    });
});

// メール通知API
app.post('/api/email/send-notification', (req, res) => {
    log('Send email notification request');
    const { type, userId, data } = req.body;
    
    res.json({
        success: true,
        messageId: 'mock-email-' + Date.now(),
        message: 'テストメールを送信しました',
        type: type,
        timestamp: new Date().toISOString()
    });
});

// リアルタイム購読API
app.post('/api/realtime/subscribe', (req, res) => {
    log('Realtime subscription request');
    const { userId, preferences } = req.body;
    
    res.json({
        success: true,
        message: 'リアルタイム通知を設定しました',
        subscriptionId: 'sub-' + Date.now(),
        preferences: preferences
    });
});

// Cronジョブエンドポイント（テスト用）
app.post('/api/cron/match-preferences', (req, res) => {
    log('Cron: Match preferences');
    res.json({
        success: true,
        message: 'マッチング処理を実行しました',
        processed: Math.floor(Math.random() * 10),
        matches: Math.floor(Math.random() * 5),
        timestamp: new Date().toISOString()
    });
});

app.post('/api/cron/process-emails', (req, res) => {
    log('Cron: Process emails');
    res.json({
        success: true,
        message: 'メール送信処理を実行しました',
        sent: Math.floor(Math.random() * 20),
        failed: 0,
        timestamp: new Date().toISOString()
    });
});

// 404ハンドラー
app.use((req, res) => {
    log(`404 - Not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'APIエンドポイントが見つかりません',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            'GET /api/health',
            'POST /api/auth/signup',
            'POST /api/auth/login',
            'GET /api/search/rakuten',
            'GET /api/preferences/manage',
            'POST /api/preferences/manage',
            'POST /api/email/send-notification',
            'POST /api/realtime/subscribe',
            'POST /api/cron/match-preferences',
            'POST /api/cron/process-emails'
        ]
    });
});

// エラーハンドラー
app.use((error, req, res, next) => {
    log(`Error: ${error.message}`);
    res.status(500).json({
        error: 'サーバーエラーが発生しました',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log('✅ APIサーバー起動完了');
    console.log(`🔌 APIベースURL: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 利用可能なエンドポイント:');
    console.log('   GET  /api/health');
    console.log('   POST /api/auth/signup');
    console.log('   POST /api/auth/login');
    console.log('   GET  /api/search/rakuten');
    console.log('   GET  /api/preferences/manage');
    console.log('   POST /api/preferences/manage');
    console.log('   POST /api/email/send-notification');
    console.log('   POST /api/realtime/subscribe');
    console.log('   POST /api/cron/match-preferences');
    console.log('   POST /api/cron/process-emails');
    console.log('');
    console.log('🌐 テスト方法:');
    console.log('   curl http://localhost:3001/api/health');
    console.log('   curl http://localhost:3001/api/search/rakuten?prefecture=東京都');
});