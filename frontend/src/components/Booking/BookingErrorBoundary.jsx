import React from 'react';
import { MorphingButton } from '../Animation/MotionComponents';

class BookingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Booking error caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/practical';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(244, 67, 54, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <span style={{ fontSize: '40px' }}>⚠️</span>
            </div>

            <h2 style={{ color: '#333', marginBottom: '15px' }}>
              予約処理中にエラーが発生しました
            </h2>

            <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
              申し訳ございません。予約処理中に問題が発生しました。<br />
              お手数ですが、もう一度お試しください。
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details style={{
                textAlign: 'left',
                marginBottom: '20px',
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  エラー詳細（開発者向け）
                </summary>
                <pre style={{ marginTop: '10px', fontSize: '12px', overflow: 'auto' }}>
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '15px' }}>
              <MorphingButton
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  padding: '12px 20px'
                }}
              >
                検索に戻る
              </MorphingButton>

              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  color: '#666',
                  cursor: 'pointer'
                }}
              >
                ページを再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default BookingErrorBoundary;