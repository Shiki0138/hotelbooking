import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface HeroSearchSectionProps {
  onSearch: (params: any) => void;
}

export const HeroSearchSection: React.FC<HeroSearchSectionProps> = ({ onSearch }) => {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const popularDestinations = [
    { icon: '🗼', name: '東京', count: '2,345軒' },
    { icon: '🏯', name: '京都', count: '1,234軒' },
    { icon: '🌊', name: '沖縄', count: '987軒' },
    { icon: '🦌', name: '大阪', count: '1,567軒' }
  ];

  const handleSearch = () => {
    onSearch({ location, checkIn, checkOut, guests });
  };

  return (
    <section style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px 16px 40px',
      minHeight: 'auto' // 高さを抑える
    }}>
      {/* コンパクトなヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '24px' }}
      >
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          AIが見つける最安値
        </h1>
        <p style={{
          fontSize: '14px',
          opacity: 0.9
        }}>
          最適な予約タイミングをAI予測
        </p>
      </motion.div>

      {/* 検索フォーム */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}
      >
        {/* 場所・ホテル名検索 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f3f4f6',
            borderRadius: '12px',
            padding: '12px 16px',
            position: 'relative'
          }}>
            <span style={{ fontSize: '20px', marginRight: '12px' }}>🔍</span>
            <input
              type="text"
              placeholder="場所・ホテル名で検索"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => setShowSuggestions(true)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '16px',
                outline: 'none',
                color: '#1f2937'
              }}
            />
            {location && (
              <button
                onClick={() => setLocation('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 検索サジェスト */}
          {showSuggestions && !location && (
            <div style={{
              position: 'absolute',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              marginTop: '8px',
              padding: '8px 0',
              zIndex: 10
            }}>
              <div style={{
                padding: '8px 16px',
                fontSize: '12px',
                color: '#6b7280',
                borderBottom: '1px solid #e5e7eb'
              }}>
                人気の行き先
              </div>
              {popularDestinations.map((dest) => (
                <button
                  key={dest.name}
                  onClick={() => {
                    setLocation(dest.name);
                    setShowSuggestions(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '20px', marginRight: '12px' }}>{dest.icon}</span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>{dest.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{dest.count}</div>
                  </div>
                  <span style={{ color: '#6b7280' }}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 日付選択 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            background: '#f3f4f6',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '20px', marginRight: '12px' }}>📅</span>
            <input
              type="date"
              placeholder="チェックイン"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                outline: 'none',
                color: '#1f2937'
              }}
            />
          </div>
          <div style={{
            background: '#f3f4f6',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '20px', marginRight: '12px' }}>📆</span>
            <input
              type="date"
              placeholder="チェックアウト"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                outline: 'none',
                color: '#1f2937'
              }}
            />
          </div>
        </div>

        {/* 人数選択 */}
        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '20px', marginRight: '12px' }}>👥</span>
          <span style={{ flex: 1, color: '#1f2937' }}>大人{guests}名</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setGuests(Math.max(1, guests - 1))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #e5e7eb',
                background: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              −
            </button>
            <button
              onClick={() => setGuests(guests + 1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #e5e7eb',
                background: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* 検索ボタン */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSearch}
          style={{
            width: '100%',
            padding: '16px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>🔍</span>
          <span>最安値を検索</span>
        </motion.button>
      </motion.div>

      {/* クイックアクセス */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          marginTop: '24px',
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <button style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '20px',
          padding: '8px 16px',
          color: 'white',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          cursor: 'pointer'
        }}>
          📍 現在地から探す
        </button>
        <button style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '20px',
          padding: '8px 16px',
          color: 'white',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          cursor: 'pointer'
        }}>
          🔥 今週末の空室
        </button>
        <button style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '20px',
          padding: '8px 16px',
          color: 'white',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          cursor: 'pointer'
        }}>
          💰 セール中
        </button>
      </motion.div>
    </section>
  );
};