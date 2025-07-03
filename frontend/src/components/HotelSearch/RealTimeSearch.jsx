// Real-Time Hotel Search Component
// Complete integration with Rakuten VacantHotelSearch API

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './RealTimeSearch.css';

const RealTimeSearch = () => {
  const [searchParams, setSearchParams] = useState({
    checkinDate: '',
    checkoutDate: '',
    latitude: '',
    longitude: '',
    prefecture: 'tokyo',
    adultNum: 2,
    roomNum: 1,
    maxCharge: '',
    minCharge: '',
    sortType: 'standard',
    onsenFlag: false
  });

  const [searchResults, setSearchResults] = useState({
    hotels: [],
    pagination: {},
    loading: false,
    error: null,
    searchTime: 0
  });

  const [popularDestinations, setPopularDestinations] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  // Load popular destinations on mount
  useEffect(() => {
    fetchPopularDestinations();
  }, []);

  // Set default dates (today + 1 day for checkin, +2 days for checkout)
  useEffect(() => {
    const today = new Date();
    const checkin = new Date(today);
    checkin.setDate(today.getDate() + 1);
    const checkout = new Date(today);
    checkout.setDate(today.getDate() + 2);

    setSearchParams(prev => ({
      ...prev,
      checkinDate: checkin.toISOString().split('T')[0],
      checkoutDate: checkout.toISOString().split('T')[0]
    }));
  }, []);

  const fetchPopularDestinations = async () => {
    try {
      const response = await axios.get('/api/realtime-hotels/popular-destinations');
      if (response.data.success) {
        setPopularDestinations(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
    }
  };

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    setSearchResults(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add all search parameters
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });

      console.log('🔍 Searching with params:', searchParams);
      
      const endpoint = searchParams.prefecture ? 
        '/api/realtime-hotels/search-by-location' :
        '/api/realtime-hotels/vacant-search';

      const response = await axios.get(`${endpoint}?${queryParams.toString()}`);
      
      if (response.data.success) {
        setSearchResults({
          hotels: response.data.data.hotels,
          pagination: response.data.data.pagination,
          loading: false,
          error: null,
          searchTime: response.data.data.searchTime,
          isFallback: response.data.data.isFallback
        });
      } else {
        throw new Error(response.data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.error || error.message || 'Search failed'
      }));
    }
  }, [searchParams]);

  const handleInputChange = (name, value) => {
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectDestination = (destination) => {
    setSearchParams(prev => ({
      ...prev,
      prefecture: destination.code,
      latitude: destination.latitude,
      longitude: destination.longitude
    }));
  };

  const addToWatchlist = async (hotel) => {
    try {
      const response = await axios.post('/api/realtime-hotels/watchlist', {
        hotelNo: hotel.hotelNo,
        targetPrice: hotel.lowestPrice,
        checkinDate: searchParams.checkinDate,
        checkoutDate: searchParams.checkoutDate,
        adultNum: searchParams.adultNum,
        alertConditions: {
          priceDropAlert: true,
          availabilityAlert: true
        }
      });

      if (response.data.success) {
        alert('ホテルをウォッチリストに追加しました！');
        setWatchlist(prev => [...prev, hotel.hotelNo]);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        alert('ウォッチリストに追加するにはログインが必要です');
      } else {
        alert('ウォッチリストへの追加に失敗しました');
      }
    }
  };

  const formatPrice = (price) => {
    return price ? `¥${price.toLocaleString()}` : '料金未定';
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <div className="realtime-search">
      <div className="search-header">
        <h1>🏨 リアルタイムホテル検索</h1>
        <p>楽天トラベルAPIによる最新の空室・料金情報</p>
      </div>

      {/* Search Form */}
      <form className="search-form" onSubmit={handleSearch}>
        <div className="form-row">
          <div className="form-group">
            <label>チェックイン</label>
            <input
              type="date"
              value={searchParams.checkinDate}
              onChange={(e) => handleInputChange('checkinDate', e.target.value)}
              required
            />
            <span className="date-display">
              {searchParams.checkinDate && formatDateTime(searchParams.checkinDate)}
            </span>
          </div>
          <div className="form-group">
            <label>チェックアウト</label>
            <input
              type="date"
              value={searchParams.checkoutDate}
              onChange={(e) => handleInputChange('checkoutDate', e.target.value)}
              required
            />
            <span className="date-display">
              {searchParams.checkoutDate && formatDateTime(searchParams.checkoutDate)}
            </span>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>大人</label>
            <select
              value={searchParams.adultNum}
              onChange={(e) => handleInputChange('adultNum', parseInt(e.target.value))}
            >
              {[1,2,3,4,5,6].map(num => (
                <option key={num} value={num}>{num}名</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>部屋数</label>
            <select
              value={searchParams.roomNum}
              onChange={(e) => handleInputChange('roomNum', parseInt(e.target.value))}
            >
              {[1,2,3,4].map(num => (
                <option key={num} value={num}>{num}部屋</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>最低料金</label>
            <input
              type="number"
              placeholder="円"
              value={searchParams.minCharge}
              onChange={(e) => handleInputChange('minCharge', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>最高料金</label>
            <input
              type="number"
              placeholder="円"
              value={searchParams.maxCharge}
              onChange={(e) => handleInputChange('maxCharge', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>並び順</label>
            <select
              value={searchParams.sortType}
              onChange={(e) => handleInputChange('sortType', e.target.value)}
            >
              <option value="standard">標準</option>
              <option value="price">料金安い順</option>
              <option value="price_desc">料金高い順</option>
              <option value="rating">評価順</option>
            </select>
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={searchParams.onsenFlag}
                onChange={(e) => handleInputChange('onsenFlag', e.target.checked)}
              />
              温泉あり
            </label>
          </div>
        </div>

        <button type="submit" className="search-button" disabled={searchResults.loading}>
          {searchResults.loading ? '検索中...' : '🔍 ホテルを検索'}
        </button>
      </form>

      {/* Popular Destinations */}
      <div className="popular-destinations">
        <h3>人気の目的地</h3>
        <div className="destination-chips">
          {popularDestinations.map(dest => (
            <button
              key={dest.code}
              className={`destination-chip ${searchParams.prefecture === dest.code ? 'active' : ''}`}
              onClick={() => selectDestination(dest)}
            >
              {dest.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      <div className="search-results">
        {searchResults.error && (
          <div className="error-message">
            ❌ {searchResults.error}
            <button onClick={handleSearch} className="retry-button">再試行</button>
          </div>
        )}

        {searchResults.isFallback && (
          <div className="fallback-notice">
            📋 APIエラーのためキャッシュデータを表示しています
          </div>
        )}

        {searchResults.hotels.length > 0 && (
          <>
            <div className="results-header">
              <h3>
                検索結果 ({searchResults.pagination.total}件)
                {searchResults.searchTime && (
                  <span className="search-time">
                    - {searchResults.searchTime}ms
                  </span>
                )}
              </h3>
            </div>

            <div className="hotel-list">
              {searchResults.hotels.map(hotel => (
                <div key={hotel.hotelNo} className="hotel-card">
                  <div className="hotel-image">
                    <img
                      src={hotel.hotelThumbnailUrl || hotel.hotelImageUrl || '/placeholder-hotel.jpg'}
                      alt={hotel.hotelName}
                      onError={(e) => {
                        e.target.src = '/placeholder-hotel.jpg';
                      }}
                    />
                    {hotel.hasAvailability && (
                      <div className="availability-badge">空室あり</div>
                    )}
                  </div>

                  <div className="hotel-info">
                    <h4 className="hotel-name">{hotel.hotelName}</h4>
                    <p className="hotel-address">{hotel.address1} {hotel.address2}</p>
                    
                    {hotel.reviewAverage && (
                      <div className="hotel-rating">
                        ⭐ {hotel.reviewAverage} ({hotel.reviewCount}件)
                      </div>
                    )}

                    <div className="hotel-access">
                      {hotel.access && <span>🚃 {hotel.access}</span>}
                      {hotel.nearestStation && <span>駅: {hotel.nearestStation}</span>}
                    </div>

                    {hotel.availableRooms && hotel.availableRooms.length > 0 && (
                      <div className="room-plans">
                        <h5>利用可能プラン ({hotel.availableRooms.length}件)</h5>
                        {hotel.availableRooms.slice(0, 3).map((room, idx) => (
                          <div key={idx} className="room-plan">
                            <span className="plan-name">{room.planName}</span>
                            <span className="plan-price">{formatPrice(room.total)}</span>
                            {room.availableRoomNum && (
                              <span className="available-rooms">
                                残り{room.availableRoomNum}室
                              </span>
                            )}
                          </div>
                        ))}
                        {hotel.availableRooms.length > 3 && (
                          <p className="more-plans">
                            他 {hotel.availableRooms.length - 3} プラン
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="hotel-pricing">
                    {hotel.lowestPrice && (
                      <div className="lowest-price">
                        最安料金<br />
                        <strong>{formatPrice(hotel.lowestPrice)}</strong>
                      </div>
                    )}

                    <div className="hotel-actions">
                      <button
                        className="detail-button"
                        onClick={() => window.open(`/hotel/${hotel.hotelNo}`, '_blank')}
                      >
                        詳細を見る
                      </button>
                      <button
                        className="watchlist-button"
                        onClick={() => addToWatchlist(hotel)}
                        disabled={watchlist.includes(hotel.hotelNo)}
                      >
                        {watchlist.includes(hotel.hotelNo) ? '追加済み' : 'ウォッチ'}
                      </button>
                      {hotel.planListUrl && (
                        <button
                          className="reserve-button"
                          onClick={() => window.open(hotel.planListUrl, '_blank')}
                        >
                          予約する
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="last-updated">
                    最終更新: {new Date(hotel.lastUpdated).toLocaleTimeString('ja-JP')}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {searchResults.pagination.hasMore && (
              <div className="pagination">
                <button
                  onClick={() => {
                    setSearchParams(prev => ({ ...prev, page: searchResults.pagination.page + 1 }));
                    handleSearch();
                  }}
                  className="load-more-button"
                  disabled={searchResults.loading}
                >
                  さらに読み込む
                </button>
              </div>
            )}
          </>
        )}

        {!searchResults.loading && searchResults.hotels.length === 0 && !searchResults.error && (
          <div className="no-results">
            <h3>検索結果がありません</h3>
            <p>検索条件を変更してお試しください</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeSearch;