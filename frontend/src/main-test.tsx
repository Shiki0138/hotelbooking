import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

const App = () => {
  return React.createElement('div', { style: { padding: '20px', fontFamily: 'Arial' } },
    React.createElement('h1', null, '🎉 LMS ホテル予約システム'),
    React.createElement('p', null, 'システムが正常に起動しました！'),
    React.createElement('div', { style: { marginTop: '20px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' } },
      React.createElement('h2', null, '環境変数チェック:'),
      React.createElement('p', null, `VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL || '❌ 未設定'}`),
      React.createElement('p', null, `VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定'}`),
    ),
    React.createElement('div', { style: { marginTop: '20px' } },
      React.createElement('h3', null, 'エラーが発生している場合:'),
      React.createElement('ol', null,
        React.createElement('li', null, 'ブラウザのコンソール（F12）を確認'),
        React.createElement('li', null, '.env.localファイルにSupabase設定を追加'),
        React.createElement('li', null, 'npm run devを再起動')
      )
    )
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(React.createElement(App));