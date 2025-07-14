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
      const mockOtaPrices: OTAPrice[] = [
        {
          provider: '楽天トラベル',
          price: hotel.price * 0.95,
          url: `https://travel.rakuten.co.jp/hotel/${hotel.id}`,
          logo: '🏨',
          discount: 5
        },
        {
          provider: 'Booking.com',
          price: hotel.price * 0.98,
          url: `https://booking.com/hotel/${hotel.id}`,
          logo: '🏢',
          discount: 2
        },
        {
          provider: 'Agoda',
          price: hotel.price * 0.92,
          url: `https://agoda.com/hotel/${hotel.id}`,
          logo: '🏩',
          discount: 8
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {otaPrices.slice(0, showDetails ? undefined : 1).map((ota, index) => (
                <div
                  key={ota.provider}
                  onClick={(e) => handleOTAClick(ota, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: index === 0 ? 'white' : 'rgba(255,255,255,0.7)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: index === 0 ? '2px solid #10b981' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{ota.logo}</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{ota.provider}</span>
                    {index === 0 && (
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
                      <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold' }}>
                        -{ota.discount}%
                      </span>
                    )}
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                      ¥{Math.round(ota.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
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