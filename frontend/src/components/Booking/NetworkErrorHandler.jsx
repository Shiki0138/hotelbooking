import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NetworkErrorHandler = ({ error, onRetry, onDismiss }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!error && isOnline) return null;

  const getErrorMessage = () => {
    if (!isOnline) {
      return {
        title: 'インターネット接続がありません',
        message: 'インターネット接続を確認してください。',
        icon: '📡'
      };
    }

    if (error?.message?.includes('401') || error?.message?.includes('403')) {
      return {
        title: '認証エラー',
        message: 'アクセス権限がありません。再度ログインしてください。',
        icon: '🔐'
      };
    }

    if (error?.message?.includes('404')) {
      return {
        title: 'ホテルが見つかりません',
        message: '指定されたホテルは存在しないか、削除された可能性があります。',
        icon: '🔍'
      };
    }

    if (error?.message?.includes('500')) {
      return {
        title: 'サーバーエラー',
        message: 'サーバーに問題が発生しています。しばらくしてから再度お試しください。',
        icon: '🖥️'
      };
    }

    return {
      title: 'エラーが発生しました',
      message: error?.message || '予期しないエラーが発生しました。',
      icon: '⚠️'
    };
  };

  const errorInfo = getErrorMessage();

  return (
    <AnimatePresence>
      {(error || !isOnline) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            maxWidth: '500px',
            width: '90%'
          }}
        >
          <div style={{
            background: !isOnline ? '#ff9800' : '#f44336',
            color: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '15px'
          }}>
            <span style={{ fontSize: '30px', flexShrink: 0 }}>{errorInfo.icon}</span>
            
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>
                {errorInfo.title}
              </h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', opacity: 0.9 }}>
                {errorInfo.message}
              </p>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                  >
                    再試行
                  </button>
                )}
                
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer',
                      opacity: 0.8,
                      transition: 'opacity 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '1'}
                    onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                  >
                    閉じる
                  </button>
                )}
              </div>
            </div>

            {!isOnline && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%'
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkErrorHandler;