import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

const SimpleApp = () => {
  return React.createElement('div', {
    style: {
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }
  },
    React.createElement('h1', {
      style: { color: '#dc2626', marginBottom: '20px' }
    }, '🏨 LMS ホテル予約システム'),
    
    React.createElement('div', {
      style: {
        background: '#f3f4f6',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }
    },
      React.createElement('h2', null, '✅ システム起動確認'),
      React.createElement('p', null, 'Reactが正常に動作しています！'),
      React.createElement('p', null, `現在時刻: ${new Date().toLocaleString('ja-JP')}`)
    ),
    
    React.createElement('div', {
      style: {
        background: '#fee2e2',
        padding: '20px',
        borderRadius: '8px'
      }
    },
      React.createElement('h3', null, '🔧 環境設定'),
      React.createElement('p', null, 
        'Supabase Anon Keyを設定してください：'
      ),
      React.createElement('ol', null,
        React.createElement('li', null, 'https://supabase.com/dashboard/project/nanleckihedkmikctltb/settings/api'),
        React.createElement('li', null, 'anon publicキーをコピー'),
        React.createElement('li', null, '.env.localファイルに貼り付け'),
        React.createElement('li', null, 'サーバーを再起動')
      )
    )
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(React.createElement(SimpleApp));