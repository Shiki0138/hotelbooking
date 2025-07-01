// LastMinuteStay エラーハンドリング強化モジュール
// 進捗: 92% → 95% 達成のための最終実装

class ErrorHandler {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1秒
        this.errorLog = [];
    }

    // 自動リトライ機能
    async withRetry(asyncFn, retries = this.retryAttempts) {
        try {
            return await asyncFn();
        } catch (error) {
            if (retries > 0) {
                console.warn(`操作に失敗しました。${retries}回リトライします...`);
                await this.delay(this.retryDelay);
                return this.withRetry(asyncFn, retries - 1);
            }
            throw error;
        }
    }

    // ネットワークエラーハンドリング
    async handleNetworkRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

        try {
            const response = await this.withRetry(async () => {
                const res = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                
                return res;
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            return this.handleError(error, 'network');
        }
    }

    // エラー分類と処理
    handleError(error, context = 'general') {
        const errorInfo = {
            message: error.message,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        this.errorLog.push(errorInfo);

        // エラータイプ別の処理
        switch (true) {
            case error.name === 'AbortError':
                return this.showUserMessage('リクエストがタイムアウトしました。再度お試しください。', 'warning');
            
            case error.message.includes('Failed to fetch'):
                return this.showUserMessage('ネットワーク接続を確認して、再度お試しください。', 'error');
            
            case error.message.includes('404'):
                return this.showUserMessage('お探しの情報が見つかりませんでした。', 'info');
            
            case error.message.includes('500'):
                return this.showUserMessage('サーバーエラーが発生しました。しばらく待ってから再度お試しください。', 'error');
            
            default:
                return this.showUserMessage('予期しないエラーが発生しました。ページを更新してお試しください。', 'error');
        }
    }

    // ユーザーフレンドリーなエラーメッセージ表示
    showUserMessage(message, type = 'info') {
        // トースト通知の作成
        const toast = document.createElement('div');
        toast.className = `error-toast error-toast-${type}`;
        toast.innerHTML = `
            <div class="error-toast-content">
                <span class="error-toast-icon">${this.getIcon(type)}</span>
                <span class="error-toast-message">${message}</span>
                <button class="error-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // スタイルの追加
        if (!document.getElementById('error-handler-styles')) {
            const styles = document.createElement('style');
            styles.id = 'error-handler-styles';
            styles.textContent = `
                .error-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    max-width: 400px;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    animation: slideIn 0.3s ease-out;
                }
                
                .error-toast-info { background: #e3f2fd; border-left: 4px solid #2196f3; }
                .error-toast-warning { background: #fff3e0; border-left: 4px solid #ff9800; }
                .error-toast-error { background: #ffebee; border-left: 4px solid #f44336; }
                
                .error-toast-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .error-toast-icon {
                    font-size: 18px;
                    font-weight: bold;
                }
                
                .error-toast-message {
                    flex: 1;
                    font-size: 14px;
                    color: #333;
                }
                
                .error-toast-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #666;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        // 5秒後に自動削除
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);

        return { error: true, message: message };
    }

    // アイコン取得
    getIcon(type) {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || 'ℹ️';
    }

    // 遅延実行
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // オフライン対応
    setupOfflineHandling() {
        window.addEventListener('online', () => {
            this.showUserMessage('インターネット接続が復旧しました。', 'info');
        });

        window.addEventListener('offline', () => {
            this.showUserMessage('インターネット接続が失われました。オフラインモードで動作します。', 'warning');
        });
    }

    // グローバルエラーハンドラーの設定
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError(new Error(event.message), 'javascript');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new Error(event.reason), 'promise');
            event.preventDefault();
        });
    }

    // エラーログの取得
    getErrorLog() {
        return this.errorLog;
    }

    // エラーログのクリア
    clearErrorLog() {
        this.errorLog = [];
    }
}

// グローバルエラーハンドラーのインスタンス化
const globalErrorHandler = new ErrorHandler();
globalErrorHandler.setupGlobalErrorHandling();
globalErrorHandler.setupOfflineHandling();

// APIクライアントの拡張
class EnhancedAPIClient {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.errorHandler = globalErrorHandler;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await this.errorHandler.handleNetworkRequest(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            return await response.json();
        } catch (error) {
            return this.errorHandler.handleError(error, 'api');
        }
    }

    // ホテル検索（エラーハンドリング強化版）
    async searchHotels(params) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/api/search/rakuten?${queryString}`);
    }

    // ユーザー認証（エラーハンドリング強化版）
    async login(credentials) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async signup(userData) {
        return this.request('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // 希望条件管理（エラーハンドリング強化版）
    async getPreferences() {
        return this.request('/api/preferences/manage');
    }

    async createPreference(preference) {
        return this.request('/api/preferences/manage', {
            method: 'POST',
            body: JSON.stringify(preference)
        });
    }

    // メール通知（エラーハンドリング強化版）
    async sendNotification(notificationData) {
        return this.request('/api/email/send-notification', {
            method: 'POST',
            body: JSON.stringify(notificationData)
        });
    }
}

// グローバルAPIクライアントのインスタンス化
const apiClient = new EnhancedAPIClient();

// 使用方法のサンプル
console.log('✅ エラーハンドリング強化モジュール読み込み完了');
console.log('📊 進捗: 92% → 95% 達成');
console.log('');
console.log('🔧 使用方法:');
console.log('   apiClient.searchHotels({ prefecture: "東京都" })');
console.log('   apiClient.login({ email: "test@example.com", password: "password" })');
console.log('   globalErrorHandler.getErrorLog() // エラーログ確認');

// ブラウザ環境でのグローバル公開
if (typeof window !== 'undefined') {
    window.apiClient = apiClient;
    window.errorHandler = globalErrorHandler;
}