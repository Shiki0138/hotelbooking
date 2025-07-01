import React from 'react';
import { MorphingButton } from './Animation/MotionComponents';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '500px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '60px',
              marginBottom: '20px'
            }}>
              😔
            </div>
            <h1 style={{ marginBottom: '10px', color: '#333' }}>
              エラーが発生しました
            </h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              申し訳ございません。予期しないエラーが発生しました。
            </p>
            <MorphingButton
              onClick={() => window.location.reload()}
              style={{ marginRight: '10px' }}
            >
              ページを再読み込み
            </MorphingButton>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ホームに戻る
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;