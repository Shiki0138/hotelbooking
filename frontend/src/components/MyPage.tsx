import * as React from 'react';
import { authService, favoritesService, priceAlertService } from '../services/supabase';

const { useState, useEffect, createElement: e } = React;

interface MyPageProps {
  currentUser: any;
  hotels: any[];
  onClose: () => void;
  onHotelClick: (hotel: any) => void;
}

const MyPage = ({ currentUser, hotels, onClose, onHotelClick }: MyPageProps) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'alerts'>('favorites');
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [userAlerts, setUserAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [favorites, alerts] = await Promise.all([
        favoritesService.getUserFavorites(),
        priceAlertService.getUserAlerts()
      ]);
      setUserFavorites(favorites);
      setUserAlerts(alerts);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await priceAlertService.deleteAlert(alertId);
      await loadUserData();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const favoriteHotels = hotels.filter(h => userFavorites.includes(h.id));
  const alertsWithHotels = userAlerts.map(alert => ({
    ...alert,
    hotel: hotels.find(h => h.id === alert.hotel_id)
  })).filter(a => a.hotel);

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
      zIndex: 1000,
      padding: '20px'
    },
    onClick: onClose
  }, e('div', {
    style: {
      backgroundColor: 'white',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '80vh',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column'
    },
    onClick: (e: any) => e.stopPropagation()
  }, [
    // ヘッダー
    e('div', {
      key: 'header',
      style: {
        padding: window.innerWidth < 640 ? '20px' : '24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, [
      e('div', { key: 'user-info' }, [
        e('h2', {
          key: 'title',
          style: {
            fontSize: window.innerWidth < 640 ? '20px' : '24px',
            fontWeight: 'bold',
            margin: 0,
            color: '#1f2937'
          }
        }, 'マイページ'),
        e('p', {
          key: 'email',
          style: {
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '4px'
          }
        }, currentUser?.email)
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
          color: '#6b7280'
        }
      }, '×')
    ]),

    // タブ
    e('div', {
      key: 'tabs',
      style: {
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }
    }, [
      e('button', {
        key: 'favorites-tab',
        onClick: () => setActiveTab('favorites'),
        style: {
          flex: 1,
          padding: '16px',
          background: 'none',
          border: 'none',
          borderBottom: activeTab === 'favorites' ? '2px solid #2563eb' : '2px solid transparent',
          color: activeTab === 'favorites' ? '#2563eb' : '#6b7280',
          fontWeight: activeTab === 'favorites' ? '600' : '500',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }
      }, [
        e('span', { key: 'icon' }, '❤️ '),
        e('span', { key: 'text' }, `お気に入り (${favoriteHotels.length})`)
      ]),
      e('button', {
        key: 'alerts-tab',
        onClick: () => setActiveTab('alerts'),
        style: {
          flex: 1,
          padding: '16px',
          background: 'none',
          border: 'none',
          borderBottom: activeTab === 'alerts' ? '2px solid #2563eb' : '2px solid transparent',
          color: activeTab === 'alerts' ? '#2563eb' : '#6b7280',
          fontWeight: activeTab === 'alerts' ? '600' : '500',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }
      }, [
        e('span', { key: 'icon' }, '🔔 '),
        e('span', { key: 'text' }, `価格アラート (${userAlerts.length})`)
      ])
    ]),

    // コンテンツ
    e('div', {
      key: 'content',
      style: {
        flex: 1,
        overflow: 'auto',
        padding: window.innerWidth < 640 ? '16px' : '24px'
      }
    }, loading ? e('div', {
      style: {
        textAlign: 'center',
        padding: '40px',
        color: '#6b7280'
      }
    }, '読み込み中...') : 
    
    activeTab === 'favorites' ? (
      favoriteHotels.length === 0 ? 
      e('div', {
        style: {
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280'
        }
      }, [
        e('p', {
          key: 'empty',
          style: { fontSize: '16px', marginBottom: '8px' }
        }, 'お気に入りがまだありません'),
        e('p', {
          key: 'hint',
          style: { fontSize: '14px' }
        }, 'ホテルの❤️ボタンをクリックして追加しましょう')
      ]) :
      e('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 640 ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px'
        }
      }, favoriteHotels.map(hotel => 
        e('div', {
          key: hotel.id,
          style: {
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.2s'
          },
          onClick: () => {
            onHotelClick(hotel);
            onClose();
          },
          onMouseEnter: (e: any) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          },
          onMouseLeave: (e: any) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }
        }, [
          // 画像
          e('div', {
            key: 'image',
            style: {
              height: '120px',
              backgroundImage: `url(${hotel.thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }
          }),
          // 情報
          e('div', {
            key: 'info',
            style: { padding: '12px' }
          }, [
            e('h3', {
              key: 'name',
              style: {
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '4px',
                color: '#1f2937'
              }
            }, hotel.name),
            e('p', {
              key: 'location',
              style: {
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '8px'
              }
            }, hotel.location),
            e('div', {
              key: 'price',
              style: {
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#ef4444'
              }
            }, `¥${hotel.price.toLocaleString()}/泊`)
          ])
        ])
      ))
    ) : (
      alertsWithHotels.length === 0 ?
      e('div', {
        style: {
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280'
        }
      }, [
        e('p', {
          key: 'empty',
          style: { fontSize: '16px', marginBottom: '8px' }
        }, '価格アラートがまだありません'),
        e('p', {
          key: 'hint',
          style: { fontSize: '14px' }
        }, 'ホテルの🔔ボタンをクリックして設定しましょう')
      ]) :
      e('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }
      }, alertsWithHotels.map(alert => 
        e('div', {
          key: alert.id,
          style: {
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: '#fefce8'
          }
        }, [
          // ホテル画像
          e('div', {
            key: 'image',
            style: {
              width: '80px',
              height: '80px',
              borderRadius: '6px',
              backgroundImage: `url(${alert.hotel.thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              flexShrink: 0,
              cursor: 'pointer'
            },
            onClick: () => {
              onHotelClick(alert.hotel);
              onClose();
            }
          }),
          // アラート情報
          e('div', {
            key: 'info',
            style: { flex: 1 }
          }, [
            e('h3', {
              key: 'name',
              style: {
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '4px',
                color: '#1f2937',
                cursor: 'pointer'
              },
              onClick: () => {
                onHotelClick(alert.hotel);
                onClose();
              }
            }, alert.hotel.name),
            e('p', {
              key: 'price',
              style: {
                fontSize: '14px',
                color: '#92400e',
                marginBottom: '4px'
              }
            }, [
              e('span', { key: 'current' }, `現在: ¥${alert.hotel.price.toLocaleString()}`),
              e('span', { key: 'arrow' }, ' → '),
              e('span', { 
                key: 'target',
                style: { fontWeight: 'bold' }
              }, `目標: ¥${alert.target_price.toLocaleString()}`)
            ]),
            e('p', {
              key: 'email',
              style: {
                fontSize: '12px',
                color: '#78350f'
              }
            }, `通知先: ${alert.email}`)
          ]),
          // 削除ボタン
          e('button', {
            key: 'delete',
            onClick: () => handleDeleteAlert(alert.id),
            style: {
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            },
            onMouseEnter: (e: any) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
            },
            onMouseLeave: (e: any) => {
              e.currentTarget.style.backgroundColor = 'white';
            }
          }, '削除')
        ])
      ))
    )),

    // フッター
    e('div', {
      key: 'footer',
      style: {
        padding: window.innerWidth < 640 ? '16px' : '20px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, [
      e('button', {
        key: 'signout',
        onClick: async () => {
          await authService.signOut();
          window.location.reload();
        },
        style: {
          padding: '8px 16px',
          background: 'none',
          border: '1px solid #dc2626',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        },
        onMouseEnter: (e: any) => {
          e.currentTarget.style.backgroundColor = '#fee2e2';
        },
        onMouseLeave: (e: any) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }, 'ログアウト'),
      e('p', {
        key: 'created',
        style: {
          fontSize: '12px',
          color: '#9ca3af'
        }
      }, `登録日: ${new Date(currentUser?.created_at || Date.now()).toLocaleDateString('ja-JP')}`)
    ])
  ]));
};

export default MyPage;