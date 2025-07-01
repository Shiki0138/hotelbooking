// Service Worker Manager - Viteキャッシュ競合解決
export class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      // Service Workerの登録
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);

      // 更新チェック
      this.checkForUpdates();
      
      // メッセージリスナー
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
      
      // 状態変更リスナー
      this.registration.addEventListener('updatefound', this.onUpdateFound.bind(this));
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async checkForUpdates() {
    if (!this.registration) return;
    
    try {
      await this.registration.update();
    } catch (error) {
      console.error('Service Worker update check failed:', error);
    }
  }

  onUpdateFound() {
    const newWorker = this.registration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // 新しいService Workerがインストールされた
        this.updateAvailable = true;
        this.notifyUpdateAvailable();
      }
    });
  }

  handleMessage(event) {
    const { type, version } = event.data;
    
    if (type === 'CACHE_UPDATED') {
      console.log('Cache updated to version:', version);
      // 必要に応じてページをリロード
      if (this.updateAvailable) {
        this.promptReload();
      }
    }
  }

  notifyUpdateAvailable() {
    // カスタムイベントを発火
    window.dispatchEvent(new CustomEvent('sw-update-available'));
    
    // コンソールに通知
    console.log('New version available! Please reload to update.');
  }

  promptReload() {
    if (window.confirm('新しいバージョンが利用可能です。ページを更新しますか？')) {
      window.location.reload();
    }
  }

  async clearAllCaches() {
    // 開発環境でのキャッシュクリア
    if (import.meta.env.DEV) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  }

  async skipWaiting() {
    // 新しいService Workerを即座にアクティベート
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
}

// シングルトンインスタンス
export const swManager = new ServiceWorkerManager();