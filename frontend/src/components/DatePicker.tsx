import * as React from 'react';

const { useState, useEffect, createElement: e } = React;

interface DatePickerProps {
  onDateChange: (checkin: string, checkout: string) => void;
  initialCheckin?: string;
  initialCheckout?: string;
}

const DatePicker = ({ onDateChange, initialCheckin, initialCheckout }: DatePickerProps) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkinDate, setCheckinDate] = useState(initialCheckin || today.toISOString().split('T')[0]);
  const [checkoutDate, setCheckoutDate] = useState(initialCheckout || tomorrow.toISOString().split('T')[0]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [priceData, setPriceData] = useState<any>({});

  // 日付変更時に親コンポーネントに通知
  useEffect(() => {
    onDateChange(checkinDate, checkoutDate);
  }, [checkinDate, checkoutDate, onDateChange]);

  // カレンダーの日付を生成
  const generateCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // 前月の日付で埋める
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // 当月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(selectedYear, selectedMonth, day);
    const dateString = selectedDate.toISOString().split('T')[0];
    
    if (!checkinDate || (checkinDate && checkoutDate)) {
      // 新しい予約期間を開始
      setCheckinDate(dateString);
      setCheckoutDate('');
    } else {
      // チェックアウト日を設定
      if (new Date(dateString) > new Date(checkinDate)) {
        setCheckoutDate(dateString);
        setIsCalendarOpen(false);
      } else {
        // チェックイン日より前の日付が選ばれた場合は、新しい期間として扱う
        setCheckinDate(dateString);
        setCheckoutDate('');
      }
    }
  };

  const getPriceLevel = (day: number) => {
    // 週末は高め、平日は安めの傾向を表示（モック）
    const date = new Date(selectedYear, selectedMonth, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'high';
    if (dayOfWeek === 5) return 'medium';
    return 'low';
  };

  return e('div', {
    style: {
      position: 'relative',
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto'
    }
  }, [
    // 日付入力フィールド
    e('div', {
      key: 'date-inputs',
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '8px'
      }
    }, [
      // チェックイン
      e('div', {
        key: 'checkin',
        style: {
          position: 'relative'
        }
      }, [
        e('label', {
          key: 'label',
          style: {
            display: 'block',
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '4px',
            fontWeight: '500'
          }
        }, 'チェックイン'),
        e('input', {
          key: 'input',
          type: 'text',
          value: checkinDate ? new Date(checkinDate).toLocaleDateString('ja-JP') : '',
          readOnly: true,
          onClick: () => setIsCalendarOpen(true),
          style: {
            width: '100%',
            padding: '10px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: 'white',
            transition: 'border-color 0.2s'
          },
          onMouseEnter: (e: any) => { e.currentTarget.style.borderColor = '#3b82f6'; },
          onMouseLeave: (e: any) => { e.currentTarget.style.borderColor = '#e5e7eb'; }
        })
      ]),
      
      // チェックアウト
      e('div', {
        key: 'checkout',
        style: {
          position: 'relative'
        }
      }, [
        e('label', {
          key: 'label',
          style: {
            display: 'block',
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '4px',
            fontWeight: '500'
          }
        }, 'チェックアウト'),
        e('input', {
          key: 'input',
          type: 'text',
          value: checkoutDate ? new Date(checkoutDate).toLocaleDateString('ja-JP') : '',
          readOnly: true,
          onClick: () => setIsCalendarOpen(true),
          placeholder: '日付を選択',
          style: {
            width: '100%',
            padding: '10px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: 'white',
            transition: 'border-color 0.2s'
          },
          onMouseEnter: (e: any) => { e.currentTarget.style.borderColor = '#3b82f6'; },
          onMouseLeave: (e: any) => { e.currentTarget.style.borderColor = '#e5e7eb'; }
        })
      ])
    ]),

    // カレンダーモーダル
    isCalendarOpen && e('div', {
      key: 'calendar-modal',
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
      onClick: () => setIsCalendarOpen(false)
    }, e('div', {
      style: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '20px',
        maxWidth: '380px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      },
      onClick: (e: any) => e.stopPropagation()
    }, [
      // カレンダーヘッダー
      e('div', {
        key: 'header',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }
      }, [
        e('button', {
          key: 'prev',
          onClick: () => {
            if (selectedMonth === 0) {
              setSelectedMonth(11);
              setSelectedYear(selectedYear - 1);
            } else {
              setSelectedMonth(selectedMonth - 1);
            }
          },
          style: {
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'background-color 0.2s'
          },
          onMouseEnter: (e: any) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; },
          onMouseLeave: (e: any) => { e.currentTarget.style.backgroundColor = 'transparent'; }
        }, '◀'),
        
        e('h3', {
          key: 'month-year',
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            margin: 0
          }
        }, `${selectedYear}年 ${monthNames[selectedMonth]}`),
        
        e('button', {
          key: 'next',
          onClick: () => {
            if (selectedMonth === 11) {
              setSelectedMonth(0);
              setSelectedYear(selectedYear + 1);
            } else {
              setSelectedMonth(selectedMonth + 1);
            }
          },
          style: {
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'background-color 0.2s'
          },
          onMouseEnter: (e: any) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; },
          onMouseLeave: (e: any) => { e.currentTarget.style.backgroundColor = 'transparent'; }
        }, '▶')
      ]),
      
      // 曜日ヘッダー
      e('div', {
        key: 'weekdays',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '8px'
        }
      }, dayNames.map(day => 
        e('div', {
          key: day,
          style: {
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '500',
            padding: '4px'
          }
        }, day)
      )),
      
      // カレンダー日付
      e('div', {
        key: 'days',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px'
        }
      }, generateCalendarDays().map((day, index) => {
        if (!day) {
          return e('div', { key: `empty-${index}` });
        }
        
        const dateString = new Date(selectedYear, selectedMonth, day).toISOString().split('T')[0];
        const isSelected = dateString === checkinDate || dateString === checkoutDate;
        const isInRange = checkinDate && checkoutDate && 
                         dateString > checkinDate && dateString < checkoutDate;
        const isToday = dateString === today.toISOString().split('T')[0];
        const isPast = new Date(dateString) < new Date(today.toISOString().split('T')[0]);
        const priceLevel = getPriceLevel(day);
        
        return e('button', {
          key: day,
          onClick: () => !isPast && handleDateSelect(day),
          disabled: isPast,
          style: {
            padding: '8px',
            border: 'none',
            borderRadius: '8px',
            cursor: isPast ? 'not-allowed' : 'pointer',
            backgroundColor: isSelected ? '#2563eb' : 
                           isInRange ? '#dbeafe' : 
                           isToday ? '#f3f4f6' : 
                           'transparent',
            color: isSelected ? 'white' : 
                  isPast ? '#d1d5db' : 
                  '#1f2937',
            fontWeight: isSelected || isToday ? 'bold' : 'normal',
            fontSize: '14px',
            position: 'relative',
            transition: 'all 0.2s'
          },
          onMouseEnter: (e: any) => {
            if (!isPast && !isSelected) {
              e.currentTarget.style.backgroundColor = '#e0e7ff';
            }
          },
          onMouseLeave: (e: any) => {
            if (!isPast && !isSelected && !isInRange) {
              e.currentTarget.style.backgroundColor = isToday ? '#f3f4f6' : 'transparent';
            }
          }
        }, [
          e('div', { key: 'day-number' }, day),
          // 価格レベルインジケーター
          !isPast && e('div', {
            key: 'price-indicator',
            style: {
              position: 'absolute',
              bottom: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: priceLevel === 'high' ? '#ef4444' : 
                             priceLevel === 'medium' ? '#f59e0b' : 
                             '#10b981'
            }
          })
        ]);
      })),
      
      // 価格レベル説明
      e('div', {
        key: 'price-legend',
        style: {
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '16px',
          fontSize: '11px',
          color: '#6b7280'
        }
      }, [
        e('div', { key: 'low', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
          e('div', {
            key: 'dot',
            style: {
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }
          }),
          e('span', { key: 'label' }, '安い')
        ]),
        e('div', { key: 'medium', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
          e('div', {
            key: 'dot',
            style: {
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b'
            }
          }),
          e('span', { key: 'label' }, '普通')
        ]),
        e('div', { key: 'high', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
          e('div', {
            key: 'dot',
            style: {
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ef4444'
            }
          }),
          e('span', { key: 'label' }, '高い')
        ])
      ]),
      
      // 閉じるボタン
      e('button', {
        key: 'close',
        onClick: () => setIsCalendarOpen(false),
        style: {
          width: '100%',
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        },
        onMouseEnter: (e: any) => { e.currentTarget.style.backgroundColor = '#e5e7eb'; },
        onMouseLeave: (e: any) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }
      }, '閉じる')
    ]))
  ]);
};

export default DatePicker;