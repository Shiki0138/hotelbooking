// Watchlist Manager Component
// Manages user's hotel watchlist with price alerts

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WatchlistManager.css';

const WatchlistManager = () => {
  const [watchlistData, setWatchlistData] = useState({
    items: [],
    pagination: {},
    loading: true,
    error: null
  });

  const [filters, setFilters] = useState({
    showActive: true,
    sortBy: 'created_at',
    page: 1
  });

  useEffect(() => {
    fetchWatchlist();
  }, [filters]);

  const fetchWatchlist = async () => {
    setWatchlistData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryParams = new URLSearchParams({
        page: filters.page,
        limit: 10
      });

      const response = await axios.get(`/api/realtime-hotels/watchlist?${queryParams.toString()}`);

      if (response.data.success) {
        setWatchlistData({
          items: response.data.data.watchlist,
          pagination: response.data.data.pagination,
          loading: false,
          error: null
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch watchlist');
      }
    } catch (error) {
      console.error('Watchlist fetch error:', error);
      setWatchlistData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.error || error.message || 'Failed to load watchlist'
      }));
    }
  };

  const removeFromWatchlist = async (watchlistId) => {
    try {
      const response = await axios.delete(`/api/realtime-hotels/watchlist/${watchlistId}`);

      if (response.data.success) {
        setWatchlistData(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== watchlistId)
        }));
        alert('ウォッチリストから削除しました');
      }
    } catch (error) {
      console.error('Remove from watchlist error:', error);
      alert('削除に失敗しました');
    }
  };

  const toggleActive = async (watchlistId, currentStatus) => {
    try {
      // This would require implementing an update endpoint
      // For now, just show a message
      alert('この機能は現在開発中です');
    } catch (error) {
      console.error('Toggle active error:', error);
    }
  };

  const formatPrice = (price) => {
    return price ? `¥${price.toLocaleString()}` : '料金未定';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriceChangeColor = (change) => {
    if (change > 0) return '#e53e3e'; // Red for price increase
    if (change < 0) return '#48bb78'; // Green for price decrease
    return '#666'; // Gray for no change
  };

  const getPriceChangeIcon = (change) => {
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➖';
  };

  if (watchlistData.loading) {
    return (
      <div className="watchlist-loading">
        <div className="loading-spinner"></div>
        <p>ウォッチリストを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="watchlist-manager">
      <div className="watchlist-header">
        <h1>🔔 ウォッチリスト</h1>
        <p>お気に入りホテルの価格変動をチェック</p>
      </div>

      {watchlistData.error && (
        <div className="error-message">
          ❌ {watchlistData.error}
          <button onClick={fetchWatchlist} className="retry-button">
            再試行
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="watchlist-filters">
        <div className="filter-group">
          <label>並び順:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
          >
            <option value="created_at">追加日順</option>
            <option value="checkin_date">チェックイン日順</option>
            <option value="price_change">価格変動順</option>
          </select>
        </div>
        <div className="filter-actions">
          <button onClick={fetchWatchlist} className="refresh-button">
            🔄 更新
          </button>
        </div>
      </div>

      {/* Watchlist Items */}
      {watchlistData.items.length > 0 ? (
        <div className="watchlist-content">
          <div className="watchlist-stats">
            <div className="stat-card">
              <span className="stat-number">{watchlistData.items.length}</span>
              <span className="stat-label">ウォッチ中</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {watchlistData.items.filter(item => item.hasAvailability).length}
              </span>
              <span className="stat-label">空室あり</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {watchlistData.items.filter(item => item.priceChange < 0).length}
              </span>
              <span className="stat-label">価格下落</span>
            </div>
          </div>

          <div className="watchlist-items">
            {watchlistData.items.map(item => (
              <div key={item.id} className="watchlist-item">
                <div className="item-header">
                  <h3 className="hotel-name">{item.hotel_name}</h3>
                  <div className="item-actions">
                    <button
                      onClick={() => window.open(`/hotel/${item.hotel_no}`, '_blank')}
                      className="view-hotel-btn"
                    >
                      詳細
                    </button>
                    <button
                      onClick={() => removeFromWatchlist(item.id)}
                      className="remove-btn"
                    >
                      削除
                    </button>
                  </div>
                </div>

                <div className="item-content">
                  <div className="watch-conditions">
                    <div className="condition-row">
                      <span className="label">チェックイン:</span>
                      <span className="value">{formatDate(item.checkin_date)}</span>
                    </div>
                    <div className="condition-row">
                      <span className="label">チェックアウト:</span>
                      <span className="value">{formatDate(item.checkout_date)}</span>
                    </div>
                    <div className="condition-row">
                      <span className="label">大人:</span>
                      <span className="value">{item.adult_num}名</span>
                    </div>
                    {item.target_price && (
                      <div className="condition-row">
                        <span className="label">目標価格:</span>
                        <span className="value">{formatPrice(item.target_price)}</span>
                      </div>
                    )}
                  </div>

                  <div className="price-info">
                    <div className="current-price-section">
                      <span className="current-price-label">現在価格:</span>
                      <span className="current-price">
                        {formatPrice(item.currentPrice)}
                      </span>
                    </div>

                    {item.priceChange !== 0 && (
                      <div className="price-change-section">
                        <span
                          className="price-change"
                          style={{ color: getPriceChangeColor(item.priceChange) }}
                        >
                          {getPriceChangeIcon(item.priceChange)}
                          {item.priceChange > 0 ? '+' : ''}
                          {formatPrice(Math.abs(item.priceChange))}
                        </span>
                        <span className="change-label">
                          {item.target_price ? '目標価格比' : '前回比'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="availability-section">
                    <div className={`availability-status ${item.hasAvailability ? 'available' : 'unavailable'}`}>
                      {item.hasAvailability ? '✅ 空室あり' : '❌ 満室'}
                    </div>
                    {item.error && (
                      <div className="error-note">
                        ⚠️ 価格取得エラー
                      </div>
                    )}
                  </div>
                </div>

                <div className="item-footer">
                  <div className="alert-conditions">
                    {item.alert_conditions?.priceDropAlert && (
                      <span className="alert-tag">📉 価格下落アラート</span>
                    )}
                    {item.alert_conditions?.availabilityAlert && (
                      <span className="alert-tag">🏨 空室アラート</span>
                    )}
                    {item.alert_conditions?.lastRoomAlert && (
                      <span className="alert-tag">⚡ 残り僅かアラート</span>
                    )}
                  </div>
                  <div className="watch-since">
                    追加日: {formatDate(item.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {watchlistData.pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page <= 1}
                className="page-btn"
              >
                前へ
              </button>
              <span className="page-info">
                {filters.page} / {watchlistData.pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page >= watchlistData.pagination.totalPages}
                className="page-btn"
              >
                次へ
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-watchlist">
          <div className="empty-icon">🔔</div>
          <h3>ウォッチリストは空です</h3>
          <p>ホテル検索でお気に入りのホテルを見つけて、ウォッチリストに追加しましょう。</p>
          <button
            onClick={() => window.location.href = '/search'}
            className="search-hotels-btn"
          >
            ホテルを検索
          </button>
        </div>
      )}

      {/* Help Section */}
      <div className="watchlist-help">
        <h3>ウォッチリストについて</h3>
        <div className="help-grid">
          <div className="help-item">
            <h4>📉 価格下落アラート</h4>
            <p>設定した目標価格を下回った時に通知</p>
          </div>
          <div className="help-item">
            <h4>🏨 空室アラート</h4>
            <p>満室だったホテルに空室が出た時に通知</p>
          </div>
          <div className="help-item">
            <h4>⚡ 残り僅かアラート</h4>
            <p>残り1室になった時に通知</p>
          </div>
          <div className="help-item">
            <h4>🔄 自動更新</h4>
            <p>15分間隔で価格と空室状況を自動チェック</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchlistManager;