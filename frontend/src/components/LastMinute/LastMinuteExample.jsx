/**
 * LastMinute Example Component
 * 直前予約機能のデモ・テスト用コンポーネント
 */

import React, { useState, useEffect } from 'react';
import LastMinuteBookingService from '../../services/LastMinuteBookingService.js';
import { LastMinuteFilterComponent, LastMinuteHotelCard } from './index.js';

const LastMinuteExample = () => {
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchParams, setSearchParams] = useState({
    location: {
      name: '東京',
      city: '東京',
      country: '日本',
      latitude: 35.6762,
      longitude: 139.6503
    },
    guests: 2,
    rooms: 1
  });

  // リアルタイム時刻更新
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1分毎に更新

    return () => clearInterval(interval);
  }, []);

  // サンプルデータを生成
  const generateSampleHotels = () => {
    const now = new Date();
    const sampleHotels = [];

    // 異なる緊急度のホテルを作成
    const urgencyLevels = ['critical', 'high', 'medium', 'low'];
    const hotelNames = [
      'ホテルニューオータニ東京',
      '帝国ホテル東京',
      'ザ・リッツ・カールトン東京',
      'パークハイアット東京',
      'グランドハイアット東京',
      '東京ステーションホテル',
      'コンラッド東京',
      'アンダーズ東京',
      '東京プリンスホテル',
      'ヒルトン東京'
    ];

    urgencyLevels.forEach((urgency, index) => {
      const basePrice = 15000 + (index * 5000);
      const discountRate = urgency === 'critical' ? 25 : 
                          urgency === 'high' ? 20 : 
                          urgency === 'medium' ? 15 : 10;
      
      const hotel = {
        id: `hotel_${index + 1}`,
        name: hotelNames[index] || `サンプルホテル${index + 1}`,
        location: {
          latitude: 35.6762 + (Math.random() - 0.5) * 0.02,
          longitude: 139.6503 + (Math.random() - 0.5) * 0.02,
          address: `東京都千代田区丸の内${index + 1}-1-1`,
          city: '東京',
          country: '日本'
        },
        rating: {
          stars: 4 + Math.floor(Math.random() * 2),
          review: {
            score: 4.0 + Math.random(),
            count: 100 + Math.floor(Math.random() * 500),
            description: 'ラグジュアリーホテル'
          }
        },
        price: {
          currency: 'JPY',
          total: Math.round(basePrice * (1 - discountRate / 100)),
          perNight: Math.round(basePrice * (1 - discountRate / 100)),
          original: basePrice
        },
        images: [
          {
            url: `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80&sig=${index}`,
            description: `${hotelNames[index]} 外観`
          }
        ],
        amenities: ['WiFi無料', 'フィットネス', 'レストラン', 'バー', 'コンシェルジュ', 'ルームサービス'],
        description: `東京の中心部に位置する${hotelNames[index]}。`,
        policies: {
          checkIn: '15:00',
          checkOut: '11:00'
        },
        available: true,
        source: 'lastminute_sample',
        lastMinute: {
          isLastMinute: true,
          urgencyLevel: urgency,
          canCheckInToday: urgency === 'critical' || urgency === 'high',
          bookingDeadline: new Date(now.getTime() + (urgency === 'critical' ? 2 : 
                                                   urgency === 'high' ? 6 : 
                                                   urgency === 'medium' ? 12 : 24) * 60 * 60 * 1000),
          nextAvailableCheckIn: urgency === 'critical' || urgency === 'high' ? 
            new Date(now.getTime() + 3 * 60 * 60 * 1000) : // 3時間後
            new Date(now.getTime() + 24 * 60 * 60 * 1000) // 明日
        },
        discount: {
          hasDiscount: true,
          discountRate: discountRate,
          originalPrice: basePrice,
          discountedPrice: Math.round(basePrice * (1 - discountRate / 100)),
          savingsAmount: Math.round(basePrice * discountRate / 100),
          urgencyLevel: urgency
        }
      };

      sampleHotels.push(hotel);
    });

    return sampleHotels;
  };

  // 初期データ読み込み
  useEffect(() => {
    setIsLoading(true);
    // サンプルデータを生成
    const sampleData = generateSampleHotels();
    
    // LastMinuteBookingServiceで処理
    setTimeout(() => {
      const enrichedHotels = sampleData.map(hotel => 
        LastMinuteBookingService.enrichWithLastMinuteData(hotel, currentTime)
      );
      const sortedHotels = LastMinuteBookingService.sortByLastMinutePriority(enrichedHotels);
      
      setHotels(sortedHotels);
      setFilteredHotels(sortedHotels);
      setIsLoading(false);
    }, 1000);
  }, [currentTime]);

  // フィルター変更ハンドラー
  const handleFilterChange = (filters) => {
    let filtered = [...hotels];

    // 緊急度フィルター
    if (filters.urgencyLevel && filters.urgencyLevel !== 'all') {
      filtered = filtered.filter(hotel => hotel.lastMinute?.urgencyLevel === filters.urgencyLevel);
    }

    // 割引率フィルター
    if (filters.discountRange && filters.discountRange !== 'all') {
      filtered = filtered.filter(hotel => {
        const discountRate = hotel.discount?.discountRate || 0;
        switch (filters.discountRange) {
          case '10-15':
            return discountRate >= 10 && discountRate < 15;
          case '15-20':
            return discountRate >= 15 && discountRate < 20;
          case '20+':
            return discountRate >= 20;
          default:
            return true;
        }
      });
    }

    // チェックイン時期フィルター
    if (filters.checkInTime && filters.checkInTime !== 'all') {
      filtered = filtered.filter(hotel => {
        if (filters.checkInTime === 'today') {
          return hotel.lastMinute?.canCheckInToday;
        } else if (filters.checkInTime === 'tomorrow') {
          return !hotel.lastMinute?.canCheckInToday;
        }
        return true;
      });
    }

    // 価格帯フィルター
    if (filters.priceRange && filters.priceRange !== 'all') {
      filtered = filtered.filter(hotel => {
        const price = hotel.price?.total || 0;
        switch (filters.priceRange) {
          case 'budget':
            return price <= 10000;
          case 'mid':
            return price > 10000 && price <= 30000;
          case 'luxury':
            return price > 30000;
          default:
            return true;
        }
      });
    }

    // 利用可能性フィルター
    if (filters.availableOnly) {
      filtered = filtered.filter(hotel => hotel.available);
    }

    setFilteredHotels(filtered);
  };

  // ソート変更ハンドラー
  const handleSortChange = (sortBy) => {
    let sorted = [...filteredHotels];
    
    switch (sortBy) {
      case 'urgency':
        sorted = LastMinuteBookingService.sortByLastMinutePriority(sorted);
        break;
      case 'discount':
        sorted.sort((a, b) => (b.discount?.discountRate || 0) - (a.discount?.discountRate || 0));
        break;
      case 'price':
        sorted.sort((a, b) => (a.price?.total || 0) - (b.price?.total || 0));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating?.review?.score || 0) - (a.rating?.review?.score || 0));
        break;
      default:
        break;
    }
    
    setFilteredHotels(sorted);
  };

  // 予約ボタンクリックハンドラー
  const handleBookingClick = (hotel) => {
    alert(`${hotel.name}の予約を開始します。\n割引率: ${hotel.discount?.discountRate || 0}%\n価格: ¥${hotel.price?.total?.toLocaleString()}`);
  };

  // 詳細ボタンクリックハンドラー
  const handleDetailsClick = (hotel) => {
    console.log('Hotel details:', hotel);
    alert(`${hotel.name}の詳細を表示します。`);
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: '32px',
        color: '#1e293b',
        fontSize: '32px',
        fontWeight: '800'
      }}>
        LastMinuteStay - 直前予約サービス
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* フィルターパネル */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <LastMinuteFilterComponent
            hotels={filteredHotels}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            currentTime={currentTime}
            isLoading={isLoading}
          />
        </div>

        {/* ホテルリスト */}
        <div>
          {isLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px',
              color: '#64748b'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #f1f5f9',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              直前予約可能ホテルを検索中...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '20px'
            }}>
              {filteredHotels.length > 0 ? (
                filteredHotels.map(hotel => (
                  <LastMinuteHotelCard
                    key={hotel.id}
                    hotel={hotel}
                    currentTime={currentTime}
                    onBookingClick={handleBookingClick}
                    onDetailsClick={handleDetailsClick}
                    showFullDetails={false}
                  />
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px',
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏨</div>
                  <h3 style={{ color: '#374151', marginBottom: '8px' }}>
                    条件に合うホテルが見つかりませんでした
                  </h3>
                  <p style={{ color: '#64748b' }}>
                    フィルター条件を変更して再度お試しください。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* リアルタイム時刻表示 */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        zIndex: 1000
      }}>
        {currentTime.toLocaleString('ja-JP')}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .grid-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LastMinuteExample;