import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchPriceHistory, getPricePrediction, trackAffiliateClick } from '../lib/supabase';

interface OTAPrice {
  provider: string;
  price: number;
  url: string;
  logo: string;
  discount?: number;
}

interface HotelCardEnhancedProps {
  hotel: any;
  selectedDates: { checkin: string; checkout: string };
  isFavorite: boolean;
  onToggleFavorite: (hotelId: string) => void;
  currentUser: any;
  onHotelClick: (hotel: any) => void;
}

export const HotelCardEnhanced: React.FC<HotelCardEnhancedProps> = ({
  hotel,
  selectedDates,
  isFavorite,
  onToggleFavorite,
  currentUser,
  onHotelClick
}) => {
  const [prediction, setPrediction] = useState<any>(null);
  const [otaPrices, setOtaPrices] = useState<OTAPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadPriceData();
  }, [hotel.id, selectedDates]);

  const loadPriceData = async () => {
    setIsLoading(true);
    try {
      // AI価格予測を取得
      if (selectedDates?.checkin) {
        const pred = await getPricePrediction(hotel.id, selectedDates.checkin);
        setPrediction(pred);
      }

      // OTA価格をシミュレート（実際はAPIから取得）
      const basePrice = hotel.price || 15000;
      const mockOtaPrices: OTAPrice[] = [
        {
          provider: '楽天トラベル',
          price: basePrice * (0.90 + Math.random() * 0.10),
          url: `https://travel.rakuten.co.jp/yado/${encodeURIComponent(hotel.name)}`,
          logo: '🏨',
          discount: Math.floor(Math.random() * 10) + 5
        },
        {
          provider: 'Booking.com',
          price: basePrice * (0.92 + Math.random() * 0.08),
          url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name + ' ' + hotel.location)}`,
          logo: '🏢',
          discount: Math.floor(Math.random() * 8) + 2
        },
        {
          provider: 'Agoda',
          price: basePrice * (0.88 + Math.random() * 0.12),
          url: `https://www.agoda.com/search?city=${encodeURIComponent(hotel.location)}&searchText=${encodeURIComponent(hotel.name)}`,
          logo: '🏩',
          discount: Math.floor(Math.random() * 12) + 8
        },
        {
          provider: 'じゃらん',
          price: basePrice * (0.93 + Math.random() * 0.07),
          url: `https://www.jalan.net/yad_search/?kw=${encodeURIComponent(hotel.name)}`,
          logo: '🏪',
          discount: Math.floor(Math.random() * 7) + 3
        },
        {
          provider: 'Yahoo!トラベル',
          price: basePrice * (0.91 + Math.random() * 0.09),
          url: `https://travel.yahoo.co.jp/search?keyword=${encodeURIComponent(hotel.name)}`,
          logo: '🏬',
          discount: Math.floor(Math.random() * 9) + 4
        }
      ].sort((a, b) => a.price - b.price);

      setOtaPrices(mockOtaPrices);
    } catch (error) {
      console.error('Price data loading error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTAClick = async (ota: OTAPrice, e: React.MouseEvent) => {
    e.stopPropagation();
    await trackAffiliateClick(hotel.id, ota.provider, currentUser?.id);
    window.open(ota.url, '_blank');
  };

  const lowestPrice = otaPrices[0];
  const savings = prediction?.predictedPrice && lowestPrice 
    ? Math.round(((prediction.predictedPrice - lowestPrice.price) / prediction.predictedPrice) * 100)
    : 0;

  // お得度計算とアドバイス生成
  const getBestDealAdvice = () => {
    if (!otaPrices.length) return null;
    
    const cheapestOTA = otaPrices[0];
    const secondCheapest = otaPrices[1];
    const priceGap = secondCheapest ? secondCheapest.price - cheapestOTA.price : 0;
    
    // 現在の日付から予約日までの日数を計算
    const today = new Date();
    const checkinDate = new Date(selectedDates.checkin);
    const daysUntilCheckin = Math.ceil((checkinDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    let advice = "";
    let urgency = "normal";
    let savingsAmount = 0;
    
    if (daysUntilCheckin <= 7) {
      // 1週間以内の予約
      advice = "直前予約で最大15%OFF！今すぐ予約がお得です";
      urgency = "high";
      savingsAmount = Math.round(cheapestOTA.price * 0.15);
    } else if (daysUntilCheckin <= 30) {
      // 1ヶ月以内の予約
      advice = "早期予約割引適用中！あと数日で価格が上がる可能性があります";
      urgency = "medium";
      savingsAmount = Math.round(cheapestOTA.price * 0.08);
    } else {
      // 1ヶ月以上先の予約
      advice = "早期予約で最大20%OFF！価格変動をAIが監視中";
      urgency = "low";
      savingsAmount = Math.round(cheapestOTA.price * 0.20);
    }
    
    return {
      advice,
      urgency,
      savingsAmount,
      cheapestProvider: cheapestOTA.provider,
      priceGap: Math.round(priceGap),
      bestTime: daysUntilCheckin <= 7 ? "今すぐ" : daysUntilCheckin <= 30 ? "今週中" : "1ヶ月前"
    };
  };

  const bestDealAdvice = getBestDealAdvice();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => onHotelClick(hotel)}
      className="hotel-card-enhanced"
      style={{
        background: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        height: showDetails ? 'auto' : '420px'
      }}
    >
      {/* ホテル画像 */}
      <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
        <img 
          src={hotel.imageData?.thumbnail || hotel.thumbnailUrl}
          alt={hotel.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
          }}
        />
        
        {/* お得バッジ */}
        {savings > 10 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'linear-gradient(135deg, #ff385c, #e91e63)',
            color: 'white',
            padding: '6px 16px',
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            {savings}% お得！
          </div>
        )}

        {/* AI予測信頼度 */}
        {prediction && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.95)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#059669'
          }}>
            AI信頼度 {prediction.confidence}%
          </div>
        )}

        {/* お気に入りボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!currentUser) {
              alert('ログインが必要です');
              return;
            }
            onToggleFavorite(hotel.id);
          }}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          <svg width="20" height="20" fill={isFavorite ? '#ef4444' : 'none'} stroke={isFavorite ? '#ef4444' : '#6b7280'} strokeWidth="2">
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
          </svg>
        </button>
      </div>

      {/* コンテンツ */}
      <div style={{ padding: '16px' }}>
        {/* ホテル情報 */}
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{hotel.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', color: '#f59e0b' }}>
              {[...Array(5)].map((_, i) => (
                <span key={i}>{i < Math.floor(hotel.rating) ? '★' : '☆'}</span>
              ))}
            </div>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>{hotel.rating} ({hotel.reviewCount}件)</span>
          </div>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>📍 {hotel.location}</p>
        </div>

        {/* OTA価格比較 */}
        <div style={{
          background: 'linear-gradient(to right, #fef3c7, #fee2e2)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#92400e' }}>
            🏷️ 最安値で予約
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>読み込み中...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {otaPrices.slice(0, showDetails ? undefined : 2).map((ota, index) => {
                const isLowest = index === 0;
                const priceDifference = index > 0 ? Math.round(ota.price - otaPrices[0].price) : 0;
                
                return (
                  <div
                    key={ota.provider}
                    onClick={(e) => handleOTAClick(ota, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: isLowest ? 'white' : 'rgba(255,255,255,0.7)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isLowest ? '2px solid #10b981' : '1px solid #e5e7eb',
                      transition: 'all 0.2s ease',
                      boxShadow: isLowest ? '0 2px 8px rgba(16,185,129,0.2)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = isLowest ? '0 4px 12px rgba(16,185,129,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = isLowest ? '0 2px 8px rgba(16,185,129,0.2)' : 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{ota.logo}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{ota.provider}</span>
                        {priceDifference > 0 && (
                          <span style={{ fontSize: '10px', color: '#dc2626' }}>
                            +¥{priceDifference.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {isLowest && (
                        <span style={{
                          background: '#10b981',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}>
                          最安値
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {ota.discount && (
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#dc2626', 
                          fontWeight: 'bold',
                          background: '#fee2e2',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          -{ota.discount}%
                        </span>
                      )}
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                        ¥{Math.round(ota.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 詳細表示トグル */}
          {!isLoading && otaPrices.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                background: 'transparent',
                border: 'none',
                color: '#b91c1c',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {showDetails ? '閉じる' : `他${otaPrices.length - 1}件の価格を見る`}
              <span style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>
          )}
        </div>

        {/* お得情報セクション */}
        {bestDealAdvice && (
          <div style={{
            background: bestDealAdvice.urgency === 'high' ? '#fef2f2' : 
                       bestDealAdvice.urgency === 'medium' ? '#fffbeb' : '#f0fdf4',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            border: `2px solid ${
              bestDealAdvice.urgency === 'high' ? '#fca5a5' : 
              bestDealAdvice.urgency === 'medium' ? '#fbbf24' : '#86efac'
            }`
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '8px',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>
                {bestDealAdvice.urgency === 'high' ? '🔥' : 
                 bestDealAdvice.urgency === 'medium' ? '⚡' : '💡'}
              </span>
              <span style={{ 
                fontWeight: 'bold', 
                fontSize: '14px',
                color: bestDealAdvice.urgency === 'high' ? '#dc2626' : 
                       bestDealAdvice.urgency === 'medium' ? '#d97706' : '#059669'
              }}>
                最大¥{bestDealAdvice.savingsAmount.toLocaleString()}お得！
              </span>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '12px', 
              lineHeight: '1.4',
              color: '#374151'
            }}>
              {bestDealAdvice.advice}
            </p>
            <div style={{ 
              marginTop: '8px', 
              fontSize: '11px', 
              color: '#6b7280',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>最安値: {bestDealAdvice.cheapestProvider}</span>
              <span>予約推奨: {bestDealAdvice.bestTime}</span>
            </div>
          </div>
        )}

        {/* AI予測 */}
        {prediction && (
          <div style={{
            background: '#f0f9ff',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '12px',
            color: '#0c4a6e'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              🤖 AI予測: ¥{Math.round(prediction.predictedPrice).toLocaleString()}
            </div>
            <p style={{ lineHeight: '1.4' }}>{prediction.reasoning}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};