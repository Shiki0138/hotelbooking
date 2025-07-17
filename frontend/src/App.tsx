import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import HotelBookingService from './services/hotelBookingService';
import BookingModal from './components/BookingModal';
import DatePicker from './components/DatePicker';
import AuthModal from './components/AuthModal';
import PriceAlertModal from './components/PriceAlertModal';
import MyPage from './components/MyPage';
import PricePrediction from './components/PricePrediction';
import { ModernHeroSearch } from './components/ModernHeroSearch';
import { HotelPriceComparison } from './components/HotelPriceComparison';
import { UserTypeSelector } from './components/UserTypeSelector';
import { DateFixedSearch } from './components/DateFixedSearch';
import { DealSeekerSearch } from './components/DealSeekerSearch';
import { WeekendDeals } from './components/WeekendDeals';
import { RakutenAPITestComponent } from './components/RakutenAPITestComponent';
import { authService, favoritesService } from './services/supabase';
import { apiService } from './services/api.service';
import { hotelData } from './data/hotelData';
import { luxuryHotelsData } from './data/hotelDataLuxury';
import { HotelImageService } from './services/hotelImageService';
import { searchHotelsAsHotelData } from './data/hotelsDatabase';
import { comprehensiveHotelSearch } from './services/comprehensiveHotelSearch';

const { useState, useEffect, useMemo, createElement: e } = React;

// 今週末の日付を取得するユーティリティ関数
const getThisWeekendDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=日曜日, 6=土曜日
  
  // 今度の土曜日を計算
  const daysUntilSaturday = dayOfWeek === 0 ? 6 : (6 - dayOfWeek);
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSaturday);
  
  // 日曜日（チェックアウト）
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  
  return {
    checkin: saturday.toISOString().split('T')[0],
    checkout: sunday.toISOString().split('T')[0],
    displayCheckin: saturday.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
    displayCheckout: sunday.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  };
};

// ホテルを都道府県別にグループ化
const groupHotelsByPrefecture = (hotels: any[]) => {
  const grouped = hotels.reduce((acc, hotel) => {
    // locationから都道府県を抽出
    let prefecture = '不明';
    if (hotel.location) {
      if (hotel.location.includes('東京')) prefecture = '東京都';
      else if (hotel.location.includes('大阪')) prefecture = '大阪府';
      else if (hotel.location.includes('京都')) prefecture = '京都府';
      else if (hotel.location.includes('神奈川') || hotel.location.includes('横浜')) prefecture = '神奈川県';
      else if (hotel.location.includes('沖縄')) prefecture = '沖縄県';
      else if (hotel.location.includes('北海道') || hotel.location.includes('札幌')) prefecture = '北海道';
      else if (hotel.location.includes('静岡') || hotel.location.includes('箱根')) prefecture = '静岡県';
      else if (hotel.location.includes('長野') || hotel.location.includes('軽井沢')) prefecture = '長野県';
      else if (hotel.location.includes('千葉')) prefecture = '千葉県';
      else if (hotel.location.includes('兵庫') || hotel.location.includes('神戸')) prefecture = '兵庫県';
    }
    
    if (!acc[prefecture]) {
      acc[prefecture] = [];
    }
    acc[prefecture].push(hotel);
    return acc;
  }, {} as Record<string, any[]>);
  
  return grouped;
};

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
const HeroSection = ({ onDateChange, onFilterChange }: any) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    city: 'all',
    priceRange: 'all',
    sortBy: 'popular',
    hotelType: 'all'
  });
  
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

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
      }, '高級ホテルのリアルタイム予約'),
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
        ? '日付を選んで空き状況とリアルタイム価格を確認' 
        : '日付を選択して、空き状況とリアルタイム価格を確認してください'),
      
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
            onChange: (e: any) => handleFilterChange({...filters, city: e.target.value}),
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
            e('option', { key: 'okinawa', value: 'okinawa' }, '沖縄'),
            e('option', { key: 'hakone', value: 'hakone' }, '箱根'),
            e('option', { key: 'hokkaido', value: 'hokkaido' }, '北海道'),
            e('option', { key: 'karuizawa', value: 'karuizawa' }, '軽井沢')
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
            onChange: (e: any) => handleFilterChange({...filters, priceRange: e.target.value}),
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
            onChange: (e: any) => handleFilterChange({...filters, sortBy: e.target.value}),
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }
          }, [
            e('option', { key: 'popular', value: 'popular' }, '人気順'),
            e('option', { key: 'discount', value: 'discount' }, '割引率が高い順'),
            e('option', { key: 'price', value: 'price' }, '価格が安い順'),
            e('option', { key: 'rating', value: 'rating' }, '評価が高い順'),
            e('option', { key: 'available', value: 'available' }, '空室が多い順')
          ])
        ])
      ]))
    ])
  ]);
};

// タブセクション
const TabSection = ({ activeTab, onTabChange }: any) => {
  // 各タブのメタデータを定義
  const tabMetadata = {
    luxury: {
      icon: '🏨',
      title: '高級ホテル',
      subtitle: '厳選された上質な宿泊体験',
      badge: '評価4.5+',
      color: { from: '#f59e0b', to: '#f97316' },
      description: '一流サービスと極上の設備を楽しめる'
    },
    deals: {
      icon: '🎫',
      title: '直前割引',
      subtitle: '最大50%OFFの特別料金',
      badge: '即日予約可',
      color: { from: '#ef4444', to: '#dc2626' },
      description: 'チェックイン直前の限定オファー'
    }
  };

  return e('div', {
    style: {
      background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }
  }, e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px 16px'
    }
  }, [
    // セクションタイトル
    e('div', {
      key: 'header',
      style: {
        textAlign: 'center',
        marginBottom: '20px'
      }
    }, [
      e('div', {
        key: 'title',
        style: { 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '8px'
        }
      }, [
        e('span', {
          key: 'icon',
          style: { fontSize: '28px' }
        }, '⭐'),
        e('h3', {
          key: 'text',
          style: { 
            fontSize: window.innerWidth < 640 ? '18px' : '22px', 
            fontWeight: 'bold', 
            color: '#1f2937',
            margin: 0
          }
        }, 'ホテル検索カテゴリ')
      ]),
      e('p', {
        key: 'subtitle',
        style: {
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }
      }, 'お好みに合わせてホテルを探す')
    ]),
    
    // タブセクション
    e('div', {
      key: 'tabs-container',
      style: {
        display: 'flex',
        gap: window.innerWidth < 640 ? '12px' : '16px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, Object.entries(tabMetadata).map(([tabKey, metadata]: any) => 
      e('button', {
        key: tabKey,
        onClick: () => onTabChange(tabKey),
        style: {
          position: 'relative',
          padding: window.innerWidth < 640 ? '16px 20px' : '20px 28px',
          background: activeTab === tabKey 
            ? `linear-gradient(135deg, ${metadata.color.from}, ${metadata.color.to})` 
            : 'white',
          color: activeTab === tabKey ? 'white' : '#374151',
          border: activeTab === tabKey ? 'none' : '2px solid #e5e7eb',
          borderRadius: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          fontSize: window.innerWidth < 640 ? '14px' : '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease',
          boxShadow: activeTab === tabKey 
            ? '0 8px 25px rgba(0,0,0,0.15)' 
            : '0 2px 8px rgba(0,0,0,0.05)',
          transform: activeTab === tabKey ? 'translateY(-2px)' : 'translateY(0)',
          minWidth: window.innerWidth < 640 ? '140px' : '180px'
        },
        onMouseEnter: (e: any) => {
          if (activeTab !== tabKey) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }
        },
        onMouseLeave: (e: any) => {
          if (activeTab !== tabKey) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
          }
        }
      }, [
        // バッジ
        e('div', {
          key: 'badge',
          style: {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: activeTab === tabKey ? 'rgba(255,255,255,0.2)' : metadata.color.from,
            color: activeTab === tabKey ? 'white' : 'white',
            padding: '3px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }
        }, metadata.badge),
        
        // アイコン
        e('span', {
          key: 'icon',
          style: { 
            fontSize: window.innerWidth < 640 ? '32px' : '40px',
            marginBottom: '4px'
          }
        }, metadata.icon),
        
        // タイトル
        e('span', {
          key: 'title',
          style: { 
            fontSize: window.innerWidth < 640 ? '14px' : '16px',
            fontWeight: 'bold',
            textAlign: 'center'
          }
        }, metadata.title),
        
        // サブタイトル
        e('span', {
          key: 'subtitle',
          style: {
            fontSize: window.innerWidth < 640 ? '11px' : '12px',
            opacity: activeTab === tabKey ? 0.9 : 0.7,
            textAlign: 'center',
            lineHeight: '1.3'
          }
        }, metadata.subtitle),
        
        // 説明文
        !window.innerWidth || window.innerWidth >= 640 ? e('span', {
          key: 'description',
          style: {
            fontSize: '10px',
            opacity: 0.8,
            textAlign: 'center',
            marginTop: '4px',
            lineHeight: '1.2'
          }
        }, metadata.description) : null
      ])
    ))
  ]));
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
    if (priceData.agoda?.price) prices.push(priceData.agoda.price);
    if (priceData.booking?.price) prices.push(priceData.booking.price);
    if (priceData.expedia?.price) prices.push(priceData.expedia.price);
    if (priceData.rakuten?.price) prices.push(priceData.rakuten.price);
    return prices.length > 0 ? Math.min(...prices) : hotel.price;
  };
  
  // 最高値を取得
  const getHighestPrice = () => {
    if (!priceData) return hotel.originalPrice;
    const prices = [];
    if (priceData.agoda?.originalPrice) prices.push(priceData.agoda.originalPrice);
    if (priceData.booking?.originalPrice) prices.push(priceData.booking.originalPrice);
    if (priceData.expedia?.originalPrice) prices.push(priceData.expedia.originalPrice);
    if (priceData.rakuten?.originalPrice) prices.push(priceData.rakuten.originalPrice);
    return prices.length > 0 ? Math.max(...prices) : hotel.originalPrice;
  };
  
  // 空室状況を取得
  const getAvailabilityStatus = () => {
    if (loadingPrice) return { status: 'loading', message: '確認中...' };
    if (!priceData) return { status: 'unknown', message: '空室状況不明' };
    
    const availableCount = [
      priceData.agoda?.available,
      priceData.booking?.available,
      priceData.expedia?.available,
      priceData.rakuten?.available
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
      // ホテルカードクリックでGoogle Hotelsに日付付きで遷移
      console.log('🔍 ホテルカードクリック:', hotel.name);
      console.log('📅 選択された日付:', selectedDates);
      
      if (selectedDates?.checkin && selectedDates?.checkout) {
        const urls = await HotelBookingService.getBookingUrl(hotel, selectedDates.checkin, selectedDates.checkout);
        console.log('🔗 遷移先URL:', urls.primary);
        
        // デバッグ情報を表示
        HotelBookingService.debugUrls(hotel, selectedDates.checkin, selectedDates.checkout);
        
        window.open(urls.primary, '_blank');
      } else {
        // 日付未選択の場合はアラートで通知
        alert('日付を選択してからホテルをクリックしてください。');
      }
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
    
    // 画像（実際のホテル画像を使用）
    e('div', {
      key: 'image',
      style: {
        height: window.innerWidth < 640 ? '160px' : '200px',
        backgroundImage: `url(${hotel.imageData?.thumbnail || hotel.thumbnailUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f3f4f6'
      },
      onError: (e: any) => {
        // 画像読み込みエラー時はデフォルト画像を使用
        e.currentTarget.style.backgroundImage = `url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80)`;
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
        // 各OTAの価格表示（新規追加）
        priceData && selectedDates && e('div', {
          key: 'ota-prices',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            marginBottom: '12px',
            padding: '8px',
            background: '#f9fafb',
            borderRadius: '8px'
          }
        }, [
          // Agoda
          priceData.agoda && e('div', {
            key: 'agoda',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px'
            }
          }, [
            e('span', {
              key: 'logo',
              style: {
                fontWeight: 'bold',
                color: '#e74c3c'
              }
            }, 'Agoda'),
            e('span', {
              key: 'price',
              style: {
                color: priceData.agoda.available ? '#059669' : '#9ca3af',
                fontWeight: '500'
              }
            }, priceData.agoda.available ? `¥${priceData.agoda.price.toLocaleString()}` : '満室')
          ]),
          
          // Booking.com
          priceData.booking && e('div', {
            key: 'booking',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px'
            }
          }, [
            e('span', {
              key: 'logo',
              style: {
                fontWeight: 'bold',
                color: '#003580'
              }
            }, 'Booking'),
            e('span', {
              key: 'price',
              style: {
                color: priceData.booking.available ? '#059669' : '#9ca3af',
                fontWeight: '500'
              }
            }, priceData.booking.available ? `¥${priceData.booking.price.toLocaleString()}` : '満室')
          ]),
          
          // Expedia
          priceData.expedia && e('div', {
            key: 'expedia',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px'
            }
          }, [
            e('span', {
              key: 'logo',
              style: {
                fontWeight: 'bold',
                color: '#f5b342'
              }
            }, 'Expedia'),
            e('span', {
              key: 'price',
              style: {
                color: priceData.expedia.available ? '#059669' : '#9ca3af',
                fontWeight: '500'
              }
            }, priceData.expedia.available ? `¥${priceData.expedia.price.toLocaleString()}` : '満室')
          ]),
          
          // 楽天トラベル（あれば）
          priceData.rakuten && e('div', {
            key: 'rakuten',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px'
            }
          }, [
            e('span', {
              key: 'logo',
              style: {
                fontWeight: 'bold',
                color: '#bf0000'
              }
            }, '楽天'),
            e('span', {
              key: 'price',
              style: {
                color: priceData.rakuten.available ? '#059669' : '#9ca3af',
                fontWeight: '500'
              }
            }, priceData.rakuten.available ? `¥${priceData.rakuten.price.toLocaleString()}` : '満室')
          ])
        ]),
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
                backgroundColor: '#d1fae5',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: '500'
              }
            }, [
              e('span', { key: 'icon' }, '📅'),
              e('span', { key: 'date' }, selectedDates ? 
                `${new Date(selectedDates.checkin).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}〜${new Date(selectedDates.checkout).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の料金` : 
                '本日の料金'
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
              // 価格範囲表示（改良版 - より目立つように）
              (() => {
                const lowestPrice = getLowestPrice();
                const highestPrice = getHighestPrice();
                const hasRange = priceData && lowestPrice !== highestPrice;
                
                return hasRange ? 
                  // 価格範囲がある場合 - 範囲を強調表示
                  e('div', {
                    key: 'price-range-main',
                    style: { display: 'flex', flexDirection: 'column', gap: '4px' }
                  }, [
                    e('div', {
                      key: 'range-label',
                      style: {
                        fontSize: '12px',
                        color: '#059669',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }
                    }, [
                      e('span', { key: 'icon' }, '💰'),
                      e('span', { key: 'text' }, '価格帯')
                    ]),
                    e('div', {
                      key: 'price-range',
                      style: {
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }
                    }, [
                      e('span', { key: 'range' }, `¥${lowestPrice.toLocaleString()}`),
                      e('span', { 
                        key: 'separator',
                        style: { fontSize: '16px', color: '#6b7280' }
                      }, '〜'),
                      e('span', { key: 'max' }, `¥${highestPrice.toLocaleString()}`),
                      e('span', {
                        key: 'per-night',
                        style: { fontSize: '12px', color: '#6b7280' }
                      }, '/泊')
                    ]),
                    selectedDates && hotel.originalPrice && e('div', {
                      key: 'original-price',
                      style: {
                        fontSize: '11px',
                        color: '#9ca3af',
                        textDecoration: 'line-through'
                      }
                    }, `通常料金: ¥${hotel.originalPrice.toLocaleString()}/泊`)
                  ]) :
                  // 単一価格の場合 - 従来の表示
                  e('div', {
                    key: 'single-price',
                    style: { display: 'flex', alignItems: 'baseline', gap: '8px' }
                  }, [
                    selectedDates && hotel.originalPrice && e('span', {
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
                        color: selectedDates ? '#ef4444' : '#9ca3af'
                      }
                    }, loadingPrice ? '読込中...' : `¥${lowestPrice.toLocaleString()}`),
                    e('span', {
                      key: 'per-night',
                      style: { fontSize: '12px', color: '#6b7280' }
                    }, '/泊')
                  ]);
              })()
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
            console.log('📞 予約ボタンクリック:', hotel.name);
            console.log('📅 日付状態:', selectedDates);
            
            // 日付が選択されている場合は直接Google Hotelsに遷移
            if (selectedDates?.checkin && selectedDates?.checkout) {
              const urls = await HotelBookingService.getBookingUrl(hotel, selectedDates.checkin, selectedDates.checkout);
              console.log('🔗 予約URL:', urls.primary);
              
              // URLの詳細デバッグ情報
              HotelBookingService.debugUrls(hotel, selectedDates.checkin, selectedDates.checkout);
              
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
const HotelList = ({ activeTab, hotelPrices, loadingPrices, userFavorites, onToggleFavorite, currentUser, selectedDates, filters, comprehensiveSearchResults = [] }: any) => {
  const [selectedCity, setSelectedCity] = useState('all');
  
  // 重複を除去したユニークホテルリストを作成（IDと名前の両方で判定）
  const uniqueHotels = new Map();
  
  // luxuryHotelsDataを優先して追加
  luxuryHotelsData.forEach(hotel => {
    const idKey = hotel.id;
    uniqueHotels.set(idKey, hotel);
  });
  
  // hotelDataから重複していないもののみ追加
  hotelData.forEach(hotel => {
    const idKey = hotel.id;
    const nameKey = hotel.name.toLowerCase().replace(/\s+/g, '');
    
    // IDで重複チェック（優先）
    if (!uniqueHotels.has(idKey)) {
      // 同じ名前のホテルがないかもチェック
      const existingByName = Array.from(uniqueHotels.values()).find(
        existing => existing.name.toLowerCase().replace(/\s+/g, '') === nameKey
      );
      
      if (!existingByName) {
        uniqueHotels.set(idKey, hotel);
      }
    }
  });
  
  const allUniqueHotels = Array.from(uniqueHotels.values());
  console.log('🏨 重複除去:', {
    luxuryCount: luxuryHotelsData.length,
    basicCount: hotelData.length,
    totalBefore: luxuryHotelsData.length + hotelData.length,
    uniqueAfter: allUniqueHotels.length,
    duplicatesRemoved: (luxuryHotelsData.length + hotelData.length) - allUniqueHotels.length
  });

  // ホテル画像を非同期で読み込み
  React.useEffect(() => {
    const loadHotelImages = async () => {
      const hotelsToLoad = allUniqueHotels.slice(0, 20); // 最初の20件のみ
      
      // 画像をプリロード
      HotelImageService.preloadImages(hotelsToLoad);
      
      for (const hotel of hotelsToLoad) {
        if (!hotel.imageData) {
          try {
            const imageData = await HotelImageService.getHotelImage(hotel);
            hotel.imageData = imageData;
          } catch (error) {
            console.warn(`Failed to load image for ${hotel.name}:`, error);
          }
        }
      }
    };
    loadHotelImages();
  }, []);
  const dataSource = activeTab === 'luxury' ? allUniqueHotels : allUniqueHotels;
  
  // 都市のリストを取得
  const cities = Array.from(new Set(dataSource.map(h => h.city))).sort();
  
  // ホテルをフィルタリング
  let hotels = activeTab === 'deals' 
    ? hotelData.filter(h => h.discountPercentage >= 40)
    : dataSource;
    
  // ホテル名検索フィルター（DateFixedSearchから）
  if (filters?.hotelName && filters.hotelName.trim() !== '') {
    const searchTerm = filters.hotelName.trim();
    console.log('🔍 ホテル名検索:', {
      searchTerm,
      comprehensiveSearchResultsLength: comprehensiveSearchResults.length,
      hotelsBeforeFilter: hotels.length
    });
    
    // 包括的検索結果を使用（すでにuseEffectで取得済み）
    if (comprehensiveSearchResults.length > 0) {
      hotels = comprehensiveSearchResults;
      console.log('✅ 包括的検索結果を使用:', hotels.length, '件');
    } else {
      // フォールバック: ローカルDBから検索
      const searchResults = searchHotelsAsHotelData(searchTerm, 50);
      console.log('📚 ローカルDB検索結果:', searchResults.length, '件');
      
      // 既存のhotelDataからも検索
      const existingMatches = hotels.filter(h => {
        const hotelName = h.name?.toLowerCase() || '';
        return hotelName.includes(searchTerm.toLowerCase());
      });
      console.log('🏨 既存データ検索結果:', existingMatches.length, '件');
      
      // 検索結果をマージ（重複を除去）
      const mergedResults = [...searchResults];
      existingMatches.forEach(existing => {
        const isDuplicate = mergedResults.some(result => 
          result.name.toLowerCase() === existing.name.toLowerCase()
        );
        if (!isDuplicate) {
          mergedResults.push(existing);
        }
      });
      
      hotels = mergedResults;
      console.log('🔄 マージ後の結果:', hotels.length, '件');
      
      // 検索結果が0件の場合は空配列を維持（おすすめホテルを表示しない）
      if (hotels.length === 0) {
        console.log('❌ 検索結果が見つかりませんでした');
      }
    }
  }
    
  // 場所検索フィルター（新規追加）
  if (filters?.location && filters.location.trim() !== '') {
    const searchTerm = filters.location.toLowerCase();
    hotels = hotels.filter(h => {
      const hotelName = h.name?.toLowerCase() || '';
      const cityName = h.city?.toLowerCase() || '';
      const address = h.address?.toLowerCase() || '';
      return hotelName.includes(searchTerm) || 
             cityName.includes(searchTerm) || 
             address.includes(searchTerm);
    });
  }
  
  // エリアフィルター
  if (filters?.city && filters.city !== 'all') {
    hotels = hotels.filter(h => {
      const cityLower = h.city?.toLowerCase() || '';
      const filterLower = filters.city.toLowerCase();
      if (filterLower === 'tokyo') return cityLower.includes('東京');
      if (filterLower === 'osaka') return cityLower.includes('大阪');
      if (filterLower === 'kyoto') return cityLower.includes('京都');
      if (filterLower === 'okinawa') return cityLower.includes('沖縄');
      if (filterLower === 'hakone') return cityLower.includes('箱根');
      if (filterLower === 'hokkaido') return cityLower.includes('北海道') || cityLower.includes('札幌');
      if (filterLower === 'karuizawa') return cityLower.includes('軽井沢');
      return cityLower === filterLower;
    });
  } else if (selectedCity !== 'all') {
    hotels = hotels.filter(h => h.city === selectedCity);
  }
  
  // 価格帯フィルター
  if (filters?.priceRange && filters.priceRange !== 'all') {
    hotels = hotels.filter(h => {
      const price = hotelPrices?.[h.id]?.rakuten?.price || h.price;
      switch (filters.priceRange) {
        case 'under20000': return price < 20000;
        case '20000-40000': return price >= 20000 && price < 40000;
        case '40000-60000': return price >= 40000 && price < 60000;
        case 'over60000': return price >= 60000;
        default: return true;
      }
    });
  }
  
  // 空室があるホテルのみ表示（日付選択時）
  if (selectedDates && hotelPrices && Object.keys(hotelPrices).length > 0) {
    hotels = hotels.filter(h => {
      const priceData = hotelPrices[h.id];
      if (!priceData) return false;
      // 少なくとも1つのサイトで空室がある場合
      return priceData.rakuten?.available || 
             priceData.booking?.available || 
             priceData.jalan?.available || 
             priceData.google?.available;
    });
  }
  
  // ソート
  if (filters?.sortBy) {
    hotels = [...hotels].sort((a, b) => {
      switch (filters.sortBy) {
        case 'popular':
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'discount':
          return (b.discountPercentage || 0) - (a.discountPercentage || 0);
        case 'price':
          const priceA = hotelPrices?.[a.id]?.rakuten?.price || a.price;
          const priceB = hotelPrices?.[b.id]?.rakuten?.price || b.price;
          return priceA - priceB;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'available':
          // 空室数でソート（多い順）
          const availA = [hotelPrices?.[a.id]?.rakuten?.available,
                         hotelPrices?.[a.id]?.booking?.available,
                         hotelPrices?.[a.id]?.jalan?.available].filter(Boolean).length;
          const availB = [hotelPrices?.[b.id]?.rakuten?.available,
                         hotelPrices?.[b.id]?.booking?.available,
                         hotelPrices?.[b.id]?.jalan?.available].filter(Boolean).length;
          return availB - availA;
        default:
          return 0;
      }
    });
  }

  return e('div', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '40px 16px'
    }
  }, [
    // 現在の検索条件バナー
    (selectedDates || (filters.hotelName && filters.hotelName.trim() !== '')) && e('div', {
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
        key: 'conditions',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }
      }, [
        // ホテル名検索条件
        filters.hotelName && filters.hotelName.trim() !== '' && e('div', {
          key: 'hotel-name-info',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }
        }, [
          e('span', {
            key: 'icon',
            style: { fontSize: '24px' }
          }, '🏨'),
          e('div', { key: 'text' }, [
            e('div', {
              key: 'label',
              style: {
                fontSize: '12px',
                color: '#1e40af',
                fontWeight: '500'
              }
            }, '検索ホテル'),
            e('div', {
              key: 'hotel-name',
              style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1e3a8a'
              }
            }, filters.hotelName)
          ])
        ]),
        // 日付情報
        selectedDates && e('div', {
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
          }, '📅'),
          e('div', { key: 'text' }, [
            e('div', {
              key: 'label',
              style: {
                fontSize: '12px',
                color: '#1e40af',
                fontWeight: '500'
              }
            }, '宿泊日'),
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
        selectedDates && e('div', {
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
      // 検索クリアボタン
      e('button', {
        key: 'clear-search',
        onClick: () => {
          setFilters(prev => ({
            ...prev,
            hotelName: ''
          }));
          setSelectedDates(null);
        },
        style: {
          padding: '8px 16px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer'
        }
      }, '検索条件をクリア')
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
          }, filters.hotelName && filters.hotelName.trim() !== '' 
            ? `「${filters.hotelName}」の検索結果`
            : activeTab === 'luxury' ? '厳選・高級ホテル一覧' : '直前割引ホテル'),
          e('p', {
            key: 'subtitle',
            style: { fontSize: '16px', color: '#6b7280' }
          }, filters.hotelName && filters.hotelName.trim() !== ''
            ? (selectedDates 
              ? `${new Date(selectedDates.checkin).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}〜${new Date(selectedDates.checkout).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の空室状況`
              : '全期間の検索結果')
            : selectedDates 
              ? `${new Date(selectedDates.checkin).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}〜${new Date(selectedDates.checkout).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の空室状況を表示中`
              : activeTab === 'luxury' 
                ? `重複を除いた${dataSource.length}軒の厳選ホテル`
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
            e('option', { key: 'all', value: 'all' }, `全エリア (ユニーク${dataSource.length}軒)`),
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
      }, selectedDates && hotelPrices && Object.keys(hotelPrices).length > 0 
        ? `${hotels.length}軒のホテルに空室があります`
        : hotels.length > 0
          ? `${hotels.length}軒のホテルが見つかりました`
          : filters.hotelName && filters.hotelName.trim() !== ''
            ? `「${filters.hotelName}」に一致するホテルが見つかりませんでした`
            : '表示するホテルがありません')
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
    
    // ホテルグリッドまたは検索結果なしメッセージ
    hotels.length === 0 && filters?.hotelName && filters.hotelName.trim() !== '' ? 
      e('div', {
        key: 'no-results',
        style: {
          textAlign: 'center',
          padding: '60px 20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }
      }, [
        e('div', {
          key: 'icon',
          style: {
            fontSize: '48px',
            marginBottom: '16px'
          }
        }, '🔍'),
        e('h3', {
          key: 'title',
          style: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#374151',
            marginBottom: '8px'
          }
        }, '検索結果が見つかりませんでした'),
        e('p', {
          key: 'message',
          style: {
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '20px'
          }
        }, `「${filters.hotelName}」に一致するホテルが見つかりませんでした`),
        e('button', {
          key: 'clear-btn',
          onClick: () => {
            setFilters(prev => ({
              ...prev,
              hotelName: ''
            }));
          },
          style: {
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }
        }, '検索条件をクリア')
      ]) :
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

// 検索したホテルの価格比較セクション
const SearchedHotelPriceComparison = ({ hotelName, selectedDates, onSelectOTA }: any) => {
  console.log('🏨 SearchedHotelPriceComparison component loaded');
  console.log('🏨 Props received:', { hotelName, selectedDates });
  const [loading, setLoading] = useState(true);
  const [priceData, setPriceData] = useState<any>(null);

  useEffect(() => {
    console.log('📊 価格取得開始:', hotelName);
    const fetchPrices = async () => {
      setLoading(true);
      // 模擬的な価格データ（実際はAPIから取得）
      setTimeout(() => {
        const mockPrices = {
          rakuten: {
            available: true,
            price: Math.floor(Math.random() * 20000) + 15000,
            url: `https://travel.rakuten.co.jp/hotel/search?keyword=${encodeURIComponent(hotelName)}`
          },
          booking: {
            available: true,
            price: Math.floor(Math.random() * 20000) + 16000,
            url: `https://www.booking.com/search.html?ss=${encodeURIComponent(hotelName)}`
          },
          agoda: {
            available: true,
            price: Math.floor(Math.random() * 20000) + 14000,
            url: `https://www.agoda.com/search?cid=1234&q=${encodeURIComponent(hotelName)}`
          },
          expedia: {
            available: Math.random() > 0.3,
            price: Math.floor(Math.random() * 20000) + 17000,
            url: `https://www.expedia.co.jp/Hotel-Search?destination=${encodeURIComponent(hotelName)}`
          },
          jalan: {
            available: Math.random() > 0.2,
            price: Math.floor(Math.random() * 20000) + 15500,
            url: `https://www.jalan.net/hotel/search?keyword=${encodeURIComponent(hotelName)}`
          }
        };
        setPriceData(mockPrices);
        setLoading(false);
      }, 1000);
    };

    fetchPrices();
  }, [hotelName, selectedDates]);

  // 利用可能なOTAを価格順にソート
  const getAvailableOTAs = () => {
    if (!priceData) return [];
    
    return Object.entries(priceData)
      .filter(([_, data]: any) => data.available)
      .sort(([_, a]: any, [__, b]: any) => a.price - b.price)
      .slice(0, 3); // 上位3つのみ表示
  };

  const availableOTAs = getAvailableOTAs();
  const lowestPrice = availableOTAs[0]?.[1]?.price;

  const otaInfo: any = {
    rakuten: { name: '楽天トラベル', color: '#BF0000' },
    booking: { name: 'Booking.com', color: '#003580' },
    agoda: { name: 'Agoda', color: '#5C2E91' },
    expedia: { name: 'Expedia', color: '#FFC72C' },
    jalan: { name: 'じゃらん', color: '#FF6B00' }
  };

  console.log('🎯 Rendering SearchedHotelPriceComparison section');
  
  return e('div', {
    style: {
      background: 'red',
      color: 'white',
      padding: '20px',
      margin: '20px 0',
      fontSize: '18px',
      fontWeight: 'bold',
      textAlign: 'center'
    }
  }, `テスト: ${hotelName} の価格比較セクション`);
  
  return e('section', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '40px 16px',
      background: 'linear-gradient(to bottom, #f0f9ff, #ffffff)'
    }
  }, [
    // セクションヘッダー
    e('div', {
      key: 'header',
      style: {
        textAlign: 'center',
        marginBottom: '32px'
      }
    }, [
      e('div', {
        key: 'badge',
        style: {
          display: 'inline-block',
          background: '#ef4444',
          color: 'white',
          padding: '6px 20px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '16px'
        }
      }, '🔍 検索結果'),
      e('h2', {
        key: 'title',
        style: {
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#1e3a8a',
          marginBottom: '16px'
        }
      }, hotelName),
      e('p', {
        key: 'subtitle',
        style: {
          fontSize: '18px',
          color: '#64748b'
        }
      }, selectedDates 
        ? `${new Date(selectedDates.checkin).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} 〜 ${new Date(selectedDates.checkout).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}`
        : '日付を選択して最安値を確認')
    ]),

    // ホテル情報と価格比較を横並びに
    e('div', {
      key: 'content',
      style: {
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 2fr',
        gap: '24px'
      }
    }, [
      // ホテル情報カード
      e('div', {
        key: 'hotel-info',
        style: {
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }
      }, [
        // ホテル画像
        e('div', {
          key: 'image',
          style: {
            width: '100%',
            height: '200px',
            background: `url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80) center/cover`,
            borderRadius: '12px',
            marginBottom: '20px'
          }
        }),
        // 評価
        e('div', {
          key: 'rating',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }
        }, [
          e('div', {
            key: 'stars',
            style: {
              display: 'flex',
              color: '#f59e0b'
            }
          }, Array(5).fill(null).map((_, i) => 
            e('span', { key: i }, '★')
          )),
          e('span', {
            key: 'score',
            style: {
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1f2937'
            }
          }, '4.5'),
          e('span', {
            key: 'reviews',
            style: {
              fontSize: '14px',
              color: '#6b7280'
            }
          }, '(1,234件)')
        ]),
        // ホテル特徴
        e('div', {
          key: 'features',
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '16px'
          }
        }, ['温泉', 'WiFi無料', '朝食付き', '駐車場'].map(feature => 
          e('span', {
            key: feature,
            style: {
              padding: '4px 12px',
              background: '#e0e7ff',
              color: '#3730a3',
              borderRadius: '16px',
              fontSize: '12px'
            }
          }, feature)
        )),
        // 説明
        e('p', {
          key: 'description',
          style: {
            fontSize: '14px',
            color: '#4b5563',
            lineHeight: '1.6'
          }
        }, '快適な滞在をお約束する高級ホテル。最高のサービスと設備でお客様をお迎えいたします。')
      ]),

      // 価格比較カード
      e('div', {
        key: 'price-cards',
        style: {
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }
      }, [
      loading ? e('div', {
        key: 'loading',
        style: {
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280'
        }
      }, '価格を取得中...') : availableOTAs.length === 0 ? e('div', {
        key: 'no-results',
        style: {
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280'
        }
      }, '利用可能な予約サイトが見つかりませんでした') : [
        // 最安値表示
        e('div', {
          key: 'best-price',
          style: {
            background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'center'
          }
        }, [
          e('div', {
            key: 'label',
            style: {
              fontSize: '14px',
              marginBottom: '8px'
            }
          }, '🎉 本日の最安値'),
          e('div', {
            key: 'price',
            style: {
              fontSize: '36px',
              fontWeight: 'bold'
            }
          }, `¥${lowestPrice?.toLocaleString()}`),
          e('div', {
            key: 'provider',
            style: {
              fontSize: '16px',
              marginTop: '8px'
            }
          }, `${otaInfo[availableOTAs[0]?.[0]]?.name}で予約可能`)
        ]),

        // OTA一覧
        e('div', {
          key: 'ota-list',
          style: {
            display: 'grid',
            gap: '16px'
          }
        }, availableOTAs.map(([ota, data]: any, index: number) => 
          e('div', {
            key: ota,
            style: {
              border: index === 0 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: index === 0 ? '#fffbeb' : 'white'
            }
          }, [
            e('div', {
              key: 'info',
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }
            }, [
              index === 0 && e('div', {
                key: 'badge',
                style: {
                  background: '#f59e0b',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }
              }, '最安値'),
              e('div', { key: 'ota-details' }, [
                e('div', {
                  key: 'name',
                  style: {
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: otaInfo[ota].color
                  }
                }, otaInfo[ota].name),
                e('div', {
                  key: 'price',
                  style: {
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginTop: '4px'
                  }
                }, `¥${data.price.toLocaleString()}`)
              ])
            ]),
            e('button', {
              key: 'select',
              onClick: () => onSelectOTA(ota, data.url),
              style: {
                padding: '12px 24px',
                background: index === 0 ? '#f59e0b' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }
            }, '予約する')
          ])
        ))
        ]
      ])
    ])
  ]);
};

// 今週末空室セクション
const WeekendAvailabilitySection = ({ weekendPrices, onHotelClick }: any) => {
  const weekendDates = getThisWeekendDates();
  
  // 重複を除去したユニークホテルリストを作成
  const uniqueHotels = new Map();
  
  luxuryHotelsData.forEach(hotel => {
    const idKey = hotel.id;
    uniqueHotels.set(idKey, hotel);
  });
  
  hotelData.forEach(hotel => {
    const idKey = hotel.id;
    const nameKey = hotel.name.toLowerCase().replace(/\s+/g, '');
    
    if (!uniqueHotels.has(idKey)) {
      const existingByName = Array.from(uniqueHotels.values()).find(
        existing => existing.name.toLowerCase().replace(/\s+/g, '') === nameKey
      );
      
      if (!existingByName) {
        uniqueHotels.set(idKey, hotel);
      }
    }
  });
  
  const allUniqueHotels = Array.from(uniqueHotels.values());
  
  // 今週末空室があるホテルのみフィルタリング
  const availableHotels = allUniqueHotels.filter(hotel => {
    const priceData = weekendPrices?.[hotel.id];
    return priceData && (
      priceData.rakuten?.available || 
      priceData.booking?.available || 
      priceData.jalan?.available ||
      priceData.google?.available
    );
  });
  
  // 都道府県別にグループ化
  const hotelsByPrefecture = groupHotelsByPrefecture(availableHotels);
  
  // 各都道府県から上位3軒まで表示
  const prefectureOrder = ['東京都', '大阪府', '京都府', '神奈川県', '沖縄県', '北海道', '静岡県', '長野県'];
  
  return e('section', {
    style: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '60px 16px',
      background: '#f8fafc'
    }
  }, [
    // セクションヘッダー
    e('div', {
      key: 'header',
      style: { textAlign: 'center', marginBottom: '48px' }
    }, [
      e('h2', {
        key: 'title',
        style: {
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#1e293b'
        }
      }, '今週末空室あり'),
      e('p', {
        key: 'subtitle',
        style: {
          fontSize: '18px',
          color: '#64748b',
          marginBottom: '8px'
        }
      }, `${weekendDates.displayCheckin}〜${weekendDates.displayCheckout} の空室状況`),
      e('div', {
        key: 'dates-badge',
        style: {
          display: 'inline-block',
          padding: '8px 20px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: 'white',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600'
        }
      }, '土日1泊・参考価格表示中')
    ]),
    
    // 都道府県別セクション
    ...prefectureOrder.map(prefecture => {
      const prefectureHotels = hotelsByPrefecture[prefecture];
      if (!prefectureHotels || prefectureHotels.length === 0) return null;
      
      // 評価順で上位3軒
      const topHotels = prefectureHotels
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);
      
      return e('div', {
        key: prefecture,
        style: { marginBottom: '48px' }
      }, [
        // 都道府県タイトル
        e('div', {
          key: 'prefecture-header',
          style: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
            padding: '16px 24px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }
        }, [
          e('h3', {
            key: 'name',
            style: {
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1e293b',
              margin: 0
            }
          }, prefecture),
          e('span', {
            key: 'count',
            style: {
              marginLeft: '16px',
              padding: '4px 12px',
              background: '#dbeafe',
              color: '#1e40af',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600'
            }
          }, `${topHotels.length}軒空室あり`)
        ]),
        
        // ホテルカード
        e('div', {
          key: 'hotels',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '24px'
          }
        }, topHotels.map((hotel, index) => {
          const priceData = weekendPrices?.[hotel.id];
          const availablePrice = priceData?.rakuten?.price || priceData?.booking?.price || priceData?.jalan?.price || hotel.price;
          
          return e('div', {
            key: hotel.id,
            style: {
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s, box-shadow 0.3s',
              cursor: 'pointer',
              border: '1px solid #e2e8f0'
            },
            onMouseEnter: (e: any) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            },
            onMouseLeave: (e: any) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            },
            onClick: () => onHotelClick(hotel, weekendDates)
          }, [
            // バッジ
            e('div', {
              key: 'badges',
              style: { position: 'relative' }
            }, [
              // 空室バッジ
              e('div', {
                key: 'availability',
                style: {
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  zIndex: 10,
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }
              }, '空室あり'),
              
              // ランキングバッジ
              index < 1 && e('div', {
                key: 'ranking',
                style: {
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  zIndex: 10,
                  padding: '6px 12px',
                  background: '#f59e0b',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }
              }, '人気No.1')
            ]),
            
            // ホテル画像
            e('div', {
              key: 'image',
              style: {
                height: '200px',
                backgroundImage: `url(${hotel.imageData?.thumbnail || hotel.thumbnailUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#f3f4f6'
              }
            }),
            
            // ホテル情報
            e('div', {
              key: 'content',
              style: { padding: '20px' }
            }, [
              // ホテル名と評価
              e('div', {
                key: 'header',
                style: { marginBottom: '12px' }
              }, [
                e('h4', {
                  key: 'name',
                  style: {
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    color: '#1e293b'
                  }
                }, hotel.name),
                e('div', {
                  key: 'rating',
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }
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
                style: {
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '16px'
                }
              }, `📍 ${hotel.location}`),
              
              // 価格表示
              e('div', {
                key: 'pricing',
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }
              }, [
                e('div', {
                  key: 'price-info',
                  style: { flex: 1 }
                }, [
                  e('div', {
                    key: 'price',
                    style: {
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }
                  }, `¥${availablePrice?.toLocaleString()}`),
                  e('div', {
                    key: 'note',
                    style: {
                      fontSize: '12px',
                      color: '#6b7280'
                    }
                  }, '1泊・参考価格')
                ]),
                e('button', {
                  key: 'book-btn',
                  style: {
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  },
                  onClick: (e: any) => {
                    e.stopPropagation();
                    onHotelClick(hotel, weekendDates);
                  }
                }, '予約へ')
              ])
            ])
          ]);
        }))
      ]);
    }).filter(Boolean)
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
  const [selectedDates, setSelectedDates] = useState<{checkin: string, checkout: string} | null>({
    checkin: new Date().toISOString().split('T')[0],
    checkout: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });
  const [hotelPrices, setHotelPrices] = useState<any>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [weekendPrices, setWeekendPrices] = useState<any>({});
  const [loadingWeekendPrices, setLoadingWeekendPrices] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [showMyPage, setShowMyPage] = useState(false);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const [selectedHotelForComparison, setSelectedHotelForComparison] = useState<any>(null);
  const [filters, setFilters] = useState({
    city: 'all',
    priceRange: 'all',
    sortBy: 'popular',
    hotelType: 'all',
    location: '',
    guests: 2,
    hotelName: ''
  });
  
  // パフォーマンス最適化: 表示制限とロードモア機能
  const [displayLimit, setDisplayLimit] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // 検索タイプの状態を追加
  const [searchType, setSearchType] = useState<'hero' | 'date-fixed' | 'deal-seeker'>('hero');
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false);
  const [showAPITest, setShowAPITest] = useState(false);
  
  // 包括的検索結果の状態
  const [comprehensiveSearchResults, setComprehensiveSearchResults] = useState<any[]>([]);
  const [isSearchingHotels, setIsSearchingHotels] = useState(false);
  
  // デバッグ: データ数を確認
  // console.log('hotelData count:', hotelData.length);
  // console.log('luxuryHotelsData count:', luxuryHotelsData.length);
  
  // パフォーマンス最適化: デバウンス用のタイマー
  const [dateChangeTimer, setDateChangeTimer] = useState<NodeJS.Timeout | null>(null);
  
  // パフォーマンス最適化: メモ化された総ホテル数計算
  const totalUniqueHotels = useMemo(() => {
    const uniqueHotels = new Map();
    
    // luxuryHotelsDataを優先して追加
    luxuryHotelsData.forEach(hotel => {
      const idKey = hotel.id;
      uniqueHotels.set(idKey, hotel);
    });
    
    // hotelDataから重複していないもののみ追加
    hotelData.forEach(hotel => {
      const idKey = hotel.id;
      const nameKey = hotel.name.toLowerCase().replace(/\s+/g, '');
      
      // IDで重複チェック（優先）
      if (!uniqueHotels.has(idKey)) {
        // 同じ名前のホテルがないかもチェック
        const existingByName = Array.from(uniqueHotels.values()).find(
          existing => existing.name.toLowerCase().replace(/\s+/g, '') === nameKey
        );
        
        if (!existingByName) {
          uniqueHotels.set(idKey, hotel);
        }
      }
    });
    
    return uniqueHotels.size;
  }, []);
  
  // パフォーマンス最適化: Load More機能
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    
    // 段階的にホテル数を増加
    setTimeout(() => {
      setDisplayLimit(prev => prev + 20);
      setIsLoadingMore(false);
    }, 500);
  };
  
  // パフォーマンス最適化: デバウンス付き日付変更
  const handleDateChange = (checkin: string, checkout: string) => {
    setSelectedDates({ checkin, checkout });
    
    // 既存のタイマーをクリア
    if (dateChangeTimer) {
      clearTimeout(dateChangeTimer);
    }
    
    // デバウンス: 500ms後に価格取得を実行
    const newTimer = setTimeout(() => {
      if (checkin && checkout) {
        // 限定的な価格取得（パフォーマンス重視）
        fetchAllHotelPrices(checkin, checkout, displayLimit);
      }
    }, 500);
    
    setDateChangeTimer(newTimer);
  };
  
  // パフォーマンス最適化: 限定的なホテル価格取得
  const fetchAllHotelPrices = async (checkin: string, checkout: string, limit: number = 50) => {
    setLoadingPrices(true);
    const prices: any = {};
    
    // 重複を除去したユニークホテルリストを作成（最初は高級ホテルを優先）
    const uniqueHotels = new Map();
    
    // luxuryHotelsDataを優先して追加（パフォーマンス重視で制限）
    const limitedLuxuryHotels = luxuryHotelsData.slice(0, Math.min(limit * 0.7, 35));
    limitedLuxuryHotels.forEach(hotel => {
      const idKey = hotel.id;
      uniqueHotels.set(idKey, hotel);
    });
    
    // 残りの枠でhotelDataから追加（重複チェック済み）
    const remainingSlots = limit - uniqueHotels.size;
    if (remainingSlots > 0) {
      const limitedHotelData = hotelData.slice(0, Math.min(remainingSlots, 15));
      limitedHotelData.forEach(hotel => {
        const idKey = hotel.id;
        const nameKey = hotel.name.toLowerCase().replace(/\s+/g, '');
        
        // IDで重複チェック（優先）
        if (!uniqueHotels.has(idKey)) {
          // 同じ名前のホテルがないかもチェック
          const existingByName = Array.from(uniqueHotels.values()).find(
            existing => existing.name.toLowerCase().replace(/\s+/g, '') === nameKey
          );
          
          if (!existingByName) {
            uniqueHotels.set(idKey, hotel);
          }
        }
      });
    }
    
    const allUniqueHotels = Array.from(uniqueHotels.values());
    console.log('💰 パフォーマンス最適化価格取得:', {
      requestedLimit: limit,
      actualLoaded: allUniqueHotels.length,
      luxuryCount: limitedLuxuryHotels.length,
      regularCount: allUniqueHotels.length - limitedLuxuryHotels.length
    });
    
    allUniqueHotels.forEach((hotel) => {
      // ランダムな空室状況と価格を生成
      const basePrice = hotel.price || 50000;
      const randomMultiplier = 0.8 + Math.random() * 0.4; // 0.8〜1.2の範囲
      const hasAvailability = Math.random() > 0.3; // 70%の確率で空室あり
      
      prices[hotel.id] = {
        rakuten: {
          price: Math.floor(basePrice * randomMultiplier),
          available: hasAvailability && Math.random() > 0.2,
          lastUpdated: new Date().toISOString()
        },
        booking: {
          price: Math.floor(basePrice * randomMultiplier * 1.05),
          available: hasAvailability && Math.random() > 0.3,
          lastUpdated: new Date().toISOString()
        },
        jalan: {
          price: Math.floor(basePrice * randomMultiplier * 0.95),
          available: hasAvailability && Math.random() > 0.25,
          lastUpdated: new Date().toISOString()
        },
        google: {
          minPrice: Math.floor(basePrice * randomMultiplier * 0.9),
          maxPrice: Math.floor(basePrice * randomMultiplier * 1.1),
          available: hasAvailability,
          lastUpdated: new Date().toISOString()
        }
      };
    });
    
    // 最適化: 遅延を短縮
    setTimeout(() => {
      setHotelPrices(prices);
      setLoadingPrices(false);
    }, 300);
  };
  
  // パフォーマンス最適化: 限定的な今週末価格取得
  const fetchWeekendPrices = async (limit: number = 30) => {
    const weekendDates = getThisWeekendDates();
    setLoadingWeekendPrices(true);
    const prices: any = {};
    
    // 重複を除去したユニークホテルリストを作成（週末表示用に制限）
    const uniqueHotels = new Map();
    
    // 週末表示は高級ホテル中心で制限（パフォーマンス重視）
    const limitedLuxuryHotels = luxuryHotelsData.slice(0, Math.min(limit * 0.8, 24));
    limitedLuxuryHotels.forEach(hotel => {
      const idKey = hotel.id;
      uniqueHotels.set(idKey, hotel);
    });
    
    // 少数の一般ホテルも追加
    const remainingSlots = limit - uniqueHotels.size;
    if (remainingSlots > 0) {
      const limitedHotelData = hotelData.slice(0, Math.min(remainingSlots, 6));
      limitedHotelData.forEach(hotel => {
        const idKey = hotel.id;
        const nameKey = hotel.name.toLowerCase().replace(/\s+/g, '');
        
        if (!uniqueHotels.has(idKey)) {
          const existingByName = Array.from(uniqueHotels.values()).find(
            existing => existing.name.toLowerCase().replace(/\s+/g, '') === nameKey
          );
          
          if (!existingByName) {
            uniqueHotels.set(idKey, hotel);
          }
        }
      });
    }
    
    const allUniqueHotels = Array.from(uniqueHotels.values());
    console.log('🏖️ パフォーマンス最適化週末価格取得:', {
      weekend: `${weekendDates.displayCheckin}〜${weekendDates.displayCheckout}`,
      requestedLimit: limit,
      actualLoaded: allUniqueHotels.length,
      luxuryCount: limitedLuxuryHotels.length
    });
    
    allUniqueHotels.forEach((hotel) => {
      // 週末は価格が少し高めになる設定
      const basePrice = hotel.price || 50000;
      const weekendMultiplier = 1.2 + Math.random() * 0.3; // 1.2〜1.5倍
      const hasAvailability = Math.random() > 0.4; // 60%の確率で空室（週末なので少し厳しめ）
      
      prices[hotel.id] = {
        rakuten: {
          price: Math.floor(basePrice * weekendMultiplier),
          available: hasAvailability && Math.random() > 0.3,
          lastUpdated: new Date().toISOString()
        },
        booking: {
          price: Math.floor(basePrice * weekendMultiplier * 1.05),
          available: hasAvailability && Math.random() > 0.4,
          lastUpdated: new Date().toISOString()
        },
        jalan: {
          price: Math.floor(basePrice * weekendMultiplier * 0.95),
          available: hasAvailability && Math.random() > 0.35,
          lastUpdated: new Date().toISOString()
        },
        google: {
          minPrice: Math.floor(basePrice * weekendMultiplier * 0.9),
          maxPrice: Math.floor(basePrice * weekendMultiplier * 1.1),
          available: hasAvailability,
          lastUpdated: new Date().toISOString()
        }
      };
    });
    
    // 最適化: 遅延を短縮
    setTimeout(() => {
      setWeekendPrices(prices);
      setLoadingWeekendPrices(false);
    }, 400);
  };

  // 初回読み込み時にユーザー情報を確認と本日の価格を取得
  useEffect(() => {
    checkUser();
    // 本日と明日の日付で価格を取得（制限付き）
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    fetchAllHotelPrices(today, tomorrow, displayLimit);
    
    // 今週末の価格も取得（制限付き）
    fetchWeekendPrices(30);
    
    // ホテル画像を非同期で読み込み
    loadMainHotelImages();
  }, []);
  
  // メインのホテル画像読み込み
  const loadMainHotelImages = async () => {
    const uniqueHotels = new Map();
    
    // luxuryHotelsDataを優先して追加
    luxuryHotelsData.forEach(hotel => {
      const idKey = hotel.id;
      uniqueHotels.set(idKey, hotel);
    });
    
    // hotelDataから重複していないもののみ追加
    hotelData.forEach(hotel => {
      const idKey = hotel.id;
      const nameKey = hotel.name.toLowerCase().replace(/\s+/g, '');
      
      if (!uniqueHotels.has(idKey)) {
        const existingByName = Array.from(uniqueHotels.values()).find(
          existing => existing.name.toLowerCase().replace(/\s+/g, '') === nameKey
        );
        
        if (!existingByName) {
          uniqueHotels.set(idKey, hotel);
        }
      }
    });
    
    // 最初の50件のホテル画像を読み込み
    const hotelsToLoad = Array.from(uniqueHotels.values()).slice(0, 50);
    
    // 画像をプリロード
    HotelImageService.preloadImages(hotelsToLoad);
    
    for (const hotel of hotelsToLoad) {
      if (!hotel.imageData) {
        try {
          const imageData = await HotelImageService.getHotelImage(hotel);
          hotel.imageData = imageData;
        } catch (error) {
          console.warn(`Failed to load image for ${hotel.name}:`, error);
        }
      }
    }
  };
  
  // クリーンアップ: タイマーをクリア
  useEffect(() => {
    return () => {
      if (dateChangeTimer) {
        clearTimeout(dateChangeTimer);
      }
    };
  }, [dateChangeTimer]);
  
  // フィルター変更の監視
  useEffect(() => {
    console.log('📊 Filters changed:', filters);
  }, [filters]);

  // 包括的検索の実行
  useEffect(() => {
    const searchHotels = async () => {
      if (filters.hotelName && filters.hotelName.trim() !== '') {
        console.log('🔎 包括的検索開始:', filters.hotelName);
        setIsSearchingHotels(true);
        try {
          const results = await comprehensiveHotelSearch.searchAllHotels(filters.hotelName, 50);
          console.log('🔎 包括的検索API結果:', results.length, '件', results);
          
          // ComprehensiveHotelDataをホテルデータ形式に変換
          const convertedResults = results.map(result => ({
            id: result.id,
            name: result.name,
            city: result.city || result.prefecture,
            location: `${result.prefecture} ${result.city || ''}`.trim(),
            address: `${result.prefecture} ${result.city || ''}`.trim(),
            price: result.category === 'luxury' ? Math.floor(Math.random() * 50000) + 50000 :
                   result.category === 'business' ? Math.floor(Math.random() * 15000) + 8000 :
                   result.category === 'standard' ? Math.floor(Math.random() * 20000) + 10000 :
                   Math.floor(Math.random() * 10000) + 5000,
            rating: 4.5,
            image: '',
            features: [],
            description: '',
            reviewCount: 100,
            discountPercentage: 0,
            originalPrice: 0,
            images: [],
            searchRank: 1
          }));
          
          console.log('🔎 変換後の結果:', convertedResults.length, '件');
          setComprehensiveSearchResults(convertedResults);
        } catch (error) {
          console.error('包括的検索エラー:', error);
          setComprehensiveSearchResults([]);
        } finally {
          setIsSearchingHotels(false);
        }
      } else {
        console.log('🔎 検索クエリなし、結果をクリア');
        setComprehensiveSearchResults([]);
      }
    };
    
    searchHotels();
  }, [filters.hotelName]);
  
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
  
  // 今週末セクションのホテルクリック処理
  const handleWeekendHotelClick = async (hotel: any, weekendDates: any) => {
    console.log('🏖️ 今週末ホテルクリック:', hotel.name);
    console.log('📅 今週末日付:', weekendDates);
    
    // 今週末の日付で予約ページに遷移
    const urls = await HotelBookingService.getBookingUrl(hotel, weekendDates.checkin, weekendDates.checkout);
    console.log('🔗 遷移先URL:', urls.primary);
    
    // デバッグ情報を表示
    HotelBookingService.debugUrls(hotel, weekendDates.checkin, weekendDates.checkout);
    
    window.open(urls.primary, '_blank');
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

  // 日程固定検索のハンドラー
  const handleDateFixedSearch = async (params: any) => {
    console.log('🔍 Date fixed search params:', params);
    console.log('🔍 Current filters before update:', filters);
    
    // 検索パラメータから日付を設定
    if (params.checkIn && params.checkOut) {
      setSelectedDates({
        checkin: params.checkIn,
        checkout: params.checkOut
      });
    }
    
    // ホテル名でフィルタリング
    if (params.hotelName) {
      console.log('🏨 ホテル名設定:', params.hotelName);
      // ホテル名を含むホテルを検索（大文字小文字を保持）
      setFilters(prev => {
        const newFilters = {
          ...prev,
          hotelName: params.hotelName
        };
        console.log('📝 新しいフィルター設定中:', newFilters);
        return newFilters;
      });
    }
    
    // 検索結果画面に切り替え
    console.log('🔄 検索タイプをheroに変更');
    setSearchType('hero');
    setShowUserTypeSelector(false);
  };
  
  // お得な時期検索のハンドラー
  const handleDealSeekerSearch = async (params: any) => {
    console.log('Deal seeker search params:', params);
    
    // エリアとバジェットでフィルタリング
    if (params.area) {
      setFilters(prev => ({
        ...prev,
        location: params.area
      }));
    }
    
    if (params.budget) {
      const budgetNum = parseInt(params.budget);
      let priceRange = 'all';
      if (budgetNum <= 20000) priceRange = 'under20000';
      else if (budgetNum <= 40000) priceRange = '20000-40000';
      else if (budgetNum <= 60000) priceRange = '40000-60000';
      else priceRange = 'over60000';
      
      setFilters(prev => ({
        ...prev,
        priceRange
      }));
    }
    
    // 直前割引タブに切り替え
    setActiveTab('deals');
    
    // 検索結果画面に切り替え
    setSearchType('hero');
    setShowUserTypeSelector(false);
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
    // APIテストとユーザータイプ選択ボタン（常に表示）
    !showPriceComparison && !showAPITest && !showUserTypeSelector && searchType === 'hero' ? e('div', {
      key: 'control-buttons',
      style: {
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 10,
        display: 'flex',
        gap: '10px'
      }
    }, [
      e('button', {
        key: 'api-test-btn',
        onClick: () => setShowAPITest(true),
        style: {
          background: 'rgba(255,100,100,0.9)',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          color: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }
      }, '🧪 APIテスト'),
      e('button', {
        key: 'search-type-btn',
        onClick: () => setShowUserTypeSelector(true),
        style: {
          background: 'rgba(255,255,255,0.9)',
          border: '2px solid #E8B4B8',
          borderRadius: '20px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#E8B4B8',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s'
        },
        onMouseEnter: (e: any) => {
          e.currentTarget.style.background = '#E8B4B8';
          e.currentTarget.style.color = 'white';
        },
        onMouseLeave: (e: any) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
          e.currentTarget.style.color = '#E8B4B8';
        }
      }, '🎯 スタイル別検索')
    ]) : null,
    // モダンなヒーロー検索セクション
    showPriceComparison ? e(HotelPriceComparison, {
      key: 'price-comparison',
      hotelName: selectedHotelForComparison?.name || '',
      checkIn: selectedDates?.checkin || '',
      checkOut: selectedDates?.checkout || '',
      onSelectOTA: (provider: string, url: string) => {
        console.log(`Redirecting to ${provider}: ${url}`);
        // 実際のアフィリエイトリンクに遷移
        window.open(url, '_blank');
      }
    }) : showAPITest ? e(RakutenAPITestComponent, {
      key: 'api-test',
      onBack: () => setShowAPITest(false)
    }) : showUserTypeSelector ? e(UserTypeSelector, {
      key: 'user-type-selector',
      onUserTypeSelect: (type: 'date-fixed' | 'deal-seeker') => {
        setSearchType(type);
        setShowUserTypeSelector(false);
      }
    }) : searchType === 'date-fixed' ? e(DateFixedSearch, {
      key: 'date-fixed-search',
      onSearch: handleDateFixedSearch,
      onBack: () => {
        setSearchType('hero');
        setShowUserTypeSelector(false);
      }
    }) : searchType === 'deal-seeker' ? e(DealSeekerSearch, {
      key: 'deal-seeker-search',
      onSearch: handleDealSeekerSearch,
      onBack: () => {
        setSearchType('hero');
        setShowUserTypeSelector(false);
      }
    }) : e('div', { key: 'search-container' }, [
      // 検索したホテルの価格比較セクション（ホテル名検索時のみ表示）
      (() => {
        console.log('🔍 検索表示チェック in search-container:', {
          hotelName: filters.hotelName,
          trim: filters.hotelName?.trim(),
          condition: filters.hotelName && filters.hotelName.trim() !== '',
          searchType: searchType
        });
        // テスト用：常に表示
        if (filters.hotelName && filters.hotelName.trim() !== '') {
          return e(SearchedHotelPriceComparison, {
            key: 'searched-hotel-comparison',
            hotelName: filters.hotelName,
            selectedDates,
            onSelectOTA: (provider: string, url: string) => {
              console.log(`Redirecting to ${provider}: ${url}`);
              window.open(url, '_blank');
            }
          });
        }
        return null;
      })(),
      e(ModernHeroSearch, {
        key: 'modern-hero',
        onSearch: (params: any) => {
          console.log('Search params:', params);
          // ホテル検索処理
          if (params.query) {
            // ホテル名で検索して価格比較画面へ
            const hotel = [...luxuryHotelsData, ...hotelData].find(h => 
              h.name.toLowerCase().includes(params.query.toLowerCase())
            );
            if (hotel) {
              setSelectedHotelForComparison(hotel);
              setShowPriceComparison(true);
            }
          }
        },
        onAreaSelect: (area: string) => {
          console.log('Area selected:', area);
          // エリア選択処理
          if (area === 'weekend') {
            // 今週末の特価を表示
            setActiveTab('deals');
          } else {
            // エリアでフィルタリング
            setFilters(prev => ({
              ...prev,
              location: area
            }));
          }
        }
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
    // 今週末空室セクション
    e(WeekendAvailabilitySection, {
      key: 'weekend-availability',
      weekendPrices,
      onHotelClick: handleWeekendHotelClick
    }),
    e(HotelList, { 
      key: 'hotels',
      activeTab,
      hotelPrices,
      loadingPrices,
      userFavorites,
      onToggleFavorite: handleToggleFavorite,
      currentUser,
      selectedDates,
      filters,
      displayLimit,
      onLoadMore: handleLoadMore,
      isLoadingMore,
      comprehensiveSearchResults
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
      hotels: (() => {
        const uniqueHotels = new Map();
        
        luxuryHotelsData.forEach(hotel => {
          const idKey = hotel.id;
          uniqueHotels.set(idKey, hotel);
        });
        
        hotelData.forEach(hotel => {
          const idKey = hotel.id;
          const nameKey = hotel.name.toLowerCase().replace(/\s+/g, '');
          
          if (!uniqueHotels.has(idKey)) {
            const existingByName = Array.from(uniqueHotels.values()).find(
              existing => existing.name.toLowerCase().replace(/\s+/g, '') === nameKey
            );
            
            if (!existingByName) {
              uniqueHotels.set(idKey, hotel);
            }
          }
        });
        
        return Array.from(uniqueHotels.values());
      })(),
      onClose: () => setShowMyPage(false),
      onHotelClick: (hotel: any) => {
        // ホテルの詳細ページに移動（将来実装）
        console.log('Hotel clicked:', hotel);
      }
    })
  ]);
};

export default App;