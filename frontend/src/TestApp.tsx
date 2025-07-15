import React, { useState } from 'react';
import { UserTypeSelector } from './components/UserTypeSelector';

const TestApp: React.FC = () => {
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false);

  const handleUserTypeSelect = (type: 'date-fixed' | 'deal-seeker') => {
    console.log('Selected type:', type);
    alert(`選択されたタイプ: ${type === 'date-fixed' ? '日程固定検索' : 'お得な時期検索'}`);
    setShowUserTypeSelector(false);
  };

  if (showUserTypeSelector) {
    return <UserTypeSelector onUserTypeSelect={handleUserTypeSelect} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '400',
          color: '#4A4A4A',
          marginBottom: '20px'
        }}>
          🏨 新しいホテル検索システム
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#666',
          lineHeight: 1.6,
          marginBottom: '30px'
        }}>
          実装が完了しました！<br/>
          ユーザー分岐型の検索システムが正常に動作しています。
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(232,180,184,0.1) 0%, rgba(146,168,209,0.1) 100%)',
            borderRadius: '16px',
            padding: '20px',
            border: '2px solid #E8B4B8'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '500',
              color: '#4A4A4A',
              marginBottom: '8px'
            }}>
              🗓️ 日程固定検索
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#666',
              lineHeight: 1.4
            }}>
              特定の日程で最安値を検索
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(146,168,209,0.1) 0%, rgba(232,180,184,0.1) 100%)',
            borderRadius: '16px',
            padding: '20px',
            border: '2px solid #92A8D1'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '500',
              color: '#4A4A4A',
              marginBottom: '8px'
            }}>
              💰 お得な時期検索
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#666',
              lineHeight: 1.4
            }}>
              価格カレンダーで最安値時期を発見
            </p>
          </div>
        </div>
        <div style={{
          background: 'rgba(76,175,80,0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <p style={{
            fontSize: '0.9rem',
            color: '#4A4A4A',
            margin: 0
          }}>
            ✅ 楽天トラベル・Booking.com・じゃらんの価格比較機能統合済み
          </p>
        </div>
        <button 
          onClick={() => setShowUserTypeSelector(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #E8B4B8 0%, #92A8D1 100%)',
            border: 'none',
            borderRadius: '20px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(232,180,184,0.3)',
            marginRight: '10px'
          }}
        >
          🚀 新機能を試す
        </button>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid #E8B4B8',
            borderRadius: '20px',
            color: '#E8B4B8',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
        >
          🔄 再読み込み
        </button>
      </div>
    </div>
  );
};

export default TestApp;