import React from 'react';

// Enhanced Error Boundary Service with comprehensive error handling
export class ErrorBoundaryService {
  private static instance: ErrorBoundaryService;
  private errorHandlers: Map<string, ErrorHandler> = new Map();
  private fallbackStrategies: Map<string, FallbackStrategy> = new Map();

  private constructor() {
    this.initializeDefaultHandlers();
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorBoundaryService {
    if (!ErrorBoundaryService.instance) {
      ErrorBoundaryService.instance = new ErrorBoundaryService();
    }
    return ErrorBoundaryService.instance;
  }

  // Initialize default error handlers
  private initializeDefaultHandlers(): void {
    // API Error Handler
    this.registerErrorHandler('api', {
      canHandle: (error: Error) => {
        return error.name === 'ApiError' || 
               error.message.includes('API') ||
               error.message.includes('fetch') ||
               error.message.includes('network');
      },
      handle: async (error: Error, context: ErrorContext) => {
        console.error('🚨 API Error:', error);
        
        // Try to recover with cached data
        if (context.component === 'HotelList') {
          return this.getFallbackStrategy('hotel-cache')?.execute(error, context);
        }
        
        // Show user-friendly error message
        this.showUserNotification({
          type: 'error',
          title: 'ネットワークエラー',
          message: 'サーバーとの通信に問題が発生しました。しばらくしてから再度お試しください。',
          actions: [
            {
              label: '再試行',
              action: () => window.location.reload()
            }
          ]
        });

        return { recovered: false, fallbackData: null };
      }
    });

    // Image Loading Error Handler
    this.registerErrorHandler('image', {
      canHandle: (error: Error) => {
        return error.message.includes('image') ||
               error.message.includes('load') ||
               error.name === 'ImageLoadError';
      },
      handle: async (error: Error, context: ErrorContext) => {
        console.warn('🖼️ Image Load Error:', error);
        
        // Return fallback image
        return {
          recovered: true,
          fallbackData: {
            src: '/images/placeholder-hotel.jpg',
            alt: 'Hotel placeholder image'
          }
        };
      }
    });

    // Google Maps Error Handler
    this.registerErrorHandler('maps', {
      canHandle: (error: Error) => {
        return error.message.includes('google') ||
               error.message.includes('maps') ||
               error.message.includes('geocod');
      },
      handle: async (error: Error, context: ErrorContext) => {
        console.error('🗺️ Google Maps Error:', error);
        
        // Fallback to static map or text-based location
        return {
          recovered: true,
          fallbackData: {
            type: 'static-map',
            message: 'マップの読み込みに失敗しました。住所を表示しています。'
          }
        };
      }
    });

    // Voice Search Error Handler
    this.registerErrorHandler('voice', {
      canHandle: (error: Error) => {
        return error.message.includes('voice') ||
               error.message.includes('speech') ||
               error.message.includes('microphone');
      },
      handle: async (error: Error, context: ErrorContext) => {
        console.warn('🎤 Voice Search Error:', error);
        
        this.showUserNotification({
          type: 'warning',
          title: '音声検索エラー',
          message: 'マイクへのアクセスができませんでした。テキスト検索をお試しください。',
          duration: 5000
        });

        return { recovered: true, fallbackData: { voiceDisabled: true } };
      }
    });

    // Generic JavaScript Error Handler
    this.registerErrorHandler('javascript', {
      canHandle: (error: Error) => {
        return error instanceof TypeError ||
               error instanceof ReferenceError ||
               error instanceof SyntaxError;
      },
      handle: async (error: Error, context: ErrorContext) => {
        console.error('💥 JavaScript Error:', error);
        
        // Send to monitoring service
        this.reportError(error, context);
        
        return { recovered: false, fallbackData: null };
      }
    });
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    // Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚫 Unhandled Promise Rejection:', event.reason);
      this.handleError(new Error(event.reason), {
        component: 'Global',
        source: 'unhandledrejection',
        timestamp: new Date().toISOString()
      });
    });

    // Global JavaScript Errors
    window.addEventListener('error', (event) => {
      console.error('🚫 Global JavaScript Error:', event.error);
      this.handleError(event.error || new Error(event.message), {
        component: 'Global',
        source: 'javascript',
        timestamp: new Date().toISOString(),
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Network connectivity monitoring
    window.addEventListener('online', () => {
      this.showUserNotification({
        type: 'success',
        title: 'ネットワーク復旧',
        message: 'インターネット接続が復旧しました。',
        duration: 3000
      });
    });

    window.addEventListener('offline', () => {
      this.showUserNotification({
        type: 'warning',
        title: 'オフライン',
        message: 'インターネット接続が失われました。一部の機能が制限される場合があります。',
        duration: 5000
      });
    });
  }

  // Register custom error handler
  public registerErrorHandler(type: string, handler: ErrorHandler): void {
    this.errorHandlers.set(type, handler);
  }

  // Register fallback strategy
  public registerFallbackStrategy(type: string, strategy: FallbackStrategy): void {
    this.fallbackStrategies.set(type, strategy);
  }

  // Main error handling method
  public async handleError(error: Error, context: ErrorContext): Promise<ErrorRecoveryResult> {
    // Find appropriate handler
    for (const [type, handler] of this.errorHandlers) {
      if (handler.canHandle(error)) {
        try {
          console.log(`🔧 Handling error with ${type} handler`);
          return await handler.handle(error, context);
        } catch (handlerError) {
          console.error(`❌ Error handler ${type} failed:`, handlerError);
        }
      }
    }

    // Default fallback
    console.error('🚨 Unhandled error:', error);
    this.reportError(error, context);
    
    return { recovered: false, fallbackData: null };
  }

  // Get fallback strategy
  private getFallbackStrategy(type: string): FallbackStrategy | undefined {
    return this.fallbackStrategies.get(type);
  }

  // Show user notification
  private showUserNotification(notification: UserNotification): void {
    // Create notification element
    const notificationEl = document.createElement('div');
    notificationEl.className = `error-notification ${notification.type}`;
    notificationEl.innerHTML = `
      <div class="notification-content">
        <div class="notification-header">
          <span class="notification-icon">${this.getNotificationIcon(notification.type)}</span>
          <span class="notification-title">${notification.title}</span>
          <button class="notification-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-message">${notification.message}</div>
        ${notification.actions ? `
          <div class="notification-actions">
            ${notification.actions.map(action => `
              <button class="notification-action" onclick="${action.action}">${action.label}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    // Add styles if not present
    if (!document.getElementById('error-notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'error-notification-styles';
      styles.textContent = this.getNotificationStyles();
      document.head.appendChild(styles);
    }

    // Add to page
    document.body.appendChild(notificationEl);

    // Auto-remove after duration
    if (notification.duration) {
      setTimeout(() => {
        if (notificationEl.parentNode) {
          notificationEl.remove();
        }
      }, notification.duration);
    }

    // Add slide-in animation
    setTimeout(() => {
      notificationEl.classList.add('show');
    }, 100);
  }

  // Get notification icon
  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'error': return '🚨';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  // Get notification styles
  private getNotificationStyles(): string {
    return `
      .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border-left: 4px solid #3b82f6;
      }

      .error-notification.error {
        border-left-color: #ef4444;
      }

      .error-notification.warning {
        border-left-color: #f59e0b;
      }

      .error-notification.success {
        border-left-color: #10b981;
      }

      .error-notification.show {
        transform: translateX(0);
      }

      .notification-content {
        padding: 1rem;
      }

      .notification-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .notification-icon {
        font-size: 1.2rem;
      }

      .notification-title {
        font-weight: 600;
        color: #1f2937;
        flex: 1;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .notification-close:hover {
        color: #374151;
      }

      .notification-message {
        color: #4b5563;
        line-height: 1.4;
        margin-bottom: 0.75rem;
      }

      .notification-actions {
        display: flex;
        gap: 0.5rem;
      }

      .notification-action {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .notification-action:hover {
        background: #2563eb;
      }

      @media (max-width: 640px) {
        .error-notification {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;
  }

  // Report error to monitoring service
  private reportError(error: Error, context: ErrorContext): void {
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Sentry, LogRocket, etc.
        if (window.Sentry) {
          window.Sentry.captureException(error, {
            extra: context,
            tags: {
              component: context.component,
              source: context.source
            }
          });
        }

        // Custom analytics
        if (window.gtag) {
          window.gtag('event', 'exception', {
            description: error.message,
            fatal: false,
            custom_map: context
          });
        }
      } catch (reportingError) {
        console.warn('Failed to report error:', reportingError);
      }
    }
  }

  // Create React Error Boundary component
  public createErrorBoundary(): React.ComponentType<any> {
    const errorBoundaryService = this;

    return class ErrorBoundary extends React.Component<
      { children: React.ReactNode; fallback?: React.ComponentType<any> },
      { hasError: boolean; error?: Error }
    > {
      constructor(props: any) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }

      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        errorBoundaryService.handleError(error, {
          component: 'ErrorBoundary',
          source: 'react',
          timestamp: new Date().toISOString(),
          componentStack: errorInfo.componentStack
        });
      }

      render() {
        if (this.state.hasError) {
          const FallbackComponent = this.props.fallback || DefaultErrorFallback;
          return React.createElement(FallbackComponent, { error: this.state.error });
        }

        return this.props.children;
      }
    };
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error?: Error }> = ({ error }) => {
  return React.createElement('div', {
    style: {
      padding: '2rem',
      textAlign: 'center',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      margin: '1rem'
    }
  }, [
    React.createElement('h2', { key: 'title' }, '🚨 エラーが発生しました'),
    React.createElement('p', { key: 'message' }, 'アプリケーションで予期しないエラーが発生しました。'),
    React.createElement('button', {
      key: 'reload',
      onClick: () => window.location.reload(),
      style: {
        background: '#ef4444',
        color: 'white',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        marginTop: '1rem'
      }
    }, 'ページを再読み込み')
  ]);
};

// Types
export interface ErrorHandler {
  canHandle: (error: Error) => boolean;
  handle: (error: Error, context: ErrorContext) => Promise<ErrorRecoveryResult>;
}

export interface FallbackStrategy {
  execute: (error: Error, context: ErrorContext) => Promise<ErrorRecoveryResult>;
}

export interface ErrorContext {
  component: string;
  source: string;
  timestamp: string;
  [key: string]: any;
}

export interface ErrorRecoveryResult {
  recovered: boolean;
  fallbackData: any;
}

export interface UserNotification {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

// Export singleton instance
export const errorBoundaryService = ErrorBoundaryService.getInstance();
export default errorBoundaryService;