import * as React from 'react';
import { priceAlertService } from '../services/supabase';

const { useState, createElement: e } = React;

interface PriceAlertModalProps {
  hotel: any;
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

const PriceAlertModal = ({ hotel, isOpen, onClose, currentUser }: PriceAlertModalProps) => {
  const [targetPrice, setTargetPrice] = useState(Math.floor(hotel.price * 0.8));
  const [email, setEmail] = useState(currentUser?.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingAlerts, setExistingAlerts] = useState<any[]>([]);

  // 既存のアラートを取得
  React.useEffect(() => {
    if (isOpen && currentUser) {
      loadExistingAlerts();
    }
  }, [isOpen, currentUser]);

  const loadExistingAlerts = async () => {
    try {
      const alerts = await priceAlertService.getUserAlerts();
      const hotelAlerts = alerts.filter((a: any) => a.hotel_id === hotel.id);
      setExistingAlerts(hotelAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await priceAlertService.createAlert(hotel.id, targetPrice, email);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to create alert:', error);
      alert('アラートの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await priceAlertService.deleteAlert(alertId);
      await loadExistingAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  if (!isOpen) return null;

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
      padding: window.innerWidth < 640 ? '20px' : '28px',
      maxWidth: '450px',
      width: '100%',
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
            fontSize: window.innerWidth < 640 ? '20px' : '24px',
            fontWeight: 'bold',
            margin: 0,
            color: '#1f2937'
          }
        }, '価格アラート設定'),
        e('p', {
          key: 'hotel-name',
          style: {
            fontSize: '14px',
            color: '#6b7280',
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
          color: '#6b7280'
        }
      }, '×')
    ]),

    // 現在の価格情報
    e('div', {
      key: 'current-price',
      style: {
        background: '#f3f4f6',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }
    }, [
      e('p', {
        key: 'label',
        style: {
          fontSize: '12px',
          color: '#6b7280',
          marginBottom: '4px'
        }
      }, '現在の価格'),
      e('div', {
        key: 'price',
        style: {
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937'
        }
      }, `¥${hotel.price.toLocaleString()}/泊`)
    ]),

    // 既存のアラート
    existingAlerts.length > 0 && e('div', {
      key: 'existing-alerts',
      style: {
        marginBottom: '24px'
      }
    }, [
      e('h3', {
        key: 'title',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '12px',
          color: '#374151'
        }
      }, '設定中のアラート'),
      ...existingAlerts.map(alert => 
        e('div', {
          key: alert.id,
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            background: '#fef3c7',
            borderRadius: '6px',
            marginBottom: '8px'
          }
        }, [
          e('div', { key: 'info' }, [
            e('div', {
              key: 'price',
              style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#92400e'
              }
            }, `¥${alert.target_price.toLocaleString()}以下`),
            e('div', {
              key: 'email',
              style: {
                fontSize: '12px',
                color: '#b45309'
              }
            }, alert.email)
          ]),
          e('button', {
            key: 'delete',
            onClick: () => handleDeleteAlert(alert.id),
            style: {
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '14px'
            }
          }, '削除')
        ])
      )
    ]),

    // フォーム
    currentUser ? e('form', {
      key: 'form',
      onSubmit: handleSubmit
    }, [
      // 目標価格
      e('div', {
        key: 'target-price',
        style: { marginBottom: '20px' }
      }, [
        e('label', {
          key: 'label',
          style: {
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }
        }, '目標価格（この価格以下になったら通知）'),
        e('div', {
          key: 'input-group',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }
        }, [
          e('input', {
            key: 'input',
            type: 'range',
            min: Math.floor(hotel.price * 0.3),
            max: hotel.price,
            value: targetPrice,
            onChange: (e: any) => setTargetPrice(parseInt(e.target.value)),
            style: {
              flex: 1
            }
          }),
          e('div', {
            key: 'value',
            style: {
              minWidth: '120px',
              textAlign: 'right',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#2563eb'
            }
          }, `¥${targetPrice.toLocaleString()}`)
        ]),
        e('div', {
          key: 'percentage',
          style: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px'
          }
        }, `現在価格の${Math.round((targetPrice / hotel.price) * 100)}%`)
      ]),

      // メールアドレス
      e('div', {
        key: 'email',
        style: { marginBottom: '24px' }
      }, [
        e('label', {
          key: 'label',
          style: {
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }
        }, '通知先メールアドレス'),
        e('input', {
          key: 'input',
          type: 'email',
          value: email,
          onChange: (e: any) => setEmail(e.target.value),
          required: true,
          placeholder: 'example@email.com',
          style: {
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s'
          },
          onFocus: (e: any) => { e.target.style.borderColor = '#3b82f6'; },
          onBlur: (e: any) => { e.target.style.borderColor = '#d1d5db'; }
        })
      ]),

      // 送信ボタン
      e('button', {
        key: 'submit',
        type: 'submit',
        disabled: loading || success,
        style: {
          width: '100%',
          padding: '12px',
          backgroundColor: success ? '#10b981' : loading ? '#9ca3af' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }
      }, [
        success && e('svg', {
          key: 'check',
          width: '20',
          height: '20',
          viewBox: '0 0 20 20',
          fill: 'currentColor'
        }, e('path', {
          fillRule: 'evenodd',
          d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
          clipRule: 'evenodd'
        })),
        e('span', { key: 'text' }, 
          success ? '設定完了！' : loading ? '設定中...' : 'アラートを設定'
        )
      ])
    ]) : e('div', {
      key: 'login-prompt',
      style: {
        textAlign: 'center',
        padding: '24px 0'
      }
    }, [
      e('p', {
        key: 'message',
        style: {
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '16px'
        }
      }, '価格アラートを設定するにはログインが必要です'),
      e('button', {
        key: 'login',
        onClick: () => {
          onClose();
          // ログインモーダルを開く処理はApp側で行う
        },
        style: {
          padding: '12px 24px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }
      }, 'ログインする')
    ]),

    // 説明
    e('div', {
      key: 'description',
      style: {
        background: '#eff6ff',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '24px'
      }
    }, [
      e('h4', {
        key: 'title',
        style: {
          fontSize: '14px',
          fontWeight: '600',
          color: '#1e40af',
          marginBottom: '8px'
        }
      }, '💡 価格アラートとは？'),
      e('ul', {
        key: 'list',
        style: {
          margin: 0,
          paddingLeft: '20px',
          fontSize: '12px',
          color: '#3730a3',
          lineHeight: 1.6
        }
      }, [
        e('li', { key: '1' }, '設定した目標価格以下になるとメールでお知らせ'),
        e('li', { key: '2' }, '毎日自動で価格をチェック'),
        e('li', { key: '3' }, 'いつでも設定の変更・削除が可能')
      ])
    ])
  ]));
};

export default PriceAlertModal;