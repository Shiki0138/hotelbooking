// Hotel Detail View Component
// Displays detailed hotel information with real-time pricing

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HotelDetailView.css';

const HotelDetailView = () => {
  const { hotelNo } = useParams();
  const navigate = useNavigate();
  
  const [hotelData, setHotelData] = useState({
    hotel: null,
    priceHistory: null,
    isWatching: false,
    loading: true,
    error: null
  });

  const [availabilityParams, setAvailabilityParams] = useState({
    checkinDate: '',
    checkoutDate: '',
    adultNum: 2,
    roomNum: 1
  });

  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    // Set default dates
    const today = new Date();
    const checkin = new Date(today);
    checkin.setDate(today.getDate() + 1);
    const checkout = new Date(today);
    checkout.setDate(today.getDate() + 2);

    setAvailabilityParams({
      checkinDate: checkin.toISOString().split('T')[0],
      checkoutDate: checkout.toISOString().split('T')[0],
      adultNum: 2,
      roomNum: 1
    });
  }, []);

  useEffect(() => {
    if (hotelNo && availabilityParams.checkinDate && availabilityParams.checkoutDate) {
      fetchHotelDetail();
    }
  }, [hotelNo, availabilityParams]);

  const fetchHotelDetail = async () => {
    setHotelData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryParams = new URLSearchParams(availabilityParams);
      const response = await axios.get(`/api/realtime-hotels/detail/${hotelNo}?${queryParams.toString()}`);

      if (response.data.success) {
        setHotelData({
          hotel: response.data.data.hotel,
          priceHistory: response.data.data.priceHistory,
          isWatching: response.data.data.isWatching,
          loading: false,
          error: null
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch hotel details');
      }
    } catch (error) {
      console.error('Hotel detail error:', error);
      setHotelData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.error || error.message || 'Failed to load hotel details'
      }));
    }
  };

  const addToWatchlist = async () => {
    try {
      const response = await axios.post('/api/realtime-hotels/watchlist', {
        hotelNo: hotelData.hotel.hotelNo,
        targetPrice: getLowestPrice(),
        checkinDate: availabilityParams.checkinDate,
        checkoutDate: availabilityParams.checkoutDate,
        adultNum: availabilityParams.adultNum,
        alertConditions: {
          priceDropAlert: true,
          availabilityAlert: true,
          lastRoomAlert: true
        }
      });

      if (response.data.success) {
        setHotelData(prev => ({ ...prev, isWatching: true }));
        alert('ウォッチリストに追加しました！価格変動をお知らせします。');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        alert('ウォッチリストに追加するにはログインが必要です');
      } else {
        alert('ウォッチリストへの追加に失敗しました');
      }
    }
  };

  const getLowestPrice = () => {
    if (!hotelData.hotel?.roomPlans?.length) return null;
    return Math.min(...hotelData.hotel.roomPlans
      .filter(plan => plan.total)
      .map(plan => plan.total)
    );
  };

  const formatPrice = (price) => {
    return price ? `¥${price.toLocaleString()}` : '料金未定';
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#48bb78';
    if (rating >= 4.0) return '#38a169';
    if (rating >= 3.5) return '#f6ad55';
    if (rating >= 3.0) return '#ed8936';
    return '#e53e3e';
  };

  if (hotelData.loading) {
    return (
      <div className="hotel-detail-loading">
        <div className="loading-spinner"></div>
        <p>ホテル詳細を読み込み中...</p>
      </div>
    );
  }

  if (hotelData.error) {
    return (
      <div className="hotel-detail-error">
        <h2>エラーが発生しました</h2>
        <p>{hotelData.error}</p>
        <button onClick={() => navigate(-1)} className="back-button">
          戻る
        </button>
      </div>
    );
  }

  const hotel = hotelData.hotel;
  
  return (
    <div className="hotel-detail-view">
      {/* Header */}
      <div className="hotel-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← 検索結果に戻る
        </button>
        
        <div className="hotel-title-section">
          <h1 className="hotel-name">{hotel.hotelName}</h1>
          {hotel.hotelKanaName && (
            <p className="hotel-kana">{hotel.hotelKanaName}</p>
          )}
          
          <div className="hotel-rating-section">
            {hotel.reviewAverage && (
              <div className="hotel-rating">
                <span 
                  className="rating-score"
                  style={{ color: getRatingColor(hotel.reviewAverage) }}
                >
                  ⭐ {hotel.reviewAverage}
                </span>
                <span className="rating-count">({hotel.reviewCount}件のレビュー)</span>
              </div>
            )}
          </div>
        </div>

        <div className="hotel-actions-header">
          <button
            onClick={addToWatchlist}
            className={`watchlist-btn ${hotelData.isWatching ? 'watching' : ''}`}
            disabled={hotelData.isWatching}
          >
            {hotelData.isWatching ? '📍 ウォッチ中' : '🔔 ウォッチリストに追加'}
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="hotel-hero">
        <img
          src={hotel.hotelImageUrl || hotel.hotelThumbnailUrl || '/placeholder-hotel.jpg'}
          alt={hotel.hotelName}
          className="hero-image"
          onError={(e) => {
            e.target.src = '/placeholder-hotel.jpg';
          }}
        />
      </div>

      {/* Availability Search */}
      <div className="availability-search">
        <h3>空室・料金検索</h3>
        <div className="search-params">
          <div className="param-group">
            <label>チェックイン</label>
            <input
              type="date"
              value={availabilityParams.checkinDate}
              onChange={(e) => setAvailabilityParams(prev => ({ ...prev, checkinDate: e.target.value }))}
            />
            <span className="date-display">
              {formatDateTime(availabilityParams.checkinDate)}
            </span>
          </div>
          <div className="param-group">
            <label>チェックアウト</label>
            <input
              type="date"
              value={availabilityParams.checkoutDate}
              onChange={(e) => setAvailabilityParams(prev => ({ ...prev, checkoutDate: e.target.value }))}
            />
            <span className="date-display">
              {formatDateTime(availabilityParams.checkoutDate)}
            </span>
          </div>
          <div className="param-group">
            <label>大人</label>
            <select
              value={availabilityParams.adultNum}
              onChange={(e) => setAvailabilityParams(prev => ({ ...prev, adultNum: parseInt(e.target.value) }))}
            >
              {[1,2,3,4,5,6].map(num => (
                <option key={num} value={num}>{num}名</option>
              ))}
            </select>
          </div>
          <div className="param-group">
            <label>部屋数</label>
            <select
              value={availabilityParams.roomNum}
              onChange={(e) => setAvailabilityParams(prev => ({ ...prev, roomNum: parseInt(e.target.value) }))}
            >
              {[1,2,3,4].map(num => (
                <option key={num} value={num}>{num}部屋</option>
              ))}
            </select>
          </div>
          <button onClick={fetchHotelDetail} className="search-btn">
            🔍 検索
          </button>
        </div>
      </div>

      {/* Room Plans */}
      {hotel.roomPlans && hotel.roomPlans.length > 0 && (
        <div className="room-plans-section">
          <h3>宿泊プラン ({hotel.roomPlans.length}件)</h3>
          <div className="room-plans-list">
            {hotel.roomPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`room-plan-card ${selectedRoom === index ? 'selected' : ''}`}
                onClick={() => setSelectedRoom(selectedRoom === index ? null : index)}
              >
                <div className="plan-header">
                  <h4 className="plan-name">{plan.planName}</h4>
                  <div className="plan-price">
                    {formatPrice(plan.total)}
                  </div>
                </div>

                <div className="plan-details">
                  <div className="room-info">
                    <span className="room-class">{plan.roomClass}</span>
                    {plan.roomName && <span className="room-name">{plan.roomName}</span>}
                  </div>

                  <div className="availability-info">
                    {plan.availableRoomNum > 0 ? (
                      <span className="available">
                        ✅ 空室あり (残り{plan.availableRoomNum}室)
                      </span>
                    ) : (
                      <span className="unavailable">❌ 満室</span>
                    )}
                  </div>

                  <div className="meal-info">
                    {plan.withBreakfastFlag && <span className="meal-tag">🍳 朝食付き</span>}
                    {plan.withDinnerFlag && <span className="meal-tag">🍽️ 夕食付き</span>}
                    {!plan.withBreakfastFlag && !plan.withDinnerFlag && (
                      <span className="meal-tag">素泊まり</span>
                    )}
                  </div>

                  {plan.planContents && (
                    <div className="plan-contents">
                      <p>{plan.planContents}</p>
                    </div>
                  )}

                  {selectedRoom === index && (
                    <div className="expanded-details">
                      {plan.roomSize && <p>部屋の広さ: {plan.roomSize}</p>}
                      {plan.bedType && <p>ベッドタイプ: {plan.bedType}</p>}
                      {plan.smokingFlag !== undefined && (
                        <p>{plan.smokingFlag ? '喫煙可' : '禁煙'}</p>
                      )}
                      {plan.payment && <p>支払い方法: {plan.payment}</p>}
                    </div>
                  )}
                </div>

                {plan.availableRoomNum > 0 && plan.reserveUrl && (
                  <div className="plan-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(plan.reserveUrl, '_blank');
                      }}
                      className="reserve-btn"
                    >
                      このプランで予約
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hotel Information */}
      <div className="hotel-info-section">
        <div className="info-grid">
          <div className="basic-info">
            <h3>基本情報</h3>
            <div className="info-item">
              <strong>住所:</strong> {hotel.address1} {hotel.address2}
            </div>
            {hotel.telephoneNo && (
              <div className="info-item">
                <strong>電話:</strong> {hotel.telephoneNo}
              </div>
            )}
            {hotel.access && (
              <div className="info-item">
                <strong>アクセス:</strong> {hotel.access}
              </div>
            )}
            {hotel.nearestStation && (
              <div className="info-item">
                <strong>最寄り駅:</strong> {hotel.nearestStation}
              </div>
            )}
            {hotel.checkinTime && (
              <div className="info-item">
                <strong>チェックイン:</strong> {hotel.checkinTime}
              </div>
            )}
            {hotel.checkoutTime && (
              <div className="info-item">
                <strong>チェックアウト:</strong> {hotel.checkoutTime}
              </div>
            )}
            {hotel.parkingInformation && (
              <div className="info-item">
                <strong>駐車場:</strong> {hotel.parkingInformation}
              </div>
            )}
          </div>

          {/* Detailed Ratings */}
          {(hotel.serviceAverage || hotel.locationAverage || hotel.roomAverage) && (
            <div className="detailed-ratings">
              <h3>詳細評価</h3>
              {hotel.serviceAverage && (
                <div className="rating-item">
                  <span>サービス</span>
                  <span style={{ color: getRatingColor(hotel.serviceAverage) }}>
                    {hotel.serviceAverage}
                  </span>
                </div>
              )}
              {hotel.locationAverage && (
                <div className="rating-item">
                  <span>立地</span>
                  <span style={{ color: getRatingColor(hotel.locationAverage) }}>
                    {hotel.locationAverage}
                  </span>
                </div>
              )}
              {hotel.roomAverage && (
                <div className="rating-item">
                  <span>客室</span>
                  <span style={{ color: getRatingColor(hotel.roomAverage) }}>
                    {hotel.roomAverage}
                  </span>
                </div>
              )}
              {hotel.equipmentAverage && (
                <div className="rating-item">
                  <span>設備</span>
                  <span style={{ color: getRatingColor(hotel.equipmentAverage) }}>
                    {hotel.equipmentAverage}
                  </span>
                </div>
              )}
              {hotel.bathAverage && (
                <div className="rating-item">
                  <span>お風呂</span>
                  <span style={{ color: getRatingColor(hotel.bathAverage) }}>
                    {hotel.bathAverage}
                  </span>
                </div>
              )}
              {hotel.mealAverage && (
                <div className="rating-item">
                  <span>食事</span>
                  <span style={{ color: getRatingColor(hotel.mealAverage) }}>
                    {hotel.mealAverage}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Facilities */}
        {(hotel.hotelFacilities || hotel.roomFacilities) && (
          <div className="facilities-section">
            <h3>設備・サービス</h3>
            {hotel.hotelFacilities && (
              <div className="facility-group">
                <h4>ホテル設備</h4>
                <p>{hotel.hotelFacilities}</p>
              </div>
            )}
            {hotel.roomFacilities && (
              <div className="facility-group">
                <h4>客室設備</h4>
                <p>{hotel.roomFacilities}</p>
              </div>
            )}
            {hotel.aboutBath && (
              <div className="facility-group">
                <h4>お風呂</h4>
                <p>{hotel.aboutBath}</p>
              </div>
            )}
          </div>
        )}

        {/* Policies */}
        {(hotel.cancelPolicy || hotel.note) && (
          <div className="policies-section">
            <h3>宿泊条件・注意事項</h3>
            {hotel.cancelPolicy && (
              <div className="policy-group">
                <h4>キャンセルポリシー</h4>
                <p>{hotel.cancelPolicy}</p>
              </div>
            )}
            {hotel.note && (
              <div className="policy-group">
                <h4>注意事項</h4>
                <p>{hotel.note}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Price History */}
      {hotelData.priceHistory && hotelData.priceHistory.stats.length > 0 && (
        <div className="price-history-section">
          <h3>価格推移 (過去24時間)</h3>
          <div className="price-stats">
            {hotelData.priceHistory.stats.map((stat, index) => (
              <div key={index} className="price-stat-card">
                <h4>{stat.planName}</h4>
                <div className="price-info">
                  <div className="current-price">
                    現在: {formatPrice(stat.currentPrice)}
                  </div>
                  <div className="price-range">
                    最安: {formatPrice(stat.lowestPrice)} - 
                    最高: {formatPrice(stat.highestPrice)}
                  </div>
                  <div className="average-price">
                    平均: {formatPrice(stat.averagePrice)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="last-updated">
            最終更新: {new Date(hotelData.priceHistory.lastUpdated).toLocaleString('ja-JP')}
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="hotel-footer-actions">
        {hotel.planListUrl && (
          <button
            onClick={() => window.open(hotel.planListUrl, '_blank')}
            className="view-all-plans-btn"
          >
            全プランを見る
          </button>
        )}
        {hotel.reviewUrl && (
          <button
            onClick={() => window.open(hotel.reviewUrl, '_blank')}
            className="view-reviews-btn"
          >
            レビューを見る
          </button>
        )}
      </div>
    </div>
  );
};

export default HotelDetailView;