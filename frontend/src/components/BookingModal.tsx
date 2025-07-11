import * as React from 'react';

const { useState, createElement: e } = React;

interface BookingModalProps {
  hotel: any;
  isOpen: boolean;
  onClose: () => void;
}

const BookingModal = ({ hotel, isOpen, onClose }: BookingModalProps) => {
  if (!isOpen) return null;

  const bookingSites = [
    {
      name: 'Google Hotels',
      description: '複数サイトの価格を比較',
      color: '#4285f4',
      icon: '🔍',
      url: `https://www.google.com/travel/hotels/search?q=${encodeURIComponent(hotel.name)}+${encodeURIComponent(hotel.city || '')}`
    },
    {
      name: 'Booking.com',
      description: '世界最大級の予約サイト',
      color: '#003580',
      icon: '🏨',
      url: `https://www.booking.com/search.html?ss=${encodeURIComponent(hotel.name)}+${encodeURIComponent(hotel.city || '')}`
    },
    {
      name: '楽天トラベル',
      description: '楽天ポイントが貯まる',
      color: '#bf0000',
      icon: '🇯🇵',
      url: `https://travel.rakuten.co.jp/`
    },
    {
      name: 'じゃらん',
      description: 'Pontaポイントが使える',
      color: '#f50057',
      icon: '✨',
      url: `https://www.jalan.net/`
    }
  ];

  return e('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    onClick: onClose
  }, e('div', {
    style: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    },
    onClick: (e: any) => e.stopPropagation()
  }, [
    // ヘッダー
    e('div', {
      key: 'header',
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }
    }, [
      e('div', { key: 'title-section' }, [
        e('h2', {
          key: 'title',
          style: {
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0
          }
        }, '予約サイトを選択'),
        e('p', {
          key: 'hotel-name',
          style: {
            fontSize: '16px',
            color: '#666',
            marginTop: '4px'
          }
        }, hotel.name)
      ]),
      e('button', {
        key: 'close',
        onClick: onClose,
        style: {
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '4px',
          color: '#666'
        }
      }, '×')
    ]),

    // 予約サイトリスト
    e('div', {
      key: 'sites',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }
    }, bookingSites.map(site => 
      e('a', {
        key: site.name,
        href: site.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: {
          display: 'flex',
          alignItems: 'center',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'all 0.2s',
          backgroundColor: 'white'
        },
        onMouseEnter: (e: any) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
          e.currentTarget.style.borderColor = site.color;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        },
        onMouseLeave: (e: any) => {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.borderColor = '#e0e0e0';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }, [
        e('span', {
          key: 'icon',
          style: {
            fontSize: '32px',
            marginRight: '16px'
          }
        }, site.icon),
        e('div', {
          key: 'info',
          style: { flex: 1 }
        }, [
          e('div', {
            key: 'name',
            style: {
              fontSize: '18px',
              fontWeight: '600',
              color: site.color,
              marginBottom: '4px'
            }
          }, site.name),
          e('div', {
            key: 'desc',
            style: {
              fontSize: '14px',
              color: '#666'
            }
          }, site.description)
        ]),
        e('svg', {
          key: 'arrow',
          width: '20',
          height: '20',
          viewBox: '0 0 20 20',
          fill: site.color,
          style: { opacity: 0.5 }
        }, e('path', {
          d: 'M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z'
        }))
      ])
    )),

    // 注意事項
    e('p', {
      key: 'note',
      style: {
        marginTop: '20px',
        fontSize: '12px',
        color: '#999',
        textAlign: 'center'
      }
    }, '※ 楽天トラベル・じゃらんではホテル名で検索してください')
  ]));
};

export default BookingModal;