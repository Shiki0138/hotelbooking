import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

const { useState, useEffect, createElement: e } = React;

// ホテルの実際のデータ（Unsplash画像使用）
const hotelData = [
  {
    id: 'rakuten_74944',
    name: 'ザ・リッツ・カールトン東京',
    bookingUrl: 'https://travel.rakuten.co.jp/HOTEL/74944/',
    location: '東京都港区赤坂',
    city: '東京',
    rating: 4.8,
    reviewCount: 2543,
    price: 65000,
    originalPrice: 130000,
    discountPercentage: 50,
    thumbnailUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'
    ],
    access: '東京メトロ日比谷線六本木駅より徒歩5分',
    nearestStation: '六本木駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'バー'],
    badge: '人気'
  },
  {
    id: 'rakuten_40391',
    name: 'ザ・ブセナテラス',
    bookingUrl: 'https://travel.rakuten.co.jp/HOTEL/40391/',
    location: '沖縄県名護市喜瀬',
    city: '沖縄',
    rating: 4.7,
    reviewCount: 1876,
    price: 48000,
    originalPrice: 80000,
    discountPercentage: 40,
    thumbnailUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80'
    ],
    access: '那覇空港より車で約90分',
    nearestStation: '名護バスターミナル',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'プール', 'ビーチ', 'スパ', 'レストラン'],
    badge: 'リゾート'
  },
  {
    id: 'rakuten_67648',
    name: 'マンダリン オリエンタル 東京',
    bookingUrl: 'https://travel.rakuten.co.jp/HOTEL/67648/',
    location: '東京都中央区日本橋',
    city: '東京',
    rating: 4.9,
    reviewCount: 1234,
    price: 75000,
    originalPrice: 115000,
    discountPercentage: 35,
    thumbnailUrl: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'
    ],
    access: '東京メトロ銀座線三越前駅直結',
    nearestStation: '三越前駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'ラウンジ'],
    badge: '最高級'
  },
  {
    id: 'rakuten_168223',
    name: 'ハレクラニ沖縄',
    bookingUrl: 'https://travel.rakuten.co.jp/HOTEL/168223/',
    location: '沖縄県恩納村',
    city: '沖縄',
    rating: 4.8,
    reviewCount: 987,
    price: 60000,
    originalPrice: 110000,
    discountPercentage: 45,
    thumbnailUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'
    ],
    access: '那覇空港より車で約75分',
    nearestStation: '恩納村',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'プール', 'ビーチ', 'スパ', 'キッズクラブ'],
    badge: '新着'
  }
];

// ヘッダーコンポーネント（完全版）
const Header = ({ currentUser, onSignIn, onSignUp }: any) => {
  return e('header', {
    style: {
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }
  }, e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0 16px'
    }
  }, e('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: '64px'
    }
  }, [
    // ロゴセクション
    e('div', {
      key: 'logo',
      style: { display: 'flex', alignItems: 'center' }
    }, [
      e('h1', {
        key: 'title',
        style: { 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#2563eb', 
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
      }, 'LastMinuteStay'),
      e('span', {
        key: 'subtitle',
        style: { 
          marginLeft: '12px', 
          fontSize: '14px', 
          color: '#6b7280' 
        }
      }, '高級ホテルの直前予約')
    ]),
    
    // ナビゲーション
    e('nav', {
      key: 'nav',
      style: { display: 'flex', gap: '8px', alignItems: 'center' }
    }, [
      e('a', {
        key: 'regional',
        href: '#',
        style: {
          padding: '8px 16px',
          color: '#4b5563',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500'
        }
      }, '地域から探す'),
      currentUser ? [
        e('button', {
          key: 'favorites',
          style: {
            padding: '8px',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer'
          }
        }, e('svg', {
          width: '20',
          height: '20',
          viewBox: '0 0 20 20',
          fill: 'currentColor'
        }, e('path', {
          d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
        }))),
        e('button', {
          key: 'user',
          style: {
            padding: '8px',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer'
          }
        }, e('svg', {
          width: '20',
          height: '20',
          viewBox: '0 0 20 20',
          fill: 'currentColor'
        }, e('path', {
          fillRule: 'evenodd',
          d: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z',
          clipRule: 'evenodd'
        })))
      ] : [
        e('button', {
          key: 'signin',
          onClick: onSignIn,
          style: {
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            color: '#4b5563',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }
        }, 'ログイン'),
        e('button', {
          key: 'signup',
          onClick: onSignUp,
          style: {
            padding: '8px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }
        }, '新規登録')
      ]
    ])
  ])));
};

// ヒーローセクション（完全版）
const HeroSection = ({ onSearch }: any) => {
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkoutDate, setCheckoutDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    city: 'all',
    priceRange: 'all',
    sortBy: 'price'
  });

  return e('div', {
    style: {
      background: 'linear-gradient(to right, #1e3a8a 0%, #7c3aed 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }
  }, [
    // 背景オーバーレイ
    e('div', {
      key: 'overlay',
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)'
      }
    }),
    
    // コンテンツ
    e('div', {
      key: 'content',
      style: {
        position: 'relative',
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '48px 16px'
      }
    }, [
      e('h2', {
        key: 'title',
        style: { 
          fontSize: '48px', 
          fontWeight: 'bold', 
          marginBottom: '12px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }
      }, '高級ホテルをお得に予約'),
      e('p', {
        key: 'subtitle',
        style: { 
          fontSize: '20px', 
          marginBottom: '32px', 
          opacity: 0.95,
          color: '#dbeafe'
        }
      }, 'リッツ・カールトン、ブセナテラスなど人気の高級ホテルが最大50%OFF'),
      
      // 検索フォーム
      e('div', {
        key: 'search-form',
        style: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }
      }, e('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }
      }, [
        e('div', { key: 'checkin' }, [
          e('label', {
            key: 'label',
            style: { display: 'block', fontSize: '12px', marginBottom: '4px' }
          }, 'チェックイン'),
          e('input', {
            key: 'input',
            type: 'date',
            value: checkinDate,
            onChange: (e: any) => setCheckinDate(e.target.value),
            style: {
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              color: '#1f2937'
            }
          })
        ]),
        e('div', { key: 'checkout' }, [
          e('label', {
            key: 'label',
            style: { display: 'block', fontSize: '12px', marginBottom: '4px' }
          }, 'チェックアウト'),
          e('input', {
            key: 'input',
            type: 'date',
            value: checkoutDate,
            onChange: (e: any) => setCheckoutDate(e.target.value),
            style: {
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              color: '#1f2937'
            }
          })
        ]),
        e('div', {
          key: 'filter-btn',
          style: { display: 'flex', alignItems: 'flex-end' }
        }, e('button', {
          onClick: () => setShowFilters(!showFilters),
          style: {
            width: '100%',
            padding: '8px 16px',
            background: 'white',
            color: '#2563eb',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }
        }, [
          e('svg', {
            key: 'icon',
            width: '16',
            height: '16',
            viewBox: '0 0 20 20',
            fill: 'currentColor'
          }, e('path', {
            fillRule: 'evenodd',
            d: 'M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z',
            clipRule: 'evenodd'
          })),
          e('span', { key: 'text' }, 'フィルター')
        ]))
      ])),
      
      // フィルターパネル
      showFilters && e('div', {
        key: 'filters',
        style: {
          background: 'white',
          color: '#1f2937',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }
      }, e('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }
      }, [
        e('div', { key: 'city' }, [
          e('label', {
            key: 'label',
            style: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }
          }, 'エリア'),
          e('select', {
            key: 'select',
            value: filters.city,
            onChange: (e: any) => setFilters({...filters, city: e.target.value}),
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }
          }, [
            e('option', { key: 'all', value: 'all' }, 'すべてのエリア'),
            e('option', { key: 'tokyo', value: 'tokyo' }, '東京'),
            e('option', { key: 'osaka', value: 'osaka' }, '大阪'),
            e('option', { key: 'kyoto', value: 'kyoto' }, '京都'),
            e('option', { key: 'okinawa', value: 'okinawa' }, '沖縄')
          ])
        ]),
        e('div', { key: 'price' }, [
          e('label', {
            key: 'label',
            style: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }
          }, '価格帯'),
          e('select', {
            key: 'select',
            value: filters.priceRange,
            onChange: (e: any) => setFilters({...filters, priceRange: e.target.value}),
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }
          }, [
            e('option', { key: 'all', value: 'all' }, 'すべての価格'),
            e('option', { key: 'under20000', value: 'under20000' }, '〜¥20,000'),
            e('option', { key: '20000-40000', value: '20000-40000' }, '¥20,000〜¥40,000'),
            e('option', { key: '40000-60000', value: '40000-60000' }, '¥40,000〜¥60,000'),
            e('option', { key: 'over60000', value: 'over60000' }, '¥60,000〜')
          ])
        ]),
        e('div', { key: 'sort' }, [
          e('label', {
            key: 'label',
            style: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }
          }, '並び順'),
          e('select', {
            key: 'select',
            value: filters.sortBy,
            onChange: (e: any) => setFilters({...filters, sortBy: e.target.value}),
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }
          }, [
            e('option', { key: 'discount', value: 'discount' }, '割引率が高い順'),
            e('option', { key: 'price', value: 'price' }, '価格が安い順'),
            e('option', { key: 'rating', value: 'rating' }, '評価が高い順')
          ])
        ])
      ]))
    ])
  ]);
};

// タブセクション
const TabSection = ({ activeTab, onTabChange }: any) => {
  return e('div', {
    style: {
      background: 'linear-gradient(to right, #fef3c7, #fed7aa)',
      borderBottom: '1px solid #e5e7eb'
    }
  }, e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px 16px'
    }
  }, e('div', {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px'
    }
  }, [
    e('div', {
      key: 'title',
      style: { display: 'flex', alignItems: 'center', gap: '8px' }
    }, [
      e('span', {
        key: 'icon',
        style: { fontSize: '24px' }
      }, '⭐'),
      e('h3', {
        key: 'text',
        style: { fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }
      }, '今空いている人気の高級ホテル')
    ]),
    e('div', {
      key: 'tabs',
      style: { display: 'flex', gap: '8px' }
    }, [
      e('button', {
        key: 'luxury',
        onClick: () => onTabChange('luxury'),
        style: {
          padding: '8px 20px',
          background: activeTab === 'luxury' 
            ? 'linear-gradient(to right, #f59e0b, #f97316)' 
            : 'white',
          color: activeTab === 'luxury' ? 'white' : '#6b7280',
          border: activeTab === 'luxury' ? 'none' : '1px solid #e5e7eb',
          borderRadius: '8px',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s'
        }
      }, [
        e('span', { key: 'icon' }, '🏨'),
        e('span', { key: 'text' }, '高級ホテル')
      ]),
      e('button', {
        key: 'deals',
        onClick: () => onTabChange('deals'),
        style: {
          padding: '8px 20px',
          background: activeTab === 'deals' 
            ? 'linear-gradient(to right, #ef4444, #dc2626)' 
            : 'white',
          color: activeTab === 'deals' ? 'white' : '#6b7280',
          border: activeTab === 'deals' ? 'none' : '1px solid #e5e7eb',
          borderRadius: '8px',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s'
        }
      }, [
        e('span', { key: 'icon' }, '🎫'),
        e('span', { key: 'text' }, '直前割引')
      ])
    ])
  ])));
};

// 提携サイトバナー
const PartnerBanner = ({ showAllSources, onToggle }: any) => {
  return e('div', {
    style: {
      background: '#eff6ff',
      borderBottom: '1px solid #e5e7eb'
    }
  }, e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '12px 16px'
    }
  }, e('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px'
    }
  }, [
    e('div', {
      key: 'partners',
      style: { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px' }
    }, [
      e('span', { key: 'label', style: { color: '#6b7280' } }, '提携サイト:'),
      e('div', {
        key: 'sites',
        style: { display: 'flex', alignItems: 'center', gap: '12px' }
      }, [
        e('span', { key: 'rakuten', style: { fontWeight: '600', color: '#dc2626' } }, '楽天トラベル'),
        e('span', { key: 'sep1', style: { color: '#d1d5db' } }, '|'),
        e('span', { key: 'agoda', style: { color: '#6b7280' } }, 'アゴダ'),
        e('span', { key: 'sep2', style: { color: '#d1d5db' } }, '|'),
        e('span', { key: 'booking', style: { color: '#6b7280' } }, 'Booking.com'),
        e('span', { key: 'sep3', style: { color: '#d1d5db' } }, '|'),
        e('span', { key: 'expedia', style: { color: '#6b7280' } }, 'Expedia'),
        showAllSources && e('span', {
          key: 'badge',
          style: {
            marginLeft: '8px',
            padding: '2px 8px',
            background: '#d1fae5',
            color: '#065f46',
            borderRadius: '9999px',
            fontSize: '12px'
          }
        }, '全サイト検索中')
      ])
    ]),
    e('div', {
      key: 'controls',
      style: { display: 'flex', alignItems: 'center', gap: '12px' }
    }, [
      e('button', {
        key: 'toggle',
        onClick: onToggle,
        style: {
          position: 'relative',
          width: '44px',
          height: '24px',
          background: showAllSources ? '#10b981' : '#d1d5db',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }
      }, e('span', {
        style: {
          position: 'absolute',
          left: showAllSources ? '22px' : '2px',
          top: '2px',
          width: '20px',
          height: '20px',
          background: 'white',
          borderRadius: '50%',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }
      })),
      e('span', {
        key: 'label',
        style: { fontSize: '14px', fontWeight: '500', color: '#4b5563' }
      }, showAllSources ? '全サイト検索ON' : '楽天のみ'),
      e('span', { key: 'sep', style: { color: '#d1d5db' } }, '|'),
      e('a', {
        key: 'regional',
        href: '#',
        style: {
          color: '#2563eb',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500'
        }
      }, '地域別に探す →')
    ])
  ])));
};

// ホテルカード（完全版）
const HotelCard = ({ hotel }: any) => {
  const [isFavorite, setIsFavorite] = useState(false);
  
  return e('div', {
    style: {
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.3s',
      cursor: 'pointer',
      position: 'relative'
    },
    onMouseEnter: (e: any) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
    },
    onMouseLeave: (e: any) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    },
    onClick: () => {
      // ホテルカードクリックでも詳細ページへ遷移
      const bookingUrl = hotel.bookingUrl || `https://travel.rakuten.co.jp/HOTEL/${hotel.id.replace('rakuten_', '')}/`;
      window.open(bookingUrl, '_blank');
    }
  }, [
    // バッジ
    hotel.badge && e('div', {
      key: 'badge',
      style: {
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 10,
        padding: '4px 12px',
        background: hotel.badge === '人気' ? '#dc2626' : 
                    hotel.badge === '新着' ? '#2563eb' : 
                    hotel.badge === 'リゾート' ? '#10b981' : '#f59e0b',
        color: 'white',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    }, hotel.badge),
    
    // 割引バッジ
    e('div', {
      key: 'discount-badge',
      style: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 10,
        padding: '6px 12px',
        background: 'rgba(239, 68, 68, 0.9)',
        color: 'white',
        borderRadius: '6px',
        fontWeight: 'bold',
        fontSize: '14px'
      }
    }, `${hotel.discountPercentage}% OFF`),
    
    // お気に入りボタン
    e('button', {
      key: 'favorite',
      onClick: (e: any) => {
        e.stopPropagation();
        setIsFavorite(!isFavorite);
      },
      style: {
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        zIndex: 10,
        width: '36px',
        height: '36px',
        background: 'rgba(255, 255, 255, 0.9)',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }
    }, e('svg', {
      width: '20',
      height: '20',
      viewBox: '0 0 20 20',
      fill: isFavorite ? '#ef4444' : 'none',
      stroke: isFavorite ? '#ef4444' : '#6b7280',
      strokeWidth: '2'
    }, e('path', {
      d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
    }))),
    
    // 画像
    e('div', {
      key: 'image',
      style: {
        height: '200px',
        backgroundImage: `url(${hotel.thumbnailUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    }),
    
    // コンテンツ
    e('div', {
      key: 'content',
      style: { padding: '16px' }
    }, [
      // ホテル名と評価
      e('div', {
        key: 'header',
        style: { marginBottom: '8px' }
      }, [
        e('h3', {
          key: 'name',
          style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }
        }, hotel.name),
        e('div', {
          key: 'rating',
          style: { display: 'flex', alignItems: 'center', gap: '4px' }
        }, [
          e('div', {
            key: 'stars',
            style: { display: 'flex', color: '#f59e0b' }
          }, Array(5).fill(null).map((_, i) => 
            e('svg', {
              key: i,
              width: '16',
              height: '16',
              viewBox: '0 0 20 20',
              fill: i < Math.floor(hotel.rating) ? 'currentColor' : 'none',
              stroke: 'currentColor'
            }, e('path', {
              d: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
            }))
          )),
          e('span', {
            key: 'rating-text',
            style: { fontSize: '14px', color: '#6b7280' }
          }, `${hotel.rating} (${hotel.reviewCount}件)`)
        ])
      ]),
      
      // 場所
      e('p', {
        key: 'location',
        style: { fontSize: '14px', color: '#6b7280', marginBottom: '8px' }
      }, `📍 ${hotel.location}`),
      
      // アクセス
      e('p', {
        key: 'access',
        style: { fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }
      }, hotel.access),
      
      // アメニティ
      e('div', {
        key: 'amenities',
        style: { 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '4px',
          marginBottom: '12px'
        }
      }, hotel.amenities.slice(0, 4).map((amenity: string) =>
        e('span', {
          key: amenity,
          style: {
            padding: '2px 8px',
            background: '#f3f4f6',
            color: '#6b7280',
            borderRadius: '4px',
            fontSize: '11px'
          }
        }, amenity)
      )),
      
      // 価格セクション
      e('div', {
        key: 'price-section',
        style: { 
          borderTop: '1px solid #f3f4f6',
          paddingTop: '12px',
          marginBottom: '12px'
        }
      }, [
        e('div', {
          key: 'prices',
          style: { display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }
        }, [
          e('span', {
            key: 'original',
            style: {
              fontSize: '12px',
              color: '#9ca3af',
              textDecoration: 'line-through'
            }
          }, `¥${hotel.originalPrice.toLocaleString()}`),
          e('span', {
            key: 'current',
            style: {
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#ef4444'
            }
          }, `¥${hotel.price.toLocaleString()}`),
          e('span', {
            key: 'per-night',
            style: { fontSize: '12px', color: '#6b7280' }
          }, '/泊')
        ])
      ]),
      
      // 予約ボタン
      e('button', {
        key: 'book',
        onClick: (e: any) => {
          e.stopPropagation();
          // bookingUrlが設定されている場合はそれを使用、なければIDから生成
          const bookingUrl = hotel.bookingUrl || `https://travel.rakuten.co.jp/HOTEL/${hotel.id.replace('rakuten_', '')}/`;
          window.open(bookingUrl, '_blank');
        },
        style: {
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'transform 0.2s',
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
        },
        onMouseEnter: (e: any) => {
          e.currentTarget.style.transform = 'scale(1.02)';
        },
        onMouseLeave: (e: any) => {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }, '今すぐ予約')
    ])
  ]);
};

// ホテル一覧セクション
const HotelList = ({ activeTab }: any) => {
  const hotels = activeTab === 'deals' 
    ? hotelData.filter(h => h.discountPercentage >= 40)
    : hotelData;

  return e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '40px 16px'
    }
  }, [
    // セクションタイトル
    e('div', {
      key: 'header',
      style: { marginBottom: '32px' }
    }, [
      e('h2', {
        key: 'title',
        style: { fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }
      }, activeTab === 'luxury' ? '人気の高級ホテル' : '直前割引ホテル'),
      e('p', {
        key: 'subtitle',
        style: { fontSize: '16px', color: '#6b7280' }
      }, activeTab === 'luxury' 
        ? 'リッツ・カールトン、ブセナテラスなど、今空いている高級ホテル'
        : 'チェックイン3日前までの予約で最大半額に')
    ]),
    
    // 特別オファーバナー（直前割引の場合）
    activeTab === 'deals' && e('div', {
      key: 'offer-banner',
      style: {
        background: 'linear-gradient(to right, #ef4444, #f97316)',
        color: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
      }
    }, [
      e('div', {
        key: 'content',
        style: { display: 'flex', alignItems: 'center', gap: '16px' }
      }, [
        e('div', {
          key: 'icon',
          style: { fontSize: '48px' }
        }, '🎫'),
        e('div', { key: 'text' }, [
          e('h3', {
            key: 'title',
            style: { fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }
          }, '本日のスペシャルオファー'),
          e('p', {
            key: 'desc',
            style: { fontSize: '14px', opacity: 0.9 }
          }, 'チェックイン3日前までの予約で最大50%割引！')
        ])
      ]),
      e('div', {
        key: 'discount',
        style: { fontSize: '32px', fontWeight: 'bold' }
      }, '最大 -50%')
    ]),
    
    // ホテルグリッド
    e('div', {
      key: 'grid',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '24px'
      }
    }, hotels.map(hotel => 
      e(HotelCard, { key: hotel.id, hotel })
    ))
  ]);
};

// フッター
const Footer = () => {
  return e('footer', {
    style: {
      background: '#1f2937',
      color: 'white',
      marginTop: '80px'
    }
  }, e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '48px 16px'
    }
  }, [
    e('div', {
      key: 'content',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '40px',
        marginBottom: '40px'
      }
    }, [
      e('div', { key: 'company' }, [
        e('h4', {
          key: 'title',
          style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }
        }, 'LastMinuteStay'),
        e('p', {
          key: 'desc',
          style: { fontSize: '14px', color: '#9ca3af', lineHeight: 1.6 }
        }, '高級ホテルの直前予約で、特別な体験をお得に。')
      ]),
      e('div', { key: 'areas' }, [
        e('h4', {
          key: 'title',
          style: { fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }
        }, '人気エリア'),
        e('ul', {
          key: 'list',
          style: { listStyle: 'none', padding: 0, margin: 0 }
        }, ['東京のホテル', '大阪のホテル', '京都のホテル', '沖縄のホテル'].map(area =>
          e('li', {
            key: area,
            style: { marginBottom: '8px' }
          }, e('a', {
            href: '#',
            style: {
              color: '#9ca3af',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'color 0.2s'
            },
            onMouseEnter: (e: any) => e.currentTarget.style.color = '#fff',
            onMouseLeave: (e: any) => e.currentTarget.style.color = '#9ca3af'
          }, area))
        ))
      ]),
      e('div', { key: 'services' }, [
        e('h4', {
          key: 'title',
          style: { fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }
        }, 'サービス'),
        e('ul', {
          key: 'list',
          style: { listStyle: 'none', padding: 0, margin: 0 }
        }, ['会員登録', 'お気に入り', '価格アラート', 'よくある質問'].map(service =>
          e('li', {
            key: service,
            style: { marginBottom: '8px' }
          }, e('a', {
            href: '#',
            style: {
              color: '#9ca3af',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'color 0.2s'
            },
            onMouseEnter: (e: any) => e.currentTarget.style.color = '#fff',
            onMouseLeave: (e: any) => e.currentTarget.style.color = '#9ca3af'
          }, service))
        ))
      ]),
      e('div', { key: 'contact' }, [
        e('h4', {
          key: 'title',
          style: { fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }
        }, 'お問い合わせ'),
        e('p', {
          key: 'hours',
          style: { fontSize: '14px', color: '#9ca3af', marginBottom: '16px' }
        }, '24時間365日対応')
      ])
    ]),
    e('div', {
      key: 'copyright',
      style: {
        borderTop: '1px solid #374151',
        paddingTop: '32px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#9ca3af'
      }
    }, '© 2025 LastMinuteStay. All rights reserved.')
  ]));
};

// メインアプリケーション
const App = () => {
  const [activeTab, setActiveTab] = useState<'luxury' | 'deals'>('luxury');
  const [showAllSources, setShowAllSources] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  return e('div', {
    style: {
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "メイリオ", sans-serif'
    }
  }, [
    e(Header, { 
      key: 'header',
      currentUser,
      onSignIn: () => alert('ログイン機能'),
      onSignUp: () => alert('新規登録機能')
    }),
    e(HeroSection, { key: 'hero' }),
    e(TabSection, { 
      key: 'tabs',
      activeTab,
      onTabChange: setActiveTab
    }),
    e(PartnerBanner, {
      key: 'partners',
      showAllSources,
      onToggle: () => setShowAllSources(!showAllSources)
    }),
    e(HotelList, { 
      key: 'hotels',
      activeTab
    }),
    e(Footer, { key: 'footer' })
  ]);
};

export default App;