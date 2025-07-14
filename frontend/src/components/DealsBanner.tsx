import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Deal {
  id: string;
  hotelName: string;
  discount: number;
  timeLeft: string;
  price: number;
}

export const DealsBanner: React.FC = () => {
  const [currentDealIndex, setCurrentDealIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  
  // モックディール（実際はSupabaseから取得）
  const deals: Deal[] = [
    {
      id: '1',
      hotelName: 'ザ・リッツ・カールトン東京',
      discount: 35,
      timeLeft: '2:45:30',
      price: 32000
    },
    {
      id: '2',
      hotelName: 'マンダリン オリエンタル 東京',
      discount: 25,
      timeLeft: '5:12:45',
      price: 28000
    },
    {
      id: '3',
      hotelName: 'アマン東京',
      discount: 20,
      timeLeft: '1:30:15',
      price: 48000
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDealIndex((prev) => (prev + 1) % deals.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [deals.length]);

  useEffect(() => {
    // カウントダウンタイマー
    const timer = setInterval(() => {
      const now = new Date();
      const endTime = new Date();
      endTime.setHours(23, 59, 59, 999);
      
      const diff = endTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentDeal = deals[currentDealIndex];

  return (
    <div style={{
      background: 'linear-gradient(90deg, #dc2626, #ef4444, #f87171)',
      color: 'white',
      padding: '12px 0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* タイムセールアイコン */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: 'fit-content'
        }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ fontSize: '24px' }}
          >
            ⏰
          </motion.div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>タイムセール</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>残り {timeLeft}</div>
          </div>
        </div>

        {/* ディール情報 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDeal.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ 
              fontSize: window.innerWidth < 640 ? '14px' : '16px',
              fontWeight: '600'
            }}>
              {currentDeal.hotelName}
            </span>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {currentDeal.discount}% OFF
            </span>
            <span style={{
              fontSize: '18px',
              fontWeight: 'bold'
            }}>
              ¥{currentDeal.price.toLocaleString()}〜
            </span>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'white',
            color: '#dc2626',
            padding: '8px 20px',
            borderRadius: '20px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: 'fit-content',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          今すぐ見る
        </motion.button>
      </div>

      {/* ページインジケーター */}
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '4px'
      }}>
        {deals.map((_, index) => (
          <div
            key={index}
            style={{
              width: index === currentDealIndex ? '16px' : '6px',
              height: '3px',
              background: index === currentDealIndex ? 'white' : 'rgba(255,255,255,0.5)',
              borderRadius: '2px',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
    </div>
  );
};