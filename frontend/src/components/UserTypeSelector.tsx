import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserTypeSelectorProps {
  onUserTypeSelect: (type: 'date-fixed' | 'deal-seeker') => void;
}

export const UserTypeSelector: React.FC<UserTypeSelectorProps> = ({ onUserTypeSelect }) => {
  const [selectedType, setSelectedType] = useState<'date-fixed' | 'deal-seeker' | null>(null);

  const handleTypeSelect = (type: 'date-fixed' | 'deal-seeker') => {
    setSelectedType(type);
    setTimeout(() => {
      onUserTypeSelect(type);
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          maxWidth: '900px',
          width: '100%',
          textAlign: 'center'
        }}
      >
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            fontSize: '2.5rem',
            fontWeight: '400',
            color: '#4A4A4A',
            marginBottom: '16px',
            letterSpacing: '0.5px'
          }}
        >
          ホテル検索の目的を教えてください
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            fontSize: '1.1rem',
            color: '#666',
            marginBottom: '60px',
            lineHeight: 1.6
          }}
        >
          あなたの検索スタイルに合わせて、最適な結果をご提案します
        </motion.p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '40px',
          marginBottom: '60px'
        }}>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={() => handleTypeSelect('date-fixed')}
            style={{
              background: selectedType === 'date-fixed' 
                ? 'linear-gradient(135deg, rgba(232,180,184,0.2) 0%, rgba(146,168,209,0.2) 100%)'
                : 'white',
              borderRadius: '24px',
              padding: '40px 30px',
              cursor: 'pointer',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: selectedType === 'date-fixed' 
                ? '2px solid #E8B4B8' 
                : '2px solid transparent',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
              filter: selectedType === 'date-fixed' ? 'none' : 'grayscale(20%)'
            }}>
              🗓️
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '500',
              color: '#4A4A4A',
              marginBottom: '16px'
            }}>
              日程が決まっている
            </h3>
            <p style={{
              fontSize: '1rem',
              color: '#666',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}>
              チェックイン・チェックアウトの日程が決まっていて、その日の最安値を知りたい
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '0.9rem',
              color: '#92A8D1'
            }}>
              <span>✓ 即座に空室検索</span>
              <span>✓ 日程固定の最安値</span>
              <span>✓ 比較予約</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            onClick={() => handleTypeSelect('deal-seeker')}
            style={{
              background: selectedType === 'deal-seeker' 
                ? 'linear-gradient(135deg, rgba(232,180,184,0.2) 0%, rgba(146,168,209,0.2) 100%)'
                : 'white',
              borderRadius: '24px',
              padding: '40px 30px',
              cursor: 'pointer',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: selectedType === 'deal-seeker' 
                ? '2px solid #E8B4B8' 
                : '2px solid transparent',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
              filter: selectedType === 'deal-seeker' ? 'none' : 'grayscale(20%)'
            }}>
              💰
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '500',
              color: '#4A4A4A',
              marginBottom: '16px'
            }}>
              お得な時期を探したい
            </h3>
            <p style={{
              fontSize: '1rem',
              color: '#666',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}>
              日程は柔軟で、最も安い時期に宿泊したい
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '0.9rem',
              color: '#92A8D1'
            }}>
              <span>✓ 価格変動カレンダー</span>
              <span>✓ お得アラート</span>
              <span>✓ 柔軟な日程</span>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {selectedType && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                fontSize: '1.1rem',
                color: '#E8B4B8',
                fontWeight: '500'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⚙️
              </motion.div>
              <span>選択内容を処理中...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{
            marginTop: '40px',
            fontSize: '0.9rem',
            color: '#999'
          }}
        >
          <p>
            ✨ AI が最適な検索結果をパーソナライズします
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};