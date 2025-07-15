import React, { useState } from 'react';
import { SimpleHeroSection } from './components/SimpleHeroSection';

const SimpleApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<'search' | 'results'>('search');
  const [searchResults, setSearchResults] = useState<any>(null);

  const handleSearch = (params: any) => {
    console.log('Search:', params);
    setSearchResults({
      hotelName: params.query || '検索されたホテル',
      prices: [
        { provider: '楽天トラベル', price: 42000, badge: '最安値' },
        { provider: 'Booking.com', price: 43500 },
        { provider: 'じゃらん', price: 44200 }
      ]
    });
    setCurrentView('results');
  };

  const handleAreaSelect = (area: string) => {
    console.log('Area selected:', area);
    alert(`${area}のホテルを検索します`);
  };

  const handleBackToSearch = () => {
    setCurrentView('search');
    setSearchResults(null);
  };

  if (currentView === 'results' && searchResults) {
    return React.createElement('div', {
      style: {
        minHeight: '100vh',
        background: '#f5f5f5',
        padding: '20px'
      }
    }, [
      // 戻るボタン
      React.createElement('button', {
        key: 'back-button',
        onClick: handleBackToSearch,
        style: {
          marginBottom: '20px',
          padding: '12px 24px',
          background: '#E8B4B8',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer'
        }
      }, '← 検索に戻る'),
      
      // 結果表示
      React.createElement('div', {
        key: 'results',
        style: {
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          margin: '0 auto'
        }
      }, [
        React.createElement('h2', {
          key: 'hotel-name',
          style: { marginBottom: '24px', color: '#333' }
        }, searchResults.hotelName),
        
        ...searchResults.prices.map((price: any, index: number) => 
          React.createElement('div', {
            key: price.provider,
            style: {
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }
          }, [
            React.createElement('div', {
              key: 'provider-info'
            }, [
              React.createElement('span', {
                key: 'rank',
                style: { fontSize: '20px', marginRight: '12px' }
              }, index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'),
              React.createElement('span', {
                key: 'name',
                style: { fontWeight: '500' }
              }, price.provider)
            ]),
            React.createElement('div', {
              key: 'price-info',
              style: { textAlign: 'right' }
            }, [
              React.createElement('div', {
                key: 'price',
                style: { 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: index === 0 ? '#E8B4B8' : '#333'
                }
              }, `¥${price.price.toLocaleString()}`),
              price.badge && React.createElement('div', {
                key: 'badge',
                style: {
                  marginTop: '4px',
                  padding: '2px 8px',
                  background: '#E8B4B8',
                  color: 'white',
                  fontSize: '12px',
                  borderRadius: '8px',
                  display: 'inline-block'
                }
              }, price.badge)
            ])
          ])
        )
      ])
    ]);
  }

  return React.createElement(SimpleHeroSection, {
    onSearch: handleSearch,
    onAreaSelect: handleAreaSelect
  });
};

export default SimpleApp;