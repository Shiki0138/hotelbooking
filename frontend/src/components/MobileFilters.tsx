import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterOption {
  id: string;
  label: string;
  icon: string;
}

interface MobileFiltersProps {
  onFilterChange: (filters: any) => void;
  selectedDates: { checkin: string; checkout: string };
}

export const MobileFilters: React.FC<MobileFiltersProps> = ({ onFilterChange, selectedDates }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    priceRange: 'all',
    hotelType: 'all',
    sortBy: 'recommended',
    rating: 'all'
  });

  const priceRanges: FilterOption[] = [
    { id: 'all', label: 'すべて', icon: '💰' },
    { id: 'budget', label: '〜¥10,000', icon: '💵' },
    { id: 'mid', label: '¥10,000〜¥30,000', icon: '💴' },
    { id: 'luxury', label: '¥30,000〜', icon: '💎' }
  ];

  const hotelTypes: FilterOption[] = [
    { id: 'all', label: 'すべて', icon: '🏨' },
    { id: 'resort', label: 'リゾート', icon: '🏖️' },
    { id: 'ryokan', label: '旅館', icon: '🏯' },
    { id: 'business', label: 'ビジネス', icon: '🏢' }
  ];

  const sortOptions: FilterOption[] = [
    { id: 'recommended', label: 'おすすめ順', icon: '⭐' },
    { id: 'price_low', label: '価格が安い順', icon: '📉' },
    { id: 'price_high', label: '価格が高い順', icon: '📈' },
    { id: 'rating', label: '評価が高い順', icon: '🌟' }
  ];

  const handleFilterChange = (category: string, value: string) => {
    const newFilters = { ...activeFilters, [category]: value };
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const activeFilterCount = Object.values(activeFilters).filter(v => v !== 'all' && v !== 'recommended').length;

  return (
    <>
      {/* フィルターボタン */}
      <div style={{
        position: 'sticky',
        top: '64px',
        zIndex: 40,
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 16px'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {/* メインフィルターボタン */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: activeFilterCount > 0 ? '#1f2937' : '#f3f4f6',
              color: activeFilterCount > 0 ? 'white' : '#1f2937',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            <span>絞り込み</span>
            {activeFilterCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '12px'
              }}>
                {activeFilterCount}
              </span>
            )}
          </motion.button>

          {/* クイックフィルター */}
          {priceRanges.slice(1).map((range) => (
            <motion.button
              key={range.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFilterChange('priceRange', range.id)}
              style={{
                padding: '8px 16px',
                background: activeFilters.priceRange === range.id ? '#fee2e2' : '#f3f4f6',
                color: activeFilters.priceRange === range.id ? '#dc2626' : '#6b7280',
                border: activeFilters.priceRange === range.id ? '1px solid #dc2626' : '1px solid transparent',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {range.icon} {range.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* フィルターモーダル */}
      <AnimatePresence>
        {showFilters && (
          <>
            {/* オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 50
              }}
            />

            {/* フィルターパネル */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'white',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                zIndex: 51,
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              {/* ヘッダー */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>絞り込み</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>

              {/* フィルターコンテンツ */}
              <div style={{ padding: '20px' }}>
                {/* 価格帯 */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>価格帯</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {priceRanges.map((range) => (
                      <motion.button
                        key={range.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleFilterChange('priceRange', range.id)}
                        style={{
                          padding: '12px',
                          background: activeFilters.priceRange === range.id ? '#fee2e2' : '#f9fafb',
                          border: activeFilters.priceRange === range.id ? '2px solid #dc2626' : '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {range.icon} {range.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* ホテルタイプ */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>ホテルタイプ</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {hotelTypes.map((type) => (
                      <motion.button
                        key={type.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleFilterChange('hotelType', type.id)}
                        style={{
                          padding: '12px',
                          background: activeFilters.hotelType === type.id ? '#fee2e2' : '#f9fafb',
                          border: activeFilters.hotelType === type.id ? '2px solid #dc2626' : '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {type.icon} {type.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* 並び順 */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>並び順</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sortOptions.map((option) => (
                      <motion.button
                        key={option.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleFilterChange('sortBy', option.id)}
                        style={{
                          padding: '12px',
                          background: activeFilters.sortBy === option.id ? '#fee2e2' : '#f9fafb',
                          border: activeFilters.sortBy === option.id ? '2px solid #dc2626' : '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textAlign: 'left'
                        }}
                      >
                        {option.icon} {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* 適用ボタン */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(false)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  結果を見る
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};