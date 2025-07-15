import React, { useState } from 'react';

interface SimpleHeroSectionProps {
  onSearch: (params: any) => void;
  onAreaSelect: (area: string) => void;
}

export const SimpleHeroSection: React.FC<SimpleHeroSectionProps> = ({ onSearch, onAreaSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    onSearch({ query: searchQuery });
  };

  return React.createElement('div', {
    style: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      padding: '40px 20px',
      color: 'white'
    }
  }, [
    // ヘッダー
    React.createElement('div', {
      key: 'header',
      style: {
        textAlign: 'center',
        marginBottom: '40px'
      }
    }, [
      React.createElement('h1', {
        key: 'title',
        style: {
          fontSize: '28px',
          fontWeight: '300',
          marginBottom: '16px',
          color: 'white'
        }
      }, 'AIが見つける、あなただけの特別価格'),
      React.createElement('p', {
        key: 'subtitle',
        style: {
          fontSize: '16px',
          opacity: 0.9
        }
      }, '✨ Gemini AIが最適なタイミングをお知らせ')
    ]),
    
    // 検索ボックス
    React.createElement('div', {
      key: 'search-section',
      style: {
        maxWidth: '600px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }
    }, [
      React.createElement('input', {
        key: 'search-input',
        type: 'text',
        value: searchQuery,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
        placeholder: 'ホテル名を入力（例：リッツカールトン）',
        style: {
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          marginBottom: '16px',
          outline: 'none',
          boxSizing: 'border-box'
        }
      }),
      React.createElement('button', {
        key: 'search-button',
        onClick: handleSearch,
        style: {
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
          border: 'none',
          borderRadius: '12px',
          color: 'white',
          fontSize: '16px',
          fontWeight: '500',
          cursor: 'pointer'
        }
      }, '🔍 検索')
    ]),
    
    // エリア選択
    React.createElement('div', {
      key: 'area-section',
      style: {
        maxWidth: '600px',
        margin: '40px auto 0',
        textAlign: 'center'
      }
    }, [
      React.createElement('p', {
        key: 'or-text',
        style: {
          marginBottom: '24px',
          opacity: 0.8
        }
      }, 'または'),
      React.createElement('div', {
        key: 'area-buttons',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px'
        }
      }, [
        React.createElement('button', {
          key: 'tokyo',
          onClick: () => onAreaSelect('東京'),
          style: {
            padding: '16px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }
        }, '🗼 東京'),
        React.createElement('button', {
          key: 'kyoto',
          onClick: () => onAreaSelect('京都'),
          style: {
            padding: '16px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }
        }, '🏯 京都'),
        React.createElement('button', {
          key: 'okinawa',
          onClick: () => onAreaSelect('沖縄'),
          style: {
            padding: '16px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }
        }, '🌺 沖縄'),
        React.createElement('button', {
          key: 'weekend',
          onClick: () => onAreaSelect('weekend'),
          style: {
            padding: '16px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }
        }, '🎯 今週末')
      ])
    ])
  ]);
};