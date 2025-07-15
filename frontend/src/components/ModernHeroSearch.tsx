import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModernHeroSearchProps {
  onSearch: (params: any) => void;
  onAreaSelect: (area: string) => void;
}

export const ModernHeroSearch: React.FC<ModernHeroSearchProps> = ({ onSearch, onAreaSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);

  const popularAreas = [
    { emoji: '🗼', name: '東京', desc: '1,234軒' },
    { emoji: '🏯', name: '京都', desc: '897軒' },
    { emoji: '🌺', name: '沖縄', desc: '654軒' },
    { emoji: '🦌', name: '大阪', desc: '789軒' },
    { emoji: '🗻', name: '箱根', desc: '432軒' },
    { emoji: '⛷️', name: '北海道', desc: '567軒' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      if (e.target.value.length > 2) {
        setShowAISuggestion(true);
      }
    }, 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景のAIパーティクル効果 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.3
      }}>
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
              filter: 'blur(40px)'
            }}
            animate={{
              x: [0, 100, -100, 0],
              y: [0, -100, 100, 0],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            initial={{
              left: `${i * 25}%`,
              top: `${i * 20}%`
            }}
          />
        ))}
      </div>

      {/* メインコンテンツ */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '60px 20px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <h1 style={{
            fontSize: '32px',
            fontWeight: '200',
            color: '#FFFFFF',
            letterSpacing: '2px',
            marginBottom: '12px'
          }}>
            AIが見つける、あなただけの特別価格
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: '300'
          }}>
            ✨ Gemini AIが最適なタイミングをお知らせ
          </p>
        </motion.div>

        {/* 検索ボックス */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '30px',
            padding: '8px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            marginBottom: '40px',
            backdropFilter: 'blur(20px)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="ホテル名を入力（例：リッツカールトン）"
              style={{
                flex: 1,
                padding: '20px 24px',
                fontSize: '16px',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: '#4A4A4A',
                fontWeight: '300'
              }}
            />
            
            {/* AI タイピングインジケーター */}
            {isTyping && (
              <div style={{
                position: 'absolute',
                right: '80px',
                display: 'flex',
                gap: '4px'
              }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#92A8D1'
                    }}
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => onSearch({ query: searchQuery })}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
                border: 'none',
                borderRadius: '24px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '400',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 20px rgba(232,180,184,0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              検索
            </button>
          </div>

          {/* AI サジェスション */}
          <AnimatePresence>
            {showAISuggestion && searchQuery && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  marginTop: '8px',
                  paddingTop: '16px',
                  paddingBottom: '8px',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#666',
                  fontSize: '14px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
                    animation: 'pulse 2s infinite'
                  }}/>
                  AI分析中：「{searchQuery}」の最安値は12月中旬の可能性が高いです
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* または */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            justifyContent: 'center'
          }}>
            <div style={{
              height: '1px',
              width: '80px',
              background: 'rgba(255,255,255,0.3)'
            }}/>
            <span style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
              fontWeight: '300'
            }}>
              または
            </span>
            <div style={{
              height: '1px',
              width: '80px',
              background: 'rgba(255,255,255,0.3)'
            }}/>
          </div>
        </motion.div>

        {/* アクションボタン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '40px'
          }}
        >
          <button
            onClick={() => onAreaSelect('area')}
            style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗾</div>
            <div style={{ fontSize: '16px', color: '#4A4A4A', fontWeight: '400' }}>
              エリアから探す
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              お得なホテルを発見
            </div>
          </button>

          <button
            onClick={() => onAreaSelect('weekend')}
            style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
            <div style={{ fontSize: '16px', color: '#4A4A4A', fontWeight: '400' }}>
              今週末の特価
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              直前予約でお得に
            </div>
          </button>
        </motion.div>

        {/* 人気エリア */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
          }}
        >
          <h3 style={{
            fontSize: '18px',
            color: '#4A4A4A',
            fontWeight: '400',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            人気エリア
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            {popularAreas.map((area) => (
              <button
                key={area.name}
                onClick={() => onAreaSelect(area.name)}
                style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(247,202,201,0.1) 0%, rgba(146,168,209,0.1) 100%)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = '#E8B4B8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)';
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{area.emoji}</div>
                <div style={{ fontSize: '14px', color: '#4A4A4A', fontWeight: '500' }}>
                  {area.name}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  {area.desc}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};