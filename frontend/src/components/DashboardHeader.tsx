import * as React from 'react';

const { createElement: e } = React;

const DashboardHeader = ({ selectedDates, totalHotels, availableHotels, averageDiscount }: any) => {
  const formattedDates = selectedDates ? 
    `${new Date(selectedDates.checkin).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}〜${new Date(selectedDates.checkout).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}` :
    null;
    
  return e('div', {
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px 0',
      marginBottom: '24px',
      borderRadius: '0 0 16px 16px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
    }
  }, e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0 16px'
    }
  }, [
    // 統計情報（コンパクト版）
    e('div', {
      key: 'stats',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
      }
    }, [
      // 日付選択状態（コンパクト版）
      e('div', {
        key: 'date-stat',
        style: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '20px', marginBottom: '4px' }
        }, '📅'),
        e('div', {
          key: 'label',
          style: { fontSize: '12px', opacity: 0.7, marginBottom: '2px' }
        }, '検索期間'),
        e('div', {
          key: 'value',
          style: { fontSize: '14px', fontWeight: 'bold' }
        }, formattedDates || '日付選択')
      ]),
      
      // 総ホテル数
      e('div', {
        key: 'total-stat',
        style: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '20px', marginBottom: '4px' }
        }, '🏨'),
        e('div', {
          key: 'label',
          style: { fontSize: '12px', opacity: 0.7, marginBottom: '2px' }
        }, '登録ホテル数'),
        e('div', {
          key: 'value',
          style: { fontSize: '16px', fontWeight: 'bold' }
        }, `${totalHotels}軒`)
      ]),
      
      // 空室あり
      e('div', {
        key: 'available-stat',
        style: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '20px', marginBottom: '4px' }
        }, '✅'),
        e('div', {
          key: 'label',
          style: { fontSize: '12px', opacity: 0.7, marginBottom: '2px' }
        }, '空室あり'),
        e('div', {
          key: 'value',
          style: { fontSize: '16px', fontWeight: 'bold' }
        }, selectedDates ? `${availableHotels}軒` : '-')
      ]),
      
      // 平均割引率
      e('div', {
        key: 'discount-stat',
        style: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '20px', marginBottom: '4px' }
        }, '🎯'),
        e('div', {
          key: 'label',
          style: { fontSize: '12px', opacity: 0.7, marginBottom: '2px' }
        }, '平均割引率'),
        e('div', {
          key: 'value',
          style: { fontSize: '16px', fontWeight: 'bold' }
        }, averageDiscount ? `${averageDiscount}%OFF` : '最大50%OFF')
      ])
    ])
  ]));
};

export default DashboardHeader;