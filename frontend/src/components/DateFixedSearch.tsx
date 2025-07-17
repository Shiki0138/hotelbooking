import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../services/geminiService';
import { searchHotels, Hotel, searchHotelsAsHotelData } from '../data/hotelsDatabase';
import { comprehensiveHotelSearch } from '../services/comprehensiveHotelSearch';

interface DateFixedSearchProps {
  onSearch: (params: any) => void;
  onBack: () => void;
}

export const DateFixedSearch: React.FC<DateFixedSearchProps> = ({ onSearch, onBack }) => {
  const [searchParams, setSearchParams] = useState({
    hotelName: '',
    checkIn: '',
    checkOut: '',
    guests: 2,
    rooms: 1
  });
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Hotel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    setSearchParams(prev => ({
      ...prev,
      checkIn: tomorrow.toISOString().split('T')[0],
      checkOut: dayAfter.toISOString().split('T')[0]
    }));
  }, []);

  const handleSearch = async () => {
    if (!searchParams.hotelName || !searchParams.checkIn || !searchParams.checkOut) {
      return;
    }

    setIsSearching(true);
    
    try {
      await onSearch({
        ...searchParams,
        searchType: 'date-fixed'
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleHotelNameChange = async (value: string) => {
    setSearchParams(prev => ({ ...prev, hotelName: value }));
    
    if (value.length >= 2) {
      try {
        // 包括的ホテル検索システムを使用（楽天API + ローカルDB）
        const results = await comprehensiveHotelSearch.searchAllHotels(value, 8);
        
        // Hotelインターフェースに変換
        const hotelSuggestions: Hotel[] = results.map(result => ({
          id: result.id,
          name: result.name,
          nameEn: result.name,
          location: result.city || '',
          prefecture: result.prefecture || '',
          category: result.category || 'standard',
          tags: [],
          searchKeywords: []
        }));
        
        setSuggestions(hotelSuggestions);
        setShowSuggestions(hotelSuggestions.length > 0);
      } catch (error) {
        console.error('ホテル検索エラー:', error);
        // エラー時はローカルDBから検索
        const localResults = searchHotels(value, 8);
        setSuggestions(localResults);
        setShowSuggestions(localResults.length > 0);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const quickDateOptions = [
    { 
      label: '今夜', 
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    },
    { 
      label: '今週末', 
      checkIn: (() => {
        const today = new Date();
        const friday = new Date(today);
        friday.setDate(today.getDate() + (5 - today.getDay()));
        return friday.toISOString().split('T')[0];
      })(),
      checkOut: (() => {
        const today = new Date();
        const sunday = new Date(today);
        sunday.setDate(today.getDate() + (7 - today.getDay()));
        return sunday.toISOString().split('T')[0];
      })()
    },
    { 
      label: '来週末', 
      checkIn: (() => {
        const today = new Date();
        const friday = new Date(today);
        friday.setDate(today.getDate() + (12 - today.getDay()));
        return friday.toISOString().split('T')[0];
      })(),
      checkOut: (() => {
        const today = new Date();
        const sunday = new Date(today);
        sunday.setDate(today.getDate() + (14 - today.getDay()));
        return sunday.toISOString().split('T')[0];
      })()
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      padding: '20px',
      fontFamily: '"Noto Sans JP", "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          maxWidth: '800px',
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
            🗓️ 日程固定検索
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}
        >
          <div style={{
            display: 'grid',
            gap: '24px'
          }}>
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#4A4A4A',
                marginBottom: '8px'
              }}>
                ホテル名・エリア
              </label>
              <input
                type="text"
                value={searchParams.hotelName}
                onChange={(e) => handleHotelNameChange(e.target.value)}
                placeholder="例: リッツカールトン東京、新宿、渋谷"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '1rem',
                  border: '2px solid #E8B4B8',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
              />
              
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E8B4B8',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      marginTop: '4px'
                    }}
                  >
                    {suggestions.map((hotel, index) => (
                      <div
                        key={hotel.id}
                        onClick={() => {
                          setSearchParams(prev => ({ ...prev, hotelName: hotel.name }));
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5F5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <div>
                          <div style={{
                            fontWeight: '500',
                            color: '#2C2C2C',
                            marginBottom: '2px'
                          }}>
                            {hotel.name}
                          </div>
                          <div style={{
                            fontSize: '0.85rem',
                            color: '#666'
                          }}>
                            {hotel.location}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: hotel.category === 'luxury' ? '#FFE5E5' : 
                                     hotel.category === 'popular' ? '#E5F3FF' : '#F0F0F0',
                          color: hotel.category === 'luxury' ? '#D14343' : 
                                hotel.category === 'popular' ? '#2B6CB0' : '#666'
                        }}>
                          {hotel.category === 'luxury' ? '高級' : 
                           hotel.category === 'popular' ? '人気' : 
                           hotel.category === 'business' ? 'ビジネス' : 
                           hotel.category === 'standard' ? 'スタンダード' : '格安'}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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
                  チェックイン
                </label>
                <input
                  type="date"
                  value={searchParams.checkIn}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkIn: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '1rem',
                    border: '2px solid #E8B4B8',
                    borderRadius: '12px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#4A4A4A',
                  marginBottom: '8px'
                }}>
                  チェックアウト
                </label>
                <input
                  type="date"
                  value={searchParams.checkOut}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkOut: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '1rem',
                    border: '2px solid #E8B4B8',
                    borderRadius: '12px',
                    outline: 'none'
                  }}
                />
              </div>
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
                    padding: '16px',
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
                    padding: '16px',
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
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '30px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: '500',
            color: '#4A4A4A',
            marginBottom: '16px'
          }}>
            よく検索される日程
          </h3>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {quickDateOptions.map((option, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSearchParams(prev => ({
                  ...prev,
                  checkIn: option.checkIn,
                  checkOut: option.checkOut
                }))}
                style={{
                  background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(232,180,184,0.3)'
                }}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSearch}
          disabled={isSearching || !searchParams.hotelName || !searchParams.checkIn || !searchParams.checkOut}
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
              検索中...
            </div>
          ) : (
            '🔍 この日程で検索'
          )}
        </motion.button>
      </motion.div>
    </div>
  );
};