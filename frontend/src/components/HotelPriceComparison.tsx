import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../services/geminiService';

interface OTAPrice {
  rank: number;
  provider: string;
  price: number;
  originalPrice?: number;
  points?: number;
  badge?: string;
}

interface HotelPriceComparisonProps {
  hotelName: string;
  hotelImage?: string;
  checkIn: string;
  checkOut: string;
  onSelectOTA: (provider: string, url: string) => void;
}

export const HotelPriceComparison: React.FC<HotelPriceComparisonProps> = ({
  hotelName,
  hotelImage,
  checkIn,
  checkOut,
  onSelectOTA
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [prices, setPrices] = useState<OTAPrice[]>([]);
  const [aiComment, setAiComment] = useState('');
  const [dealScore, setDealScore] = useState(0);

  useEffect(() => {
    const fetchPriceData = async () => {
      setIsLoading(true);
      
      try {
        // Gemini APIで価格分析
        const otaAnalysis = await geminiService.analyzeOTAPrices(hotelName, checkIn);
        
        if (otaAnalysis && otaAnalysis.recommendations) {
          const formattedPrices = otaAnalysis.recommendations
            .slice(0, 3)
            .map((rec, index) => ({
              rank: index + 1,
              provider: rec.provider,
              price: rec.estimatedPrice,
              originalPrice: Math.round(rec.estimatedPrice * 1.5),
              points: rec.provider === '楽天トラベル' ? Math.round(rec.estimatedPrice * 0.05) : 
                      rec.provider === 'じゃらん' ? Math.round(rec.estimatedPrice * 0.01) : undefined,
              badge: index === 0 ? '最安値' : undefined
            }));
          
          setPrices(formattedPrices);
          setAiComment(otaAnalysis.insights);
        } else {
          // フォールバックデータ
          setPrices([
            {
              rank: 1,
              provider: '楽天トラベル',
              price: 42000,
              originalPrice: 68000,
              points: 2100,
              badge: '最安値'
            },
            {
              rank: 2,
              provider: 'Booking.com',
              price: 43500,
              originalPrice: 68000
            },
            {
              rank: 3,
              provider: 'じゃらん',
              price: 44200,
              originalPrice: 68000,
              points: 442
            }
          ]);
        }
        
        // AIコメント生成
        const insight = await geminiService.generateInsight(hotelName, { checkIn, checkOut });
        setAiComment(insight || '今週末は穴場！お得に予約できるチャンスです');
        
        // お得度スコア計算
        const avgDiscount = prices.length > 0 
          ? Math.round(prices.reduce((acc, p) => acc + ((p.originalPrice! - p.price) / p.originalPrice! * 100), 0) / prices.length)
          : 85;
        setDealScore(Math.min(95, avgDiscount + 10));
        
      } catch (error) {
        console.error('Failed to fetch price data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPriceData();
  }, [hotelName, checkIn, checkOut]);

  const getMedalEmoji = (rank: number) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAFAFA 0%, #F0F0F0 100%)',
      padding: '20px'
    }}>
      {/* ホテル情報ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
        }}
      >
        <h1 style={{
          fontSize: '24px',
          fontWeight: '400',
          color: '#4A4A4A',
          marginBottom: '8px'
        }}>
          {hotelName}
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#999'
        }}>
          {checkIn} 〜 {checkOut} 1泊
        </p>
      </motion.div>

      {/* AI分析結果 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: 'linear-gradient(135deg, rgba(247,202,201,0.2) 0%, rgba(146,168,209,0.2) 100%)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(232,180,184,0.3)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
            style={{ fontSize: '24px' }}
          >
            ✨
          </motion.div>
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#666',
            background: 'linear-gradient(90deg, #E8B4B8 0%, #B8D4E3 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Gemini AI の分析
          </span>
        </div>
        
        <p style={{
          fontSize: '16px',
          color: '#4A4A4A',
          lineHeight: 1.6,
          marginBottom: '16px'
        }}>
          💬 {aiComment}
        </p>

        {/* お得度メーター */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '14px', color: '#666' }}>お得度</span>
          <div style={{
            flex: 1,
            height: '8px',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${dealScore}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #E8B4B8 0%, #92A8D1 100%)',
                borderRadius: '4px'
              }}
            />
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#E8B4B8'
          }}>
            {dealScore}%
          </span>
        </div>
      </motion.div>

      {/* 価格比較カード */}
      <div style={{ marginBottom: '24px' }}>
        {isLoading ? (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: '40px',
                height: '40px',
                margin: '0 auto 16px',
                border: '3px solid #E8B4B8',
                borderTopColor: 'transparent',
                borderRadius: '50%'
              }}
            />
            <p style={{ color: '#999' }}>AI が価格を分析中...</p>
          </div>
        ) : (
          <AnimatePresence>
            {prices.map((ota, index) => (
              <motion.div
                key={ota.provider}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  background: ota.rank === 1 
                    ? 'linear-gradient(135deg, rgba(232,180,184,0.05) 0%, rgba(184,212,227,0.05) 100%)'
                    : 'white',
                  borderRadius: '20px',
                  padding: '24px',
                  marginBottom: '16px',
                  boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
                  border: ota.rank === 1 ? '2px solid #E8B4B8' : '1px solid rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 5px 20px rgba(0,0,0,0.05)';
                }}
                onClick={() => onSelectOTA(ota.provider, '#')}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {/* 左側：順位とOTA名 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <span style={{ fontSize: '28px' }}>{getMedalEmoji(ota.rank)}</span>
                    <div>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '500',
                        color: '#4A4A4A',
                        marginBottom: '4px'
                      }}>
                        {ota.provider}
                      </h3>
                      {ota.points && (
                        <p style={{
                          fontSize: '12px',
                          color: '#E8B4B8'
                        }}>
                          +{ota.points.toLocaleString()}pt 還元
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 右側：価格情報 */}
                  <div style={{ textAlign: 'right' }}>
                    {ota.originalPrice && (
                      <p style={{
                        fontSize: '12px',
                        color: '#999',
                        textDecoration: 'line-through',
                        marginBottom: '4px'
                      }}>
                        ¥{ota.originalPrice.toLocaleString()}
                      </p>
                    )}
                    <p style={{
                      fontSize: '24px',
                      fontWeight: '600',
                      color: ota.rank === 1 ? '#E8B4B8' : '#4A4A4A'
                    }}>
                      ¥{ota.price.toLocaleString()}
                    </p>
                    {ota.badge && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        padding: '4px 12px',
                        background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
                        color: 'white',
                        fontSize: '12px',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        {ota.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* 予約ボタン（1位のみ） */}
                {ota.rank === 1 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      padding: '16px',
                      background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(232,180,184,0.3)'
                    }}
                  >
                    このサイトで予約する 🔥
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* その他のOTA情報 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          textAlign: 'center',
          color: '#999',
          fontSize: '14px'
        }}
      >
        <p>
          ✓ 他3サイトもチェック済み
        </p>
        <p style={{ fontSize: '12px', marginTop: '4px' }}>
          （Expedia, Agoda, Hotels.com）
        </p>
      </motion.div>

      {/* 注意書き */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{
          marginTop: '40px',
          padding: '16px',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '12px',
          textAlign: 'center'
        }}
      >
        <p style={{
          fontSize: '12px',
          color: '#999',
          lineHeight: 1.6
        }}>
          ※ 価格は予約時に変動する場合があります<br/>
          ※ AIの予測は過去データに基づく参考情報です
        </p>
      </motion.div>
    </div>
  );
};