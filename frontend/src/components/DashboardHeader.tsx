import * as React from 'react';

const { createElement: e } = React;

const DashboardHeader = ({ selectedDates, totalHotels, availableHotels }: any) => {
  const formattedDates = selectedDates ? 
    `${new Date(selectedDates.checkin).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} 〜 ${new Date(selectedDates.checkout).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}` :
    null;
    
  return e('div', {
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '32px 0',
      marginBottom: '32px',
      borderRadius: '0 0 24px 24px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
    }
  }, e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0 16px'
    }
  }, [
    // タイトル部分
    e('div', {
      key: 'title-section',
      style: {
        textAlign: 'center',
        marginBottom: '24px'
      }
    }, [
      e('h1', {
        key: 'title',
        style: {
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }
      }, '高級ホテル・人気ホテル ダッシュボード'),
      e('p', {
        key: 'subtitle',
        style: {
          fontSize: '16px',
          opacity: 0.9
        }
      }, 'リアルタイム空室状況と価格を一覧表示')
    ]),
    
    // 統計情報
    e('div', {
      key: 'stats',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px',
        marginTop: '32px'
      }
    }, [
      // 日付選択状態
      e('div', {
        key: 'date-stat',
        style: {
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '32px', marginBottom: '8px' }
        }, '📅'),
        e('div', {
          key: 'label',
          style: { fontSize: '14px', opacity: 0.8, marginBottom: '4px' }
        }, '検索期間'),
        e('div', {
          key: 'value',
          style: { fontSize: '18px', fontWeight: 'bold' }
        }, formattedDates || '日付を選択してください')
      ]),
      
      // 総ホテル数
      e('div', {
        key: 'total-stat',
        style: {
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '32px', marginBottom: '8px' }
        }, '🏨'),
        e('div', {
          key: 'label',
          style: { fontSize: '14px', opacity: 0.8, marginBottom: '4px' }
        }, '登録ホテル数'),
        e('div', {
          key: 'value',
          style: { fontSize: '18px', fontWeight: 'bold' }
        }, `${totalHotels}軒`)
      ]),
      
      // 空室あり
      e('div', {
        key: 'available-stat',
        style: {
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '32px', marginBottom: '8px' }
        }, '✅'),
        e('div', {
          key: 'label',
          style: { fontSize: '14px', opacity: 0.8, marginBottom: '4px' }
        }, '空室あり'),
        e('div', {
          key: 'value',
          style: { fontSize: '18px', fontWeight: 'bold' }
        }, selectedDates ? `${availableHotels}軒` : '-')
      ]),
      
      // 平均割引率
      e('div', {
        key: 'discount-stat',
        style: {
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '32px', marginBottom: '8px' }
        }, '🎯'),
        e('div', {
          key: 'label',
          style: { fontSize: '14px', opacity: 0.8, marginBottom: '4px' }
        }, '平均割引率'),
        e('div', {
          key: 'value',
          style: { fontSize: '18px', fontWeight: 'bold' }
        }, '最大50%OFF')
      ])
    ])
  ]));
};

export default DashboardHeader;