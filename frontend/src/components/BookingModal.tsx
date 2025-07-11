import * as React from 'react';

const { useState, createElement: e } = React;

// 地域別URL設定
const getRakutenAreaUrl = (city?: string) => {
  const areaMap: Record<string, string> = {
    '東京': 'https://travel.rakuten.co.jp/yado/tokyo/map_s.html',
    '大阪': 'https://travel.rakuten.co.jp/yado/osaka/map_s.html',
    '京都': 'https://travel.rakuten.co.jp/yado/kyoto/map_s.html',
    '沖縄': 'https://travel.rakuten.co.jp/okinawa/',
    '北海道': 'https://travel.rakuten.co.jp/hokkaido/',
    '福岡': 'https://travel.rakuten.co.jp/yado/fukuoka/map_s.html'
  };
  return areaMap[city || ''] || 'https://travel.rakuten.co.jp/';
};

const getJalanAreaUrl = (city?: string) => {
  const areaMap: Record<string, string> = {
    '東京': 'https://www.jalan.net/ikisaki/map/tokyo/',
    '大阪': 'https://www.jalan.net/ikisaki/map/osaka/',
    '京都': 'https://www.jalan.net/ikisaki/map/kyoto/',
    '沖縄': 'https://www.jalan.net/ikisaki/map/okinawa/',
    '北海道': 'https://www.jalan.net/ikisaki/map/hokkaido/',
    '福岡': 'https://www.jalan.net/ikisaki/map/fukuoka/'
  };
  return areaMap[city || ''] || 'https://www.jalan.net/';
};

interface BookingModalProps {
  hotel: any;
  isOpen: boolean;
  onClose: () => void;
}

const BookingModal = ({ hotel, isOpen, onClose }: BookingModalProps) => {
  const [copiedSite, setCopiedSite] = useState<string | null>(null);
  const [copiedInfo, setCopiedInfo] = useState<string | null>(null);
  
  if (!isOpen) return null;

  const handleCopyInfo = async (info: string, type: string) => {
    try {
      await navigator.clipboard.writeText(info);
      setCopiedInfo(type);
      setTimeout(() => setCopiedInfo(null), 3000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleSiteClick = async (site: any, event: React.MouseEvent<HTMLAnchorElement>) => {
    // 楽天トラベルとじゃらんの場合はホテル名をコピー
    if (site.name === '楽天トラベル' || site.name === 'じゃらん') {
      event.preventDefault();
      
      try {
        await navigator.clipboard.writeText(hotel.name);
        setCopiedSite(site.name);
        
        // 3秒後にコピー状態をリセット
        setTimeout(() => setCopiedSite(null), 3000);
        
        // 少し遅れてページを開く（コピー完了を確認してから）
        setTimeout(() => {
          window.open(site.url, '_blank');
        }, 300);
      } catch (err) {
        // クリップボードAPIが使えない場合は直接開く
        window.open(site.url, '_blank');
      }
    }
  };

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
      url: getRakutenAreaUrl(hotel.city),
      needsCopy: true
    },
    {
      name: 'じゃらん',
      description: 'Pontaポイントが使える',
      color: '#f50057',
      icon: '✨',
      url: getJalanAreaUrl(hotel.city),
      needsCopy: true,
      searchTip: '上部の検索窓にホテル名を貼り付け'
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
        onClick: (e: any) => handleSiteClick(site, e),
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
              color: copiedSite === site.name ? '#10b981' : '#666',
              fontWeight: copiedSite === site.name ? '600' : 'normal'
            }
          }, copiedSite === site.name ? 'ホテル名をコピーしました！' : site.description)
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

    // ホテル情報セクション
    e('div', {
      key: 'hotel-info',
      style: {
        background: '#f8f9fa',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }
    }, [
      e('h3', {
        key: 'info-title',
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: '#374151'
        }
      }, '🏨 ホテル情報（クリックでコピー）'),
      
      // ホテル名
      e('div', {
        key: 'hotel-name-info',
        style: {
          marginBottom: '8px',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '4px',
          background: copiedInfo === 'name' ? '#d1fae5' : 'transparent',
          transition: 'background 0.2s'
        },
        onClick: () => handleCopyInfo(hotel.name, 'name')
      }, [
        e('span', { key: 'label', style: { fontSize: '12px', color: '#6b7280' } }, 'ホテル名: '),
        e('span', { key: 'value', style: { fontSize: '14px', fontWeight: '500' } }, hotel.name)
      ]),
      
      // 住所
      hotel.location && e('div', {
        key: 'location-info',
        style: {
          marginBottom: '8px',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '4px',
          background: copiedInfo === 'location' ? '#d1fae5' : 'transparent',
          transition: 'background 0.2s'
        },
        onClick: () => handleCopyInfo(hotel.location, 'location')
      }, [
        e('span', { key: 'label', style: { fontSize: '12px', color: '#6b7280' } }, '住所: '),
        e('span', { key: 'value', style: { fontSize: '14px' } }, hotel.location)
      ]),
      
      // 最寄り駅
      hotel.nearestStation && e('div', {
        key: 'station-info',
        style: {
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '4px',
          background: copiedInfo === 'station' ? '#d1fae5' : 'transparent',
          transition: 'background 0.2s'
        },
        onClick: () => handleCopyInfo(hotel.nearestStation, 'station')
      }, [
        e('span', { key: 'label', style: { fontSize: '12px', color: '#6b7280' } }, '最寄り駅: '),
        e('span', { key: 'value', style: { fontSize: '14px' } }, hotel.nearestStation)
      ])
    ]),

    // 検索のコツ
    e('div', {
      key: 'search-tips',
      style: {
        background: '#fef3c7',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }
    }, [
      e('h3', {
        key: 'tips-title',
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#92400e'
        }
      }, '🔍 楽天・じゃらんでの検索方法'),
      e('ol', {
        key: 'tips-list',
        style: {
          margin: 0,
          paddingLeft: '20px',
          fontSize: '12px',
          color: '#78350f'
        }
      }, [
        e('li', { key: '1', style: { marginBottom: '4px' } }, 'ページが開いたら上部の検索窓を探す'),
        e('li', { key: '2', style: { marginBottom: '4px' } }, 'ホテル名を貼り付けて検索'),
        e('li', { key: '3', style: { marginBottom: '4px' } }, '見つからない場合は住所や駅名でも検索')
      ])
    ]),

    // 注意事項
    e('p', {
      key: 'note',
      style: {
        marginTop: '20px',
        fontSize: '11px',
        color: '#9ca3af',
        textAlign: 'center'
      }
    }, '※ Google Hotels・Booking.comは直接検索結果が表示されます')
  ]));
};

export default BookingModal;