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
  }, [searchParams.area, searchParams.budget]);

  const generatePriceCalendar = () => {
    const calendar = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const basePrice = parseInt(searchParams.budget) || 30000;
      
      let price = basePrice;
      if (isWeekend) {
        price *= 1.5;
      } else {
        price *= 0.8;
      }
      
      price += Math.random() * 10000 - 5000;
      price = Math.max(5000, Math.round(price));
      
      const dealLevel = price < basePrice * 0.7 ? 'excellent' : 
                       price < basePrice * 0.9 ? 'good' : 'normal';
      
      calendar.push({
        date: date.toISOString().split('T')[0],
        dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
        dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][date.getDay()],
        price: price,
        dealLevel: dealLevel,
        isWeekend: isWeekend
      });
    }
    
    setPriceCalendar(calendar);
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
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      padding: '20px'
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
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              cursor: 'pointer',
              fontSize: '1rem',
              color: '#4A4A4A',
              marginRight: '16px',
              backdropFilter: 'blur(10px)'
            }}
          >
            ← 戻る
          </motion.button>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '400',
            color: '#4A4A4A',
            margin: 0
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
              background: 'white',
              borderRadius: '24px',
              padding: '30px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}
          >
            <h2 style={{
              fontSize: '1.4rem',
              fontWeight: '500',
              color: '#4A4A4A',
              marginBottom: '24px'
            }}>
              検索条件
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#4A4A4A',
                marginBottom: '8px'
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
                        ? 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)'
                        : 'rgba(232,180,184,0.1)',
                      border: searchParams.area === area.value ? '2px solid #E8B4B8' : '1px solid #E8B4B8',
                      borderRadius: '12px',
                      padding: '12px 8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      color: searchParams.area === area.value ? 'white' : '#4A4A4A',
                      fontWeight: '500',
                      transition: 'all 0.3s'
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
                fontSize: '1rem',
                fontWeight: '500',
                color: '#4A4A4A',
                marginBottom: '8px'
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
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      color: searchParams.budget === budget.value ? 'white' : '#4A4A4A',
                      fontWeight: '500',
                      transition: 'all 0.3s'
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
                fontSize: '1rem',
                fontWeight: '500',
                color: '#4A4A4A',
                marginBottom: '8px'
              }}>
                柔軟性
              </label>
              <select
                value={searchParams.flexibility}
                onChange={(e) => setSearchParams(prev => ({ ...prev, flexibility: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  border: '2px solid #E8B4B8',
                  borderRadius: '12px',
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
                    border: '2px solid #E8B4B8',
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
                    border: '2px solid #E8B4B8',
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
              background: 'white',
              borderRadius: '24px',
              padding: '30px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}
          >
            <h2 style={{
              fontSize: '1.4rem',
              fontWeight: '500',
              color: '#4A4A4A',
              marginBottom: '24px'
            }}>
              価格カレンダー
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              marginBottom: '20px'
            }}>
              {priceCalendar.slice(0, 21).map((day) => (
                <motion.div
                  key={day.date}
                  whileHover={{ scale: 1.1 }}
                  style={{
                    background: getDealColor(day.dealLevel),
                    borderRadius: '8px',
                    padding: '8px 4px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                  onClick={() => setSearchParams(prev => ({ ...prev, specificDate: day.date }))}
                >
                  <div style={{
                    fontSize: '0.7rem',
                    color: day.dealLevel === 'normal' ? '#666' : 'white',
                    marginBottom: '2px'
                  }}>
                    {day.dateStr}
                  </div>
                  <div style={{
                    fontSize: '0.6rem',
                    color: day.dealLevel === 'normal' ? '#666' : 'white',
                    marginBottom: '2px'
                  }}>
                    {day.dayOfWeek}
                  </div>
                  <div style={{
                    fontSize: '0.6rem',
                    color: day.dealLevel === 'normal' ? '#666' : 'white',
                    fontWeight: '500'
                  }}>
                    ¥{Math.round(day.price / 1000)}k
                  </div>
                </motion.div>
              ))}
            </div>

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
              background: 'rgba(76,175,80,0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '500',
                color: '#4A4A4A',
                marginBottom: '8px'
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
            fontSize: '1.2rem',
            fontWeight: '500',
            color: 'white',
            background: isSearching 
              ? 'linear-gradient(135deg, #ccc 0%, #aaa 100%)'
              : 'linear-gradient(135deg, #E8B4B8 0%, #92A8D1 100%)',
            border: 'none',
            borderRadius: '16px',
            cursor: isSearching ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 30px rgba(232,180,184,0.4)',
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