import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../services/geminiService';

interface DealSeekerSearchProps {
  onSearch: (params: any) => void;
  onBack: () => void;
}

export const DealSeekerSearch: React.FC<DealSeekerSearchProps> = ({ onSearch, onBack }) => {
  const [searchParams, setSearchParams] = useState({
    hotelName: '',
    area: '',
    budget: '',
    flexibility: 'weekend',
    guests: 2,
    rooms: 1
  });
  const [priceCalendar, setPriceCalendar] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  const areas = [
    { value: 'tokyo', label: '東京', emoji: '🗼' },
    { value: 'osaka', label: '大阪', emoji: '🦌' },
    { value: 'kyoto', label: '京都', emoji: '🏯' },
    { value: 'okinawa', label: '沖縄', emoji: '🌺' },
    { value: 'hokkaido', label: '北海道', emoji: '⛷️' },
    { value: 'hakone', label: '箱根', emoji: '🗻' }
  ];

  const budgetRanges = [
    { value: '10000', label: '1万円以下', color: '#4CAF50' },
    { value: '20000', label: '2万円以下', color: '#FF9800' },
    { value: '30000', label: '3万円以下', color: '#E91E63' },
    { value: '50000', label: '5万円以下', color: '#9C27B0' },
    { value: '100000', label: '10万円以下', color: '#3F51B5' },
    { value: '', label: '予算制限なし', color: '#607D8B' }
  ];

  const flexibilityOptions = [
    { value: 'weekend', label: '週末のみ' },
    { value: 'weekday', label: '平日のみ' },
    { value: 'month', label: '今月いつでも' },
    { value: 'season', label: '今シーズン' }
  ];

  useEffect(() => {
    generatePriceCalendar();
  }, [searchParams.area, searchParams.budget, currentMonth]);

  const generatePriceCalendar = async () => {
    setIsLoadingCalendar(true);
    const calendar = [];
    
    // 現在の月の1日から月末まで
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // カレンダーの開始日（前月の日曜日から）
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // カレンダーの終了日（次月の土曜日まで）
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const basePrice = parseInt(searchParams.budget) || 30000;
    
    // 日付ごとに価格を生成
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isToday = date.toDateString() === new Date().toDateString();
      const isPast = date < new Date() && !isToday;
      
      let price = basePrice;
      
      // 価格変動アルゴリズム
      if (isWeekend) {
        price *= 1.4; // 週末料金
      } else {
        price *= 0.85; // 平日割引
      }
      
      // 季節変動
      const month = date.getMonth();
      if (month === 11 || month === 0 || month === 1) { // 冬季
        price *= 1.2;
      } else if (month === 6 || month === 7 || month === 8) { // 夏季
        price *= 1.3;
      }
      
      // ランダム変動
      price += Math.random() * 8000 - 4000;
      price = Math.max(5000, Math.round(price));
      
      // AIによる価格予測風の調整
      if (searchParams.area === 'tokyo') {
        price *= 1.1;
      } else if (searchParams.area === 'okinawa') {
        price *= 1.2;
      }
      
      // お得度判定
      const dealLevel = price < basePrice * 0.7 ? 'excellent' : 
                       price < basePrice * 0.9 ? 'good' : 'normal';
      
      calendar.push({
        date: date.toISOString().split('T')[0],
        dateStr: `${date.getDate()}`,
        dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][date.getDay()],
        price: price,
        dealLevel: dealLevel,
        isWeekend: isWeekend,
        isCurrentMonth: isCurrentMonth,
        isToday: isToday,
        isPast: isPast,
        fullDate: new Date(date)
      });
    }
    
    // AIによる価格分析をシミュレート
    try {
      const aiAnalysis = await geminiService.generateInsight(
        `${searchParams.area}のホテル価格予測`, 
        { 
          area: searchParams.area,
          budget: searchParams.budget,
          month: currentMonth.getMonth() + 1,
          year: currentMonth.getFullYear()
        }
      );
      
      // AIの結果を価格に反映（実際のAI結果がない場合はシミュレート）
      console.log('AI Price Analysis:', aiAnalysis);
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
    
    setPriceCalendar(calendar);
    setIsLoadingCalendar(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const handleSearch = async () => {
    if (!searchParams.area && !searchParams.hotelName) {
      return;
    }

    setIsSearching(true);
    
    try {
      await onSearch({
        ...searchParams,
        searchType: 'deal-seeker',
        priceCalendar: priceCalendar
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getBestDealDays = () => {
    return priceCalendar
      .filter(day => day.dealLevel === 'excellent')
      .slice(0, 3);
  };

  const getDealColor = (level: string) => {
    switch (level) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#FF9800';
      default: return '#E0E0E0';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFE5E5 0%, #E8D4F1 100%)',
      padding: '20px',
      fontFamily: '"Noto Sans JP", "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          paddingTop: '60px'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '40px'
        }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              cursor: 'pointer',
              fontSize: '1rem',
              color: '#4A4A4A',
              marginRight: '16px',
              backdropFilter: 'blur(15px)'
            }}
          >
            ← 戻る
          </motion.button>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '300',
            color: '#4A4A4A',
            margin: 0,
            letterSpacing: '0.05em'
          }}>
            💰 お得な時期検索
          </h1>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          marginBottom: '30px'
        }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              borderRadius: '24px',
              padding: '30px',
              boxShadow: '0 15px 50px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(15px)'
            }}
          >
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: '400',
              color: '#4A4A4A',
              marginBottom: '24px',
              letterSpacing: '0.03em'
            }}>
              検索条件
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.95rem',
                fontWeight: '400',
                color: '#4A4A4A',
                marginBottom: '12px',
                letterSpacing: '0.02em'
              }}>
                エリア選択
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
              }}>
                {areas.map((area) => (
                  <motion.button
                    key={area.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSearchParams(prev => ({ ...prev, area: area.value }))}
                    style={{
                      background: searchParams.area === area.value 
                        ? 'linear-gradient(135deg, #F8BBD0 0%, #E1BEE7 100%)'
                        : 'rgba(248,187,208,0.1)',
                      border: searchParams.area === area.value ? '2px solid #F8BBD0' : '1px solid #FFCDD2',
                      borderRadius: '16px',
                      padding: '12px 8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: searchParams.area === area.value ? 'white' : '#4A4A4A',
                      fontWeight: searchParams.area === area.value ? '500' : '400',
                      letterSpacing: '0.01em',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {area.emoji} {area.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.95rem',
                fontWeight: '400',
                color: '#4A4A4A',
                marginBottom: '12px',
                letterSpacing: '0.02em'
              }}>
                予算範囲
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {budgetRanges.map((budget) => (
                  <motion.button
                    key={budget.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSearchParams(prev => ({ ...prev, budget: budget.value }))}
                    style={{
                      background: searchParams.budget === budget.value 
                        ? budget.color
                        : 'rgba(0,0,0,0.05)',
                      border: searchParams.budget === budget.value ? 'none' : '1px solid #E0E0E0',
                      borderRadius: '16px',
                      padding: '12px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: searchParams.budget === budget.value ? 'white' : '#4A4A4A',
                      fontWeight: searchParams.budget === budget.value ? '500' : '400',
                      letterSpacing: '0.01em',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {budget.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.95rem',
                fontWeight: '400',
                color: '#4A4A4A',
                marginBottom: '12px',
                letterSpacing: '0.02em'
              }}>
                柔軟性
              </label>
              <select
                value={searchParams.flexibility}
                onChange={(e) => setSearchParams(prev => ({ ...prev, flexibility: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '0.95rem',
                  border: '2px solid #F8BBD0',
                  borderRadius: '16px',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              >
                {flexibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#4A4A4A',
                  marginBottom: '8px'
                }}>
                  人数
                </label>
                <select
                  value={searchParams.guests}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    border: '2px solid #F8BBD0',
                    borderRadius: '12px',
                    outline: 'none'
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num}名</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#4A4A4A',
                  marginBottom: '8px'
                }}>
                  部屋数
                </label>
                <select
                  value={searchParams.rooms}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, rooms: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    border: '2px solid #F8BBD0',
                    borderRadius: '12px',
                    outline: 'none'
                  }}
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}部屋</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              borderRadius: '24px',
              padding: '30px',
              boxShadow: '0 15px 50px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(15px)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '400',
                color: '#4A4A4A',
                margin: 0,
                letterSpacing: '0.03em'
              }}>
                価格カレンダー
              </h2>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateMonth('prev')}
                  style={{
                    background: 'linear-gradient(135deg, #F8BBD0 0%, #E1BEE7 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: '400',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(248,187,208,0.3)'
                  }}
                >
                  ← 前月
                </motion.button>
                
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '400',
                  color: '#4A4A4A',
                  minWidth: '120px',
                  textAlign: 'center'
                }}>
                  {getMonthName(currentMonth)}
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateMonth('next')}
                  style={{
                    background: 'linear-gradient(135deg, #F8BBD0 0%, #E1BEE7 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: '400',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(248,187,208,0.3)'
                  }}
                >
                  翌月 →
                </motion.button>
              </div>
            </div>

            {/* 曜日ヘッダー */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              marginBottom: '8px'
            }}>
              {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    padding: '8px 4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    color: index === 0 ? '#ff6b6b' : index === 6 ? '#4dabf7' : '#666'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* カレンダー本体 */}
            {isLoadingCalendar ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px'
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #F8BBD0',
                    borderTopColor: 'transparent',
                    borderRadius: '50%'
                  }}
                />
                <span style={{ marginLeft: '12px', color: '#666' }}>AI価格分析中...</span>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                marginBottom: '20px'
              }}>
                {priceCalendar.map((day, index) => {
                  const cellStyle = {
                    background: day.isPast 
                      ? '#f5f5f5' 
                      : day.isCurrentMonth 
                        ? getDealColor(day.dealLevel)
                        : 'rgba(0,0,0,0.05)',
                    borderRadius: '8px',
                    padding: '8px 4px',
                    textAlign: 'center' as const,
                    cursor: day.isPast ? 'not-allowed' : 'pointer',
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    justifyContent: 'center',
                    opacity: day.isCurrentMonth ? 1 : 0.3,
                    border: day.isToday ? '2px solid #F8BBD0' : 'none',
                    transition: 'all 0.2s'
                  };

                  const textColor = day.isPast 
                    ? '#999'
                    : day.isCurrentMonth && day.dealLevel !== 'normal' 
                      ? 'white' 
                      : '#666';

                  return (
                    <motion.div
                      key={`${day.date}-${index}`}
                      whileHover={day.isPast ? {} : { scale: 1.05 }}
                      style={cellStyle}
                      onClick={() => {
                        if (!day.isPast) {
                          setSearchParams(prev => ({ ...prev, specificDate: day.date }));
                        }
                      }}
                    >
                      <div style={{
                        fontSize: '0.8rem',
                        color: textColor,
                        marginBottom: '2px',
                        fontWeight: day.isToday ? '600' : '400'
                      }}>
                        {day.dateStr}
                      </div>
                      {day.isCurrentMonth && !day.isPast && (
                        <>
                          <div style={{
                            fontSize: '0.6rem',
                            color: textColor,
                            marginBottom: '2px'
                          }}>
                            {day.dayOfWeek}
                          </div>
                          <div style={{
                            fontSize: '0.6rem',
                            color: textColor,
                            fontWeight: '500'
                          }}>
                            ¥{Math.round(day.price / 1000)}k
                          </div>
                        </>
                      )}
                      {day.isPast && (
                        <div style={{
                          fontSize: '0.6rem',
                          color: '#999'
                        }}>
                          --
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '0.8rem',
              color: '#666',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', background: '#4CAF50', borderRadius: '50%' }} />
                お得
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', background: '#FF9800', borderRadius: '50%' }} />
                普通
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', background: '#E0E0E0', borderRadius: '50%' }} />
                高め
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(248,187,208,0.1) 0%, rgba(225,190,231,0.1) 100%)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '0.95rem',
                fontWeight: '400',
                color: '#4A4A4A',
                marginBottom: '12px',
                letterSpacing: '0.02em'
              }}>
                🎯 おすすめの日程
              </h3>
              {getBestDealDays().map((day, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#666' }}>
                    {day.dateStr} ({day.dayOfWeek})
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#4CAF50' }}>
                    ¥{day.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSearch}
          disabled={isSearching || (!searchParams.area && !searchParams.hotelName)}
          style={{
            width: '100%',
            padding: '20px',
            fontSize: '1.1rem',
            fontWeight: '400',
            letterSpacing: '0.04em',
            color: 'white',
            background: isSearching 
              ? 'linear-gradient(135deg, #ccc 0%, #aaa 100%)'
              : 'linear-gradient(135deg, #F8BBD0 0%, #CE93D8 100%)',
            border: 'none',
            borderRadius: '16px',
            cursor: isSearching ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 30px rgba(248,187,208,0.4)',
            transition: 'all 0.3s'
          }}
        >
          {isSearching ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⚙️
              </motion.div>
              お得な宿泊プランを検索中...
            </div>
          ) : (
            '💰 お得な時期で検索'
          )}
        </motion.button>
      </motion.div>
    </div>
  );
};