/**
 * LastMinute Filter Component
 * 直前予約専用フィルターコンポーネント
 */

import React, { useState, useEffect, useCallback } from 'react';
import './LastMinuteFilterComponent.css';

const LastMinuteFilterComponent = ({ 
  hotels, 
  onFilterChange, 
  onSortChange,
  currentTime = new Date(),
  isLoading = false 
}) => {
  const [filters, setFilters] = useState({
    urgencyLevel: 'all', // all, critical, high, medium, low
    discountRange: 'all', // all, 10-15, 15-20, 20+
    checkInTime: 'all', // all, today, tomorrow
    priceRange: 'all', // all, budget, mid, luxury
    availableOnly: true,
    minDiscount: 0
  });

  const [sortOption, setSortOption] = useState('urgency'); // urgency, discount, price, rating
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    averageDiscount: 0,
    maxDiscount: 0
  });

  // ホテル統計を計算
  const calculateStats = useCallback((hotelList) => {
    if (!Array.isArray(hotelList) || hotelList.length === 0) {
      return {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        averageDiscount: 0,
        maxDiscount: 0
      };
    }

    const urgencyCount = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    let totalDiscount = 0;
    let maxDiscount = 0;
    let discountCount = 0;

    hotelList.forEach(hotel => {
      if (hotel.lastMinute?.urgencyLevel) {
        urgencyCount[hotel.lastMinute.urgencyLevel]++;
      }
      
      if (hotel.discount?.hasDiscount) {
        totalDiscount += hotel.discount.discountRate;
        maxDiscount = Math.max(maxDiscount, hotel.discount.discountRate);
        discountCount++;
      }
    });

    return {
      total: hotelList.length,
      ...urgencyCount,
      averageDiscount: discountCount > 0 ? Math.round(totalDiscount / discountCount) : 0,
      maxDiscount
    };
  }, []);

  // 統計情報の更新
  useEffect(() => {
    setStats(calculateStats(hotels));
  }, [hotels, calculateStats]);

  // フィルター変更ハンドラー
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  // ソート変更ハンドラー
  const handleSortChange = (value) => {
    setSortOption(value);
    if (onSortChange) {
      onSortChange(value);
    }
  };

  // 時間表示フォーマット
  const formatTimeRemaining = (hours, minutes) => {
    if (hours <= 0 && minutes <= 0) return '締切間近';
    if (hours <= 0) return `${minutes}分後`;
    if (minutes <= 0) return `${hours}時間後`;
    return `${hours}時間${minutes}分後`;
  };

  // 緊急度カラー取得
  const getUrgencyColor = (level) => {
    switch (level) {
      case 'critical': return '#dc2626'; // 赤
      case 'high': return '#ea580c'; // オレンジ
      case 'medium': return '#ca8a04'; // 黄
      case 'low': return '#16a34a'; // 緑
      default: return '#6b7280'; // グレー
    }
  };

  // 緊急度ラベル取得
  const getUrgencyLabel = (level) => {
    switch (level) {
      case 'critical': return '緊急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '不明';
    }
  };

  return (
    <div className="lastminute-filter-component">
      {/* ヘッダー統計 */}
      <div className="filter-header">
        <div className="stats-overview">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">直前予約可能</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.maxDiscount}%</span>
            <span className="stat-label">最大割引</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.averageDiscount}%</span>
            <span className="stat-label">平均割引</span>
          </div>
        </div>
        
        {/* リアルタイム時刻表示 */}
        <div className="current-time">
          <div className="time-display">
            <span className="current-time-label">現在時刻</span>
            <span className="current-time-value">
              {currentTime.toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* フィルターセクション */}
      <div className="filter-sections">
        {/* 緊急度フィルター */}
        <div className="filter-section">
          <h3 className="filter-title">
            <span className="filter-icon">⏰</span>
            緊急度
          </h3>
          <div className="urgency-stats">
            {Object.entries(stats).filter(([key]) => 
              ['critical', 'high', 'medium', 'low'].includes(key)
            ).map(([level, count]) => (
              <div 
                key={level}
                className={`urgency-item ${filters.urgencyLevel === level ? 'active' : ''}`}
                style={{ borderLeftColor: getUrgencyColor(level) }}
                onClick={() => handleFilterChange('urgencyLevel', 
                  filters.urgencyLevel === level ? 'all' : level
                )}
              >
                <span className="urgency-label">{getUrgencyLabel(level)}</span>
                <span className="urgency-count">{count}</span>
              </div>
            ))}
          </div>
          <div className="filter-options">
            <label className="filter-option">
              <input
                type="radio"
                name="urgencyLevel"
                value="all"
                checked={filters.urgencyLevel === 'all'}
                onChange={(e) => handleFilterChange('urgencyLevel', e.target.value)}
              />
              すべて
            </label>
          </div>
        </div>

        {/* 割引率フィルター */}
        <div className="filter-section">
          <h3 className="filter-title">
            <span className="filter-icon">🏷️</span>
            直前割引
          </h3>
          <div className="filter-options">
            <label className="filter-option">
              <input
                type="radio"
                name="discountRange"
                value="all"
                checked={filters.discountRange === 'all'}
                onChange={(e) => handleFilterChange('discountRange', e.target.value)}
              />
              すべて
            </label>
            <label className="filter-option">
              <input
                type="radio"
                name="discountRange"
                value="10-15"
                checked={filters.discountRange === '10-15'}
                onChange={(e) => handleFilterChange('discountRange', e.target.value)}
              />
              10-15% OFF
            </label>
            <label className="filter-option">
              <input
                type="radio"
                name="discountRange"
                value="15-20"
                checked={filters.discountRange === '15-20'}
                onChange={(e) => handleFilterChange('discountRange', e.target.value)}
              />
              15-20% OFF
            </label>
            <label className="filter-option">
              <input
                type="radio"
                name="discountRange"
                value="20+"
                checked={filters.discountRange === '20+'}
                onChange={(e) => handleFilterChange('discountRange', e.target.value)}
              />
              20% OFF以上
            </label>
          </div>
        </div>

        {/* チェックイン時期フィルター */}
        <div className="filter-section">
          <h3 className="filter-title">
            <span className="filter-icon">📅</span>
            チェックイン
          </h3>
          <div className="filter-options">
            <label className="filter-option">
              <input
                type="radio"
                name="checkInTime"
                value="all"
                checked={filters.checkInTime === 'all'}
                onChange={(e) => handleFilterChange('checkInTime', e.target.value)}
              />
              24時間以内
            </label>
            <label className="filter-option">
              <input
                type="radio"
                name="checkInTime"
                value="today"
                checked={filters.checkInTime === 'today'}
                onChange={(e) => handleFilterChange('checkInTime', e.target.value)}
              />
              今日中
            </label>
            <label className="filter-option">
              <input
                type="radio"
                name="checkInTime"
                value="tomorrow"
                checked={filters.checkInTime === 'tomorrow'}
                onChange={(e) => handleFilterChange('checkInTime', e.target.value)}
              />
              明日
            </label>
          </div>
        </div>

        {/* 価格帯フィルター */}
        <div className="filter-section">
          <h3 className="filter-title">
            <span className="filter-icon">💰</span>
            価格帯
          </h3>
          <div className="filter-options">
            <label className="filter-option">
              <input
                type="radio"
                name="priceRange"
                value="all"
                checked={filters.priceRange === 'all'}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
              />
              すべて
            </label>
            <label className="filter-option">
              <input
                type="radio"
                name="priceRange"
                value="budget"
                checked={filters.priceRange === 'budget'}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
              />
              エコノミー (～¥10,000)
            </label>
            <label className="filter-option">
              <input
                type="radio"
                name="priceRange"
                value="mid"
                checked={filters.priceRange === 'mid'}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
              />
              スタンダード (¥10,000-30,000)
            </label>
            <label className="filter-option">
              <input
                type="radio"
                name="priceRange"
                value="luxury"
                checked={filters.priceRange === 'luxury'}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
              />
              ラグジュアリー (¥30,000～)
            </label>
          </div>
        </div>
      </div>

      {/* ソートセクション */}
      <div className="sort-section">
        <h3 className="filter-title">
          <span className="filter-icon">📊</span>
          並び順
        </h3>
        <div className="sort-options">
          <label className="sort-option">
            <input
              type="radio"
              name="sortOption"
              value="urgency"
              checked={sortOption === 'urgency'}
              onChange={(e) => handleSortChange(e.target.value)}
            />
            緊急度順
          </label>
          <label className="sort-option">
            <input
              type="radio"
              name="sortOption"
              value="discount"
              checked={sortOption === 'discount'}
              onChange={(e) => handleSortChange(e.target.value)}
            />
            割引率順
          </label>
          <label className="sort-option">
            <input
              type="radio"
              name="sortOption"
              value="price"
              checked={sortOption === 'price'}
              onChange={(e) => handleSortChange(e.target.value)}
            />
            価格順
          </label>
          <label className="sort-option">
            <input
              type="radio"
              name="sortOption"
              value="rating"
              checked={sortOption === 'rating'}
              onChange={(e) => handleSortChange(e.target.value)}
            />
            評価順
          </label>
        </div>
      </div>

      {/* 追加オプション */}
      <div className="additional-options">
        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={filters.availableOnly}
            onChange={(e) => handleFilterChange('availableOnly', e.target.checked)}
          />
          <span className="checkbox-label">予約可能のみ表示</span>
        </label>
      </div>

      {/* フィルター適用結果 */}
      {!isLoading && (
        <div className="filter-results">
          <div className="results-summary">
            <span className="results-count">{stats.total}件</span>
            <span className="results-label">の直前予約可能ホテル</span>
          </div>
          
          {stats.critical > 0 && (
            <div className="urgent-alert">
              <span className="alert-icon">🚨</span>
              <span className="alert-text">
                {stats.critical}件のホテルが緊急予約締切間近です
              </span>
            </div>
          )}
        </div>
      )}

      {/* ローディング状態 */}
      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span className="loading-text">直前予約可能ホテルを検索中...</span>
        </div>
      )}
    </div>
  );
};

export default LastMinuteFilterComponent;