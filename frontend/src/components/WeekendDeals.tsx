import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HotelPriceComparison } from './HotelPriceComparison';

interface WeekendDealsProps {
  onHotelSelect: (hotel: any) => void;
}

export const WeekendDeals: React.FC<WeekendDealsProps> = ({ onHotelSelect }) => {
  const [weekendDeals, setWeekendDeals] = useState<any[]>([]);
  const [monthlyDeals, setMonthlyDeals] = useState<any[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    generateWeekendDeals();
    generateMonthlyDeals();
  }, []);

  const generateWeekendDeals = () => {
    const thisWeekend = getWeekendDates();
    const deals = [
      {
        id: 'weekend-1',
        name: 'ザ・リッツ・カールトン東京',
        area: '東京・六本木',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
        normalPrice: 85000,
        weekendPrice: 58000,
        discount: 32,
        rating: 4.8,
        reviewCount: 1247,
        amenities: ['スパ', 'ジム', 'レストラン', 'バー'],
        otaPrices: {
          '楽天トラベル': 58000,
          'Booking.com': 61200,
          'じゃらん': 59800
        },
        bestOTA: '楽天トラベル',
        checkIn: thisWeekend.friday,
        checkOut: thisWeekend.sunday,
        availableRooms: 3,
        urgency: 'high'
      },
      {
        id: 'weekend-2',
        name: 'ハイアット リージェンシー 大阪',
        area: '大阪・梅田',
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80',
        normalPrice: 45000,
        weekendPrice: 28000,
        discount: 38,
        rating: 4.5,
        reviewCount: 892,
        amenities: ['朝食', 'ジム', 'Wi-Fi', 'ランドリー'],
        otaPrices: {
          '楽天トラベル': 29500,
          'Booking.com': 28000,
          'じゃらん': 28800
        },
        bestOTA: 'Booking.com',
        checkIn: thisWeekend.friday,
        checkOut: thisWeekend.sunday,
        availableRooms: 7,
        urgency: 'medium'
      },
      {
        id: 'weekend-3',
        name: 'ザ・ペニンシュラ東京',
        area: '東京・銀座',
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80',
        normalPrice: 95000,
        weekendPrice: 68000,
        discount: 28,
        rating: 4.9,
        reviewCount: 2156,
        amenities: ['スパ', 'プール', 'コンシェルジュ', 'ラウンジ'],
        otaPrices: {
          '楽天トラベル': 68000,
          'Booking.com': 72000,
          'じゃらん': 69500
        },
        bestOTA: '楽天トラベル',
        checkIn: thisWeekend.friday,
        checkOut: thisWeekend.sunday,
        availableRooms: 2,
        urgency: 'high'
      }
    ];
    
    setWeekendDeals(deals);
  };

  const generateMonthlyDeals = () => {
    const thisMonth = getCurrentMonth();
    const deals = [
      {
        id: 'monthly-1',
        name: 'ハレクラニ沖縄',
        area: '沖縄・恩納村',
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
        normalPrice: 120000,
        monthlyPrice: 78000,
        discount: 35,
        rating: 4.7,
        reviewCount: 543,
        amenities: ['ビーチ', 'スパ', 'プール', 'ゴルフ'],
        bestDates: ['12/15-16', '12/22-23', '12/29-30'],
        otaPrices: {
          '楽天トラベル': 78000,
          'Booking.com': 82000,
          'じゃらん': 79500
        },
        bestOTA: '楽天トラベル',
        month: thisMonth,
        specialOffer: 'ビーチリゾート特価'
      },
      {
        id: 'monthly-2',
        name: 'ニセコ グラン ヒラフ',
        area: '北海道・ニセコ',
        image: 'https://images.unsplash.com/photo-1551524164-687a55dd1126?w=400&q=80',
        normalPrice: 65000,
        monthlyPrice: 42000,
        discount: 35,
        rating: 4.6,
        reviewCount: 789,
        amenities: ['スキー', '温泉', 'レストラン', 'ラウンジ'],
        bestDates: ['12/18-19', '12/25-26', '1/8-9'],
        otaPrices: {
          '楽天トラベル': 42000,
          'Booking.com': 45000,
          'じゃらん': 43500
        },
        bestOTA: '楽天トラベル',
        month: thisMonth,
        specialOffer: 'スキーシーズン特価'
      },
      {
        id: 'monthly-3',
        name: '強羅花壇',
        area: '神奈川・箱根',
        image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80',
        normalPrice: 85000,
        monthlyPrice: 58000,
        discount: 32,
        rating: 4.8,
        reviewCount: 1012,
        amenities: ['温泉', '会席', '庭園', 'ラウンジ'],
        bestDates: ['12/20-21', '12/27-28', '1/5-6'],
        otaPrices: {
          '楽天トラベル': 59000,
          'Booking.com': 58000,
          'じゃらん': 60500
        },
        bestOTA: 'Booking.com',
        month: thisMonth,
        specialOffer: '温泉旅館特価'
      }
    ];
    
    setMonthlyDeals(deals);
  };

  const getWeekendDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToFriday = (5 - dayOfWeek + 7) % 7;
    
    const friday = new Date(today);
    friday.setDate(today.getDate() + daysToFriday);
    
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    
    return {
      friday: friday.toISOString().split('T')[0],
      sunday: sunday.toISOString().split('T')[0],
      fridayStr: `${friday.getMonth() + 1}/${friday.getDate()}`,
      sundayStr: `${sunday.getMonth() + 1}/${sunday.getDate()}`
    };
  };

  const getCurrentMonth = () => {
    const now = new Date();
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return monthNames[now.getMonth()];
  };

  const handleHotelClick = (hotel: any) => {
    setSelectedHotel(hotel);
    setShowComparison(true);
  };

  const handleBooking = (otaProvider: string, url: string) => {
    window.open(url, '_blank');
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'high': return '残りわずか';
      case 'medium': return '人気上昇中';
      default: return '予約可能';
    }
  };

  const weekend = getWeekendDates();

  return (
    <div style={{
      padding: '40px 20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '60px' }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '500',
            color: '#4A4A4A',
            margin: 0
          }}>
            🔥 今週末の特価ホテル
          </h2>
          <div style={{
            background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {weekend.fridayStr} - {weekend.sundayStr}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {weekendDeals.map((hotel, index) => (
            <motion.div
              key={hotel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => handleHotelClick(hotel)}
              style={{
                background: 'white',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                position: 'relative',
                height: '200px',
                background: `url(${hotel.image}) center/cover`
              }}>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: getUrgencyColor(hotel.urgency),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  {getUrgencyText(hotel.urgency)}
                </div>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#4CAF50',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  {hotel.discount}% OFF
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '500',
                  color: '#4A4A4A',
                  marginBottom: '4px'
                }}>
                  {hotel.name}
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#666',
                  marginBottom: '12px'
                }}>
                  📍 {hotel.area}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} style={{
                        color: i < Math.floor(hotel.rating) ? '#FFD700' : '#E0E0E0',
                        fontSize: '0.8rem'
                      }}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span style={{
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>
                    {hotel.rating} ({hotel.reviewCount}件)
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#999',
                      textDecoration: 'line-through'
                    }}>
                      通常 ¥{hotel.normalPrice.toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      color: '#E8B4B8'
                    }}>
                      ¥{hotel.weekendPrice.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>
                    🥇 {hotel.bestOTA}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '16px'
                }}>
                  {hotel.amenities.slice(0, 4).map((amenity, i) => (
                    <span key={i} style={{
                      background: 'rgba(232,180,184,0.1)',
                      color: '#E8B4B8',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '500'
                    }}>
                      {amenity}
                    </span>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: '#666'
                }}>
                  <span>残り{hotel.availableRooms}室</span>
                  <span>価格比較 ➜</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '500',
            color: '#4A4A4A',
            margin: 0
          }}>
            💎 {getCurrentMonth()}のお得なホテル
          </h2>
          <div style={{
            background: 'linear-gradient(135deg, #92A8D1 0%, #E8B4B8 100%)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            月間特価
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {monthlyDeals.map((hotel, index) => (
            <motion.div
              key={hotel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => handleHotelClick(hotel)}
              style={{
                background: 'white',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                position: 'relative',
                height: '200px',
                background: `url(${hotel.image}) center/cover`
              }}>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: '#9C27B0',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  {hotel.specialOffer}
                </div>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#FF5722',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  {hotel.discount}% OFF
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '500',
                  color: '#4A4A4A',
                  marginBottom: '4px'
                }}>
                  {hotel.name}
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#666',
                  marginBottom: '12px'
                }}>
                  📍 {hotel.area}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#999',
                      textDecoration: 'line-through'
                    }}>
                      通常 ¥{hotel.normalPrice.toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      color: '#92A8D1'
                    }}>
                      ¥{hotel.monthlyPrice.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #92A8D1 0%, #E8B4B8 100%)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>
                    🥇 {hotel.bestOTA}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(146,168,209,0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#4A4A4A',
                    marginBottom: '4px'
                  }}>
                    おすすめ日程
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#666'
                  }}>
                    {hotel.bestDates.join(' / ')}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '16px'
                }}>
                  {hotel.amenities.slice(0, 4).map((amenity, i) => (
                    <span key={i} style={{
                      background: 'rgba(146,168,209,0.1)',
                      color: '#92A8D1',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '500'
                    }}>
                      {amenity}
                    </span>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: '#666'
                }}>
                  <span>⭐ {hotel.rating} ({hotel.reviewCount}件)</span>
                  <span>価格比較 ➜</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <AnimatePresence>
        {showComparison && selectedHotel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowComparison(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                background: 'white',
                borderRadius: '24px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                borderBottom: '1px solid #E0E0E0'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '500',
                  color: '#4A4A4A',
                  margin: 0
                }}>
                  価格比較・予約
                </h3>
                <button
                  onClick={() => setShowComparison(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ padding: '0' }}>
                <HotelPriceComparison
                  hotelName={selectedHotel.name}
                  checkIn={selectedHotel.checkIn || selectedHotel.bestDates?.[0]?.split('-')[0]}
                  checkOut={selectedHotel.checkOut || selectedHotel.bestDates?.[0]?.split('-')[1]}
                  onSelectOTA={handleBooking}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};