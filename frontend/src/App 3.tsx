import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import HotelBookingService from './services/hotelBookingService';
import BookingModal from './components/BookingModal';
import DatePicker from './components/DatePicker';
import AuthModal from './components/AuthModal';
import PriceAlertModal from './components/PriceAlertModal';
import MyPage from './components/MyPage';
import PricePrediction from './components/PricePrediction';
import { authService, favoritesService } from './services/supabase';
import { hotelData } from './data/hotelData';
import { luxuryHotelsData } from './data/hotelDataLuxury';

const { useState, useEffect, createElement: e } = React;

// ヘッダーコンポーネント（完全版）
const Header = ({ currentUser, onSignIn, onSignUp, onMyPage }: any) => {
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
          fontSize: window.innerWidth < 640 ? '18px' : '24px', 
          fontWeight: 'bold', 
          color: '#2563eb', 
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: window.innerWidth < 640 ? '1.2' : '1.4',
          whiteSpace: 'nowrap'
        }
      }, window.innerWidth < 640 ? 'LMS' : 'LastMinuteStay'),
      window.innerWidth >= 640 && e('span', {
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
      style: { 
        display: 'flex', 
        gap: window.innerWidth < 640 ? '4px' : '8px', 
        alignItems: 'center',
        flexShrink: 0
      }
    }, [
      window.innerWidth >= 768 && e('a', {
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
          onClick: onMyPage,
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
            padding: window.innerWidth < 640 ? '6px 8px' : '8px 16px',
            background: 'none',
            border: 'none',
            color: '#4b5563',
            cursor: 'pointer',
            fontSize: window.innerWidth < 640 ? '12px' : '14px',
            fontWeight: '500'
          }
        }, window.innerWidth < 640 ? 'ログイン' : 'ログイン'),
        e('button', {
          key: 'signup',
          onClick: onSignUp,
          style: {
            padding: window.innerWidth < 640 ? '6px 12px' : '8px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: window.innerWidth < 640 ? '12px' : '14px',
            fontWeight: '500'
          }
        }, window.innerWidth < 640 ? '登録' : '新規登録')
      ]
    ])
  ])));
};

// ヒーローセクション（完全版）
const HeroSection = ({ onDateChange }: any) => {
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
          fontSize: window.innerWidth < 640 ? '24px' : '48px', 
          fontWeight: 'bold', 
          marginBottom: window.innerWidth < 640 ? '8px' : '12px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          lineHeight: window.innerWidth < 640 ? 1.3 : 1.2,
          textAlign: window.innerWidth < 640 ? 'center' : 'left'
        }
      }, '高級ホテルをお得に予約'),
      e('p', {
        key: 'subtitle',
        style: { 
          fontSize: window.innerWidth < 640 ? '14px' : '20px', 
          marginBottom: window.innerWidth < 640 ? '24px' : '32px', 
          opacity: 0.95,
          color: '#dbeafe',
          lineHeight: 1.5,
          textAlign: window.innerWidth < 640 ? 'center' : 'left'
        }
      }, window.innerWidth < 640 
        ? 'リッツ・カールトンなど高級ホテルが最大50%OFF' 
        : 'リッツ・カールトン、ブセナテラスなど人気の高級ホテルが最大50%OFF'),
      
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
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'stretch',
          maxWidth: '600px',
          margin: '0 auto'
        }
      }, [
        // 日付選択コンポーネント
        e(DatePicker, {
          key: 'date-picker',
          onDateChange: onDateChange
        }),
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
      justifyContent: window.innerWidth < 640 ? 'center' : 'space-between',
      alignItems: 'center',
      gap: window.innerWidth < 640 ? '12px' : '16px'
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
        style: { 
          fontSize: window.innerWidth < 640 ? '16px' : '18px', 
          fontWeight: 'bold', 
          color: '#1f2937',
          textAlign: window.innerWidth < 640 ? 'center' : 'left'
        }
      }, window.innerWidth < 640 ? '人気の高級ホテル' : '今空いている人気の高級ホテル')
    ]),
    e('div', {
      key: 'tabs',
      style: { display: 'flex', gap: '8px' }
    }, [
      e('button', {
        key: 'luxury',
        onClick: () => onTabChange('luxury'),
        style: {
          padding: window.innerWidth < 640 ? '6px 12px' : '8px 20px',
          background: activeTab === 'luxury' 
            ? 'linear-gradient(to right, #f59e0b, #f97316)' 
            : 'white',
          color: activeTab === 'luxury' ? 'white' : '#6b7280',
          border: activeTab === 'luxury' ? 'none' : '1px solid #e5e7eb',
          borderRadius: '8px',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: window.innerWidth < 640 ? '12px' : '14px',
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
          padding: window.innerWidth < 640 ? '6px 12px' : '8px 20px',
          background: activeTab === 'deals' 
            ? 'linear-gradient(to right, #ef4444, #dc2626)' 
            : 'white',
          color: activeTab === 'deals' ? 'white' : '#6b7280',
          border: activeTab === 'deals' ? 'none' : '1px solid #e5e7eb',
          borderRadius: '8px',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: window.innerWidth < 640 ? '12px' : '14px',
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
const HotelCard = ({ hotel, priceData, loadingPrice, isFavorite, onToggleFavorite, currentUser, selectedDates }: any) => {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [showPricePrediction, setShowPricePrediction] = useState(false);
  
  // 最安値を取得
  const getLowestPrice = () => {
    if (!priceData) return hotel.price;
    const prices = [];
    if (priceData.rakuten?.price) prices.push(priceData.rakuten.price);
    if (priceData.booking?.price) prices.push(priceData.booking.price);
    if (priceData.jalan?.price) prices.push(priceData.jalan.price);
    if (priceData.google?.minPrice) prices.push(priceData.google.minPrice);
    return prices.length > 0 ? Math.min(...prices) : hotel.price;
  };
  
  // 最高値を取得
  const getHighestPrice = () => {
    if (!priceData) return hotel.originalPrice;
    const prices = [];
    if (priceData.rakuten?.price) prices.push(priceData.rakuten.price);
    if (priceData.booking?.price) prices.push(priceData.booking.price);
    if (priceData.jalan?.price) prices.push(priceData.jalan.price);
    if (priceData.google?.maxPrice) prices.push(priceData.google.maxPrice);
    return prices.length > 0 ? Math.max(...prices) : hotel.originalPrice;
  };
  
  // 空室状況を取得
  const getAvailabilityStatus = () => {
    if (loadingPrice) return { status: 'loading', message: '確認中...' };
    if (!priceData) return { status: 'unknown', message: '空室状況不明' };
    
    const availableCount = [
      priceData.rakuten?.available,
      priceData.booking?.available,
      priceData.jalan?.available,
      priceData.google?.available
    ].filter(Boolean).length;
    
    if (availableCount === 0) return { status: 'unavailable', message: '満室' };
    if (availableCount >= 3) return { status: 'available', message: '空室あり' };
    return { status: 'limited', message: '残りわずか' };
  };
  
  return e(React.Fragment, {}, [
    e('div', {
      key: 'card',
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
    onClick: async () => {
      // ホテルカードクリックでも詳細ページへ遷移（日付付き）
      const urls = await HotelBookingService.getBookingUrl(hotel, selectedDates?.checkin, selectedDates?.checkout);
      window.open(urls.primary, '_blank');
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
      onClick: async (e: any) => {
        e.stopPropagation();
        if (!currentUser) {
          alert('お気に入りに追加するにはログインが必要です');
          return;
        }
        onToggleFavorite(hotel.id);
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
        height: window.innerWidth < 640 ? '160px' : '200px',
        backgroundImage: `url(${hotel.thumbnailUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    }),
    
    // コンテンツ
    e('div', {
      key: 'content',
      style: { padding: window.innerWidth < 640 ? '12px' : '16px' }
    }, [
      // ホテル名と評価
      e('div', {
        key: 'header',
        style: { marginBottom: '8px' }
      }, [
        e('h3', {
          key: 'name',
          style: { fontSize: window.innerWidth < 640 ? '16px' : '18px', fontWeight: 'bold', marginBottom: '4px' }
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
      
      // 空室状況表示
      selectedDates && e('div', {
        key: 'availability',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          padding: '8px',
          borderRadius: '6px',
          background: getAvailabilityStatus().status === 'available' ? '#d1fae5' :
                     getAvailabilityStatus().status === 'limited' ? '#fed7aa' :
                     getAvailabilityStatus().status === 'unavailable' ? '#fee2e2' : '#f3f4f6'
        }
      }, [
        e('span', {
          key: 'icon',
          style: { fontSize: '16px' }
        }, getAvailabilityStatus().status === 'available' ? '✅' :
            getAvailabilityStatus().status === 'limited' ? '⚠️' :
            getAvailabilityStatus().status === 'unavailable' ? '❌' : '🔄'),
        e('span', {
          key: 'text',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: getAvailabilityStatus().status === 'available' ? '#065f46' :
                   getAvailabilityStatus().status === 'limited' ? '#ea580c' :
                   getAvailabilityStatus().status === 'unavailable' ? '#dc2626' : '#6b7280'
          }
        }, getAvailabilityStatus().message)
      ]),
      
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
          key: 'price-info',
          style: { marginBottom: '8px' }
        }, [
          e('div', {
            key: 'prices',
            style: { marginBottom: '8px' }
          }, [
            // 日付表示
            e('div', {
              key: 'date-display',
              style: {
                fontSize: '12px',
                color: selectedDates ? '#059669' : '#dc2626',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: selectedDates ? '#d1fae5' : '#fee2e2',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: '500'
              }
            }, [
              e('span', { key: 'icon' }, '📅'),
              e('span', { key: 'date' }, selectedDates ? 
                `${new Date(selectedDates.checkin).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}〜${new Date(selectedDates.checkout).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の料金` : 
                '上の日付を選択して正確な料金を表示'
              ),
              loadingPrice && e('span', {
                key: 'loading',
                style: {
                  marginLeft: '4px',
                  animation: 'pulse 1s infinite'
                }
              }, '🔄')
            ]),
            // 価格表示
            e('div', {
              key: 'price-line',
              style: { display: 'flex', flexDirection: 'column', gap: '4px' }
            }, [
              // メイン価格行
              e('div', {
                key: 'main-price',
                style: { display: 'flex', alignItems: 'baseline', gap: '8px' }
              }, [
                !selectedDates && e('span', {
                  key: 'reference',
                  style: {
                    fontSize: '11px',
                    color: '#9ca3af',
                    marginRight: '8px'
                  }
                }, '参考価格'),
                e('span', {
                  key: 'original',
                  style: {
                    fontSize: '12px',
                    color: '#9ca3af',
                    textDecoration: selectedDates ? 'line-through' : 'none'
                  }
                }, selectedDates ? `¥${hotel.originalPrice.toLocaleString()}` : ''),
                e('span', {
                  key: 'current',
                  style: {
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#ef4444'
                  }
                }, loadingPrice ? '...' : `¥${getLowestPrice().toLocaleString()}`),
                e('span', {
                  key: 'per-night',
                  style: { fontSize: '12px', color: '#6b7280' }
                }, '/泊')
              ]),
              // 価格範囲表示（選択された日付がある場合）
              selectedDates && priceData && getLowestPrice() !== getHighestPrice() && e('div', {
                key: 'price-range',
                style: {
                  fontSize: '11px',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              }, [
                e('span', { key: 'icon' }, '💰'),
                e('span', { key: 'range' }, `¥${getLowestPrice().toLocaleString()} 〜 ¥${getHighestPrice().toLocaleString()}/泊`)
              ])
            ])
          ]),
          // AI価格予測ボタン
          e('button', {
            key: 'prediction',
            onClick: (e: any) => {
              e.stopPropagation();
              setShowPricePrediction(true);
            },
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'linear-gradient(to right, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            },
            onMouseEnter: (e: any) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            },
            onMouseLeave: (e: any) => {
              e.currentTarget.style.transform = 'scale(1)';
            }
          }, [
            e('span', { key: 'icon' }, '🤖'),
            e('span', { key: 'text' }, 'AI価格予測')
          ])
        ])
      ]),
      
      // ボタングループ
      e('div', {
        key: 'buttons',
        style: {
          display: 'flex',
          gap: '8px',
          marginBottom: '12px'
        }
      }, [
        // 予約ボタン
        e('button', {
          key: 'book',
          onClick: async (e: any) => {
            e.stopPropagation();
            // 日付が選択されている場合は直接Google Hotelsに遷移
            if (selectedDates?.checkin && selectedDates?.checkout) {
              const urls = await HotelBookingService.getBookingUrl(hotel, selectedDates.checkin, selectedDates.checkout);
              window.open(urls.primary, '_blank');
            } else {
              // 日付が未選択の場合はモーダルを表示
              setShowBookingModal(true);
            }
          },
          style: {
            flex: 1,
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
        }, '今すぐ予約'),
        
        // 価格アラートボタン
        e('button', {
          key: 'alert',
          onClick: (e: any) => {
            e.stopPropagation();
            setShowPriceAlertModal(true);
          },
          style: {
            width: '48px',
            padding: '12px',
            background: 'white',
            color: '#f59e0b',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          },
          onMouseEnter: (e: any) => {
            e.currentTarget.style.backgroundColor = '#fef3c7';
            e.currentTarget.style.transform = 'scale(1.02)';
          },
          onMouseLeave: (e: any) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.transform = 'scale(1)';
          },
          title: '価格アラートを設定'
        }, '🔔')
      ])
    ])
  ]),
    
    // 予約モーダル
    e(BookingModal, {
      key: 'booking-modal',
      hotel,
      isOpen: showBookingModal,
      onClose: () => setShowBookingModal(false)
    }),
    
    // 価格アラートモーダル
    e(PriceAlertModal, {
      key: 'price-alert-modal',
      hotel,
      isOpen: showPriceAlertModal,
      onClose: () => setShowPriceAlertModal(false),
      currentUser
    }),
    
    // 価格予測モーダル
    showPricePrediction && e(PricePrediction, {
      key: 'price-prediction',
      hotel,
      onClose: () => setShowPricePrediction(false)
    })
  ]);
};

// ホテル一覧セクション
const HotelList = ({ activeTab, hotelPrices, loadingPrices, userFavorites, onToggleFavorite, currentUser, selectedDates }: any) => {
  const [selectedCity, setSelectedCity] = useState('all');
  
  // 使用するデータソースを決定
  const dataSource = activeTab === 'luxury' ? luxuryHotelsData : hotelData;
  
  // 都市のリストを取得
  const cities = Array.from(new Set(dataSource.map(h => h.city))).sort();
  
  // ホテルをフィルタリング
  let hotels = activeTab === 'deals' 
    ? hotelData.filter(h => h.discountPercentage >= 40)
    : dataSource;
    
  if (selectedCity !== 'all') {
    hotels = hotels.filter(h => h.city === selectedCity);
  }

  return e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '40px 16px'
    }
  }, [
    // 現在の検索条件バナー
    selectedDates && e('div', {
      key: 'search-conditions',
      style: {
        background: 'linear-gradient(to right, #dbeafe, #e0e7ff)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        border: '1px solid #93c5fd'
      }
    }, [
      e('div', {
        key: 'date-info',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }
      }, [
        e('span', {
          key: 'icon',
          style: { fontSize: '24px' }
        }, '✅'),
        e('div', { key: 'text' }, [
          e('div', {
            key: 'label',
            style: {
              fontSize: '12px',
              color: '#1e40af',
              fontWeight: '500'
            }
          }, '現在表示中の料金'),
          e('div', {
            key: 'dates',
            style: {
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1e3a8a'
            }
          }, `${new Date(selectedDates.checkin).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} 〜 ${new Date(selectedDates.checkout).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}`)
        ])
      ]),
      e('div', {
        key: 'nights',
        style: {
          padding: '8px 16px',
          background: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#1e40af'
        }
      }, `${Math.ceil((new Date(selectedDates.checkout).getTime() - new Date(selectedDates.checkin).getTime()) / (1000 * 60 * 60 * 24))}泊`)
    ]),
    
    // セクションタイトルとエリアフィルター
    e('div', {
      key: 'header',
      style: { marginBottom: '32px' }
    }, [
      e('div', {
        key: 'title-row',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px'
        }
      }, [
        e('div', { key: 'title-section' }, [
          e('h2', {
            key: 'title',
            style: { fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }
          }, activeTab === 'luxury' ? '人気の高級ホテル' : '直前割引ホテル'),
          e('p', {
            key: 'subtitle',
            style: { fontSize: '16px', color: '#6b7280' }
          }, activeTab === 'luxury' 
            ? `全国${dataSource.length}軒の高級ホテルからセレクト`
            : 'チェックイン3日前までの予約で最大半額に')
        ]),
        // エリアフィルター
        e('div', {
          key: 'city-filter',
          style: {
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }
        }, [
          e('span', {
            key: 'label',
            style: {
              fontSize: '14px',
              color: '#6b7280',
              fontWeight: '500'
            }
          }, 'エリア:'),
          e('select', {
            key: 'select',
            value: selectedCity,
            onChange: (e: any) => setSelectedCity(e.target.value),
            style: {
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '120px'
            }
          }, [
            e('option', { key: 'all', value: 'all' }, `全エリア (${dataSource.length}軒)`),
            ...cities.map(city => {
              const count = dataSource.filter(h => h.city === city).length;
              return e('option', { key: city, value: city }, `${city} (${count}軒)`);
            })
          ]),
          selectedCity !== 'all' && e('button', {
            key: 'clear',
            onClick: () => setSelectedCity('all'),
            style: {
              padding: '6px 12px',
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }
          }, 'クリア')
        ])
      ]),
      // ホテル数表示
      e('div', {
        key: 'hotel-count',
        style: {
          padding: '8px 16px',
          background: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#4b5563',
          display: 'inline-block'
        }
      }, `${hotels.length}軒のホテルが見つかりました`)
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
        gridTemplateColumns: window.innerWidth < 640 ? '1fr' : 
                             window.innerWidth < 1024 ? 'repeat(2, 1fr)' : 
                             'repeat(auto-fill, minmax(300px, 1fr))',
        gap: window.innerWidth < 640 ? '16px' : '24px'
      }
    }, hotels.map(hotel => 
      e(HotelCard, { 
        key: hotel.id, 
        hotel,
        priceData: hotelPrices?.[hotel.id],
        loadingPrice: loadingPrices,
        isFavorite: userFavorites.includes(hotel.id),
        onToggleFavorite,
        currentUser,
        selectedDates
      })
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedDates, setSelectedDates] = useState({
    checkin: new Date().toISOString().split('T')[0],
    checkout: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });
  const [hotelPrices, setHotelPrices] = useState<any>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [showMyPage, setShowMyPage] = useState(false);
  
  // デバッグ: データ数を確認
  // console.log('hotelData count:', hotelData.length);
  // console.log('luxuryHotelsData count:', luxuryHotelsData.length);
  
  // 日付が変更されたら価格を再取得
  const handleDateChange = (checkin: string, checkout: string) => {
    setSelectedDates({ checkin, checkout });
    if (checkin && checkout) {
      fetchAllHotelPrices(checkin, checkout);
    }
  };
  
  // 全ホテルの価格を取得
  const fetchAllHotelPrices = async (checkin: string, checkout: string) => {
    setLoadingPrices(true);
    const prices: any = {};
    
    // 各ホテルの価格を並列で取得（両方のデータソースから）
    const allHotels = [...hotelData, ...luxuryHotelsData];
    await Promise.all(
      allHotels.map(async (hotel) => {
        try {
          const response = await fetch(
            `/api/hotel-prices?hotelName=${encodeURIComponent(hotel.name)}&checkin=${checkin}&checkout=${checkout}`
          );
          if (response.ok) {
            const data = await response.json();
            prices[hotel.id] = data;
          }
        } catch (error) {
          console.error(`Failed to fetch price for ${hotel.name}:`, error);
        }
      })
    );
    
    setHotelPrices(prices);
    setLoadingPrices(false);
  };
  
  // 初回読み込み時に価格を取得とユーザー情報を確認
  useEffect(() => {
    fetchAllHotelPrices(selectedDates.checkin, selectedDates.checkout);
    checkUser();
  }, []);
  
  // ユーザー情報を確認
  const checkUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const favorites = await favoritesService.getUserFavorites();
        setUserFavorites(favorites);
      }
    } catch (error) {
      console.error('Failed to check user:', error);
    }
  };
  
  // 認証成功時の処理
  const handleAuthSuccess = async (user: any) => {
    setCurrentUser(user);
    const favorites = await favoritesService.getUserFavorites();
    setUserFavorites(favorites);
  };
  
  // サインアウト
  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setCurrentUser(null);
      setUserFavorites([]);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };
  
  // お気に入りをトグル
  const handleToggleFavorite = async (hotelId: string) => {
    if (!currentUser) {
      setAuthMode('signin');
      setShowAuthModal(true);
      return;
    }
    
    try {
      if (userFavorites.includes(hotelId)) {
        await favoritesService.removeFavorite(hotelId);
        setUserFavorites(userFavorites.filter(id => id !== hotelId));
      } else {
        await favoritesService.addFavorite(hotelId);
        setUserFavorites([...userFavorites, hotelId]);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('お気に入りの更新に失敗しました');
    }
  };

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
      onSignIn: () => {
        setAuthMode('signin');
        setShowAuthModal(true);
      },
      onSignUp: () => {
        setAuthMode('signup');
        setShowAuthModal(true);
      },
      onMyPage: () => setShowMyPage(true)
    }),
    e(HeroSection, { 
      key: 'hero',
      onDateChange: handleDateChange
    }),
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
      activeTab,
      hotelPrices,
      loadingPrices,
      userFavorites,
      onToggleFavorite: handleToggleFavorite,
      currentUser,
      selectedDates
    }),
    e(Footer, { key: 'footer' }),
    
    // 認証モーダル
    e(AuthModal, {
      key: 'auth-modal',
      isOpen: showAuthModal,
      onClose: () => setShowAuthModal(false),
      onSuccess: handleAuthSuccess,
      mode: authMode
    }),
    
    // マイページ
    showMyPage && currentUser && e(MyPage, {
      key: 'my-page',
      currentUser,
      hotels: [...hotelData, ...luxuryHotelsData],
      onClose: () => setShowMyPage(false),
      onHotelClick: (hotel: any) => {
        // ホテルの詳細ページに移動（将来実装）
        console.log('Hotel clicked:', hotel);
      }
    })
  ]);
};

export default App;