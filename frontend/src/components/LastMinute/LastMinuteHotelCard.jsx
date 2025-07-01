/**
 * LastMinute Hotel Card Component
 * 直前予約専用ホテルカードコンポーネント
 */

import React, { useState, useEffect } from 'react';
import './LastMinuteHotelCard.css';

const LastMinuteHotelCard = ({ 
  hotel, 
  currentTime = new Date(),
  onBookingClick,
  onDetailsClick,
  showFullDetails = false 
}) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [urgencyClass, setUrgencyClass] = useState('');

  // リアルタイム時間更新
  useEffect(() => {
    const updateTimeRemaining = () => {
      if (hotel.lastMinute?.bookingDeadline) {
        const deadline = new Date(hotel.lastMinute.bookingDeadline);
        const now = new Date();
        const remaining = deadline.getTime() - now.getTime();
        
        if (remaining <= 0) {
          setTimeRemaining({ expired: true });
        } else {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining({ hours, minutes, remaining });
        }
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // 1分毎に更新

    return () => clearInterval(interval);
  }, [hotel.lastMinute?.bookingDeadline]);

  // 緊急度によるスタイルクラス設定
  useEffect(() => {
    const urgencyLevel = hotel.lastMinute?.urgencyLevel || 'low';
    setUrgencyClass(`urgency-${urgencyLevel}`);
  }, [hotel.lastMinute?.urgencyLevel]);

  // 時間表示フォーマット
  const formatTimeRemaining = (time) => {
    if (!time || time.expired) return '締切間近';
    if (time.hours <= 0 && time.minutes <= 0) return '締切間近';
    if (time.hours <= 0) return `${time.minutes}分後`;
    if (time.minutes <= 0) return `${time.hours}時間後`;
    return `${time.hours}時間${time.minutes}分後`;
  };

  // 緊急度ラベル取得
  const getUrgencyLabel = (level) => {
    switch (level) {
      case 'critical': return '緊急';
      case 'high': return '急げ';
      case 'medium': return '注意';
      case 'low': return '余裕';
      default: return '';
    }
  };

  // 割引バッジのスタイル
  const getDiscountBadgeStyle = (discountRate) => {
    if (discountRate >= 25) return 'discount-exceptional';
    if (discountRate >= 20) return 'discount-high';
    if (discountRate >= 15) return 'discount-medium';
    if (discountRate >= 10) return 'discount-low';
    return '';
  };

  // チェックイン可能時刻の表示
  const getCheckInDisplay = () => {
    if (!hotel.lastMinute?.nextAvailableCheckIn) return '';
    
    const checkInTime = new Date(hotel.lastMinute.nextAvailableCheckIn);
    const today = new Date();
    const isToday = checkInTime.toDateString() === today.toDateString();
    
    const timeStr = checkInTime.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return isToday ? `今日 ${timeStr}` : `明日 ${timeStr}`;
  };

  // 価格表示コンポーネント
  const PriceDisplay = () => (
    <div className="price-section">
      {hotel.discount?.hasDiscount && (
        <div className="original-price">
          ¥{hotel.discount.originalPrice?.toLocaleString()}
        </div>
      )}
      <div className="current-price">
        ¥{hotel.price?.total?.toLocaleString() || '0'}
        <span className="per-night">/泊</span>
      </div>
      {hotel.discount?.hasDiscount && (
        <div className="savings">
          ¥{hotel.discount.savingsAmount?.toLocaleString()}お得
        </div>
      )}
    </div>
  );

  // カウントダウンタイマーコンポーネント
  const CountdownTimer = () => (
    <div className={`countdown-timer ${urgencyClass}`}>
      <div className="timer-header">
        <span className="timer-icon">⏰</span>
        <span className="timer-label">予約締切</span>
      </div>
      <div className="timer-display">
        {timeRemaining && !timeRemaining.expired ? (
          <>
            <div className="time-unit">
              <span className="time-number">
                {String(timeRemaining.hours || 0).padStart(2, '0')}
              </span>
              <span className="time-label">時間</span>
            </div>
            <div className="time-separator">:</div>
            <div className="time-unit">
              <span className="time-number">
                {String(timeRemaining.minutes || 0).padStart(2, '0')}
              </span>
              <span className="time-label">分</span>
            </div>
          </>
        ) : (
          <div className="expired-notice">
            <span className="expired-text">締切間近</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`lastminute-hotel-card ${urgencyClass}`}>
      {/* 緊急度・割引バッジ */}
      <div className="badges-container">
        {hotel.lastMinute?.urgencyLevel && (
          <div className={`urgency-badge ${urgencyClass}`}>
            <span className="badge-icon">🚨</span>
            <span className="badge-text">
              {getUrgencyLabel(hotel.lastMinute.urgencyLevel)}
            </span>
          </div>
        )}
        
        {hotel.discount?.hasDiscount && (
          <div className={`discount-badge ${getDiscountBadgeStyle(hotel.discount.discountRate)}`}>
            <span className="discount-rate">
              {hotel.discount.discountRate}% OFF
            </span>
            <span className="discount-label">直前割引</span>
          </div>
        )}
        
        {hotel.lastMinute?.canCheckInToday && (
          <div className="checkin-today-badge">
            <span className="checkin-icon">🏨</span>
            <span className="checkin-text">今日チェックイン可</span>
          </div>
        )}
      </div>

      {/* ホテル画像 */}
      <div className="hotel-image-container">
        <img
          src={hotel.images?.[0]?.url || '/placeholder-hotel.jpg'}
          alt={hotel.name}
          className="hotel-image"
          loading="lazy"
        />
        <div className="image-overlay">
          <div className="available-rooms">
            <span className="rooms-icon">🛏️</span>
            <span className="rooms-text">空室あり</span>
          </div>
        </div>
      </div>

      {/* ホテル情報 */}
      <div className="hotel-info">
        <div className="hotel-header">
          <h3 className="hotel-name" title={hotel.name}>
            {hotel.name}
          </h3>
          <div className="hotel-rating">
            {Array.from({ length: Math.floor(hotel.rating?.stars || 0) }, (_, i) => (
              <span key={i} className="star">★</span>
            ))}
            {hotel.rating?.review?.score && (
              <span className="rating-score">
                {hotel.rating.review.score.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div className="hotel-location">
          <span className="location-icon">📍</span>
          <span className="location-text">
            {hotel.location?.address || hotel.location?.city}
          </span>
        </div>

        <div className="checkin-info">
          <span className="checkin-icon">🕐</span>
          <span className="checkin-text">
            チェックイン: {getCheckInDisplay()}
          </span>
        </div>

        {/* カウントダウンタイマー */}
        <CountdownTimer />

        {/* 価格表示 */}
        <PriceDisplay />

        {/* アクションボタン */}
        <div className="action-buttons">
          <button
            className="details-button"
            onClick={() => onDetailsClick?.(hotel)}
          >
            詳細を見る
          </button>
          <button
            className={`booking-button ${urgencyClass}`}
            onClick={() => onBookingClick?.(hotel)}
            disabled={timeRemaining?.expired}
          >
            {timeRemaining?.expired ? '締切済み' : '今すぐ予約'}
          </button>
        </div>

        {/* 追加情報 (詳細表示時) */}
        {showFullDetails && (
          <div className="additional-info">
            <div className="amenities">
              <h4>設備・サービス</h4>
              <div className="amenities-list">
                {hotel.amenities?.slice(0, 6).map((amenity, index) => (
                  <span key={index} className="amenity-tag">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
            
            {hotel.lastMinute?.urgencyLevel === 'critical' && (
              <div className="urgency-warning">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">
                  このホテルは間もなく予約締切となります。お早めにご予約ください。
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* プロモーション効果 */}
      {hotel.lastMinute?.urgencyLevel === 'critical' && (
        <div className="critical-overlay">
          <div className="critical-glow"></div>
        </div>
      )}
    </div>
  );
};

export default LastMinuteHotelCard;