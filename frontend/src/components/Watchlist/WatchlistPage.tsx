import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WatchlistItem } from './WatchlistModal';
import './WatchlistPage.css';

export const WatchlistPage: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ [key: string]: PricePoint[] }>({});

  interface PricePoint {
    date: string;
    price: number;
  }

  useEffect(() => {
    // Load watchlist from localStorage
    const savedWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
    setWatchlist(savedWatchlist);

    // Generate mock price history for demonstration
    const history: { [key: string]: PricePoint[] } = {};
    savedWatchlist.forEach((item: WatchlistItem) => {
      history[item.hotelId] = generateMockPriceHistory(item.currentPrice);
    });
    setPriceHistory(history);
  }, []);

  const generateMockPriceHistory = (basePrice: number): PricePoint[] => {
    const history: PricePoint[] = [];
    const today = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
      const price = Math.round(basePrice * (1 + variation));
      history.push({
        date: date.toISOString().split('T')[0],
        price
      });
    }
    
    return history;
  };

  const handleRemove = (hotelId: string) => {
    const updatedWatchlist = watchlist.filter(item => item.hotelId !== hotelId);
    setWatchlist(updatedWatchlist);
    localStorage.setItem('hotelWatchlist', JSON.stringify(updatedWatchlist));
  };

  const handleUpdateNotifications = (hotelId: string, channels: WatchlistItem['notificationChannels']) => {
    const updatedWatchlist = watchlist.map(item =>
      item.hotelId === hotelId ? { ...item, notificationChannels: channels } : item
    );
    setWatchlist(updatedWatchlist);
    localStorage.setItem('hotelWatchlist', JSON.stringify(updatedWatchlist));
    setEditingItem(null);
  };

  const calculatePriceChange = (item: WatchlistItem): { amount: number; percentage: number } => {
    const history = priceHistory[item.hotelId] || [];
    if (history.length < 2) return { amount: 0, percentage: 0 };
    
    const currentPrice = history[history.length - 1].price;
    const previousPrice = history[history.length - 2].price;
    const amount = currentPrice - previousPrice;
    const percentage = (amount / previousPrice) * 100;
    
    return { amount, percentage };
  };

  const isTargetMet = (item: WatchlistItem): boolean => {
    const history = priceHistory[item.hotelId] || [];
    if (history.length === 0) return false;
    
    const currentPrice = history[history.length - 1].price;
    
    if (item.targetPrice) {
      return currentPrice <= item.targetPrice;
    }
    
    if (item.discountRate) {
      const discountedPrice = item.currentPrice * (1 - item.discountRate / 100);
      return currentPrice <= discountedPrice;
    }
    
    return false;
  };

  const renderPriceChart = (hotelId: string) => {
    const history = priceHistory[hotelId] || [];
    if (history.length === 0) return null;

    const maxPrice = Math.max(...history.map(p => p.price));
    const minPrice = Math.min(...history.map(p => p.price));
    const priceRange = maxPrice - minPrice;

    return (
      <div className="price-chart">
        <svg viewBox="0 0 300 100" className="chart-svg">
          <polyline
            points={history.map((point, index) => {
              const x = (index / (history.length - 1)) * 300;
              const y = 100 - ((point.price - minPrice) / priceRange) * 90;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="#667eea"
            strokeWidth="2"
          />
          {history.map((point, index) => {
            const x = (index / (history.length - 1)) * 300;
            const y = 100 - ((point.price - minPrice) / priceRange) * 90;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#667eea"
                className="chart-point"
              />
            );
          })}
        </svg>
        <div className="chart-labels">
          <span>¥{minPrice.toLocaleString()}</span>
          <span>¥{maxPrice.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  if (watchlist.length === 0) {
    return (
      <div className="watchlist-page">
        <div className="watchlist-header">
          <h1>価格ウォッチリスト</h1>
        </div>
        <div className="empty-state">
          <p>ウォッチリストに登録されているホテルはありません。</p>
          <Link to="/search" className="search-link">
            ホテルを検索する
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-page">
      <div className="watchlist-header">
        <h1>価格ウォッチリスト</h1>
        <p className="watchlist-count">{watchlist.length}件のホテルを監視中</p>
      </div>

      <div className="watchlist-grid">
        {watchlist.map(item => {
          const priceChange = calculatePriceChange(item);
          const targetMet = isTargetMet(item);
          const currentPrice = priceHistory[item.hotelId]?.[priceHistory[item.hotelId].length - 1]?.price || item.currentPrice;

          return (
            <div key={item.hotelId} className={`watchlist-item ${targetMet ? 'target-met' : ''}`}>
              <div className="item-header">
                <h3>{item.hotelName}</h3>
                <button
                  className="remove-button"
                  onClick={() => handleRemove(item.hotelId)}
                  aria-label="削除"
                >
                  ✕
                </button>
              </div>

              <div className="price-info">
                <div className="current-price">
                  <span className="label">現在価格</span>
                  <span className="price">¥{currentPrice.toLocaleString()}</span>
                  <span className={`price-change ${priceChange.amount >= 0 ? 'up' : 'down'}`}>
                    {priceChange.amount >= 0 ? '▲' : '▼'}
                    {Math.abs(priceChange.percentage).toFixed(1)}%
                  </span>
                </div>

                <div className="target-info">
                  <span className="label">目標</span>
                  {item.targetPrice ? (
                    <span className="target">¥{item.targetPrice.toLocaleString()}以下</span>
                  ) : (
                    <span className="target">{item.discountRate}%OFF</span>
                  )}
                  {targetMet && <span className="target-badge">達成!</span>}
                </div>
              </div>

              {renderPriceChart(item.hotelId)}

              <div className="notification-section">
                <h4>通知設定</h4>
                {editingItem === item.hotelId ? (
                  <div className="notification-edit">
                    {item.notificationChannels.map(channel => (
                      <label key={channel.type} className="channel-checkbox">
                        <input
                          type="checkbox"
                          checked={channel.enabled}
                          onChange={(e) => {
                            const updatedChannels = item.notificationChannels.map(ch =>
                              ch.type === channel.type ? { ...ch, enabled: e.target.checked } : ch
                            );
                            handleUpdateNotifications(item.hotelId, updatedChannels);
                          }}
                        />
                        <span>
                          {channel.type === 'email' ? 'メール' :
                           channel.type === 'line' ? 'LINE' :
                           channel.type === 'sms' ? 'SMS' : 
                           'プッシュ通知'}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="notification-display">
                    <div className="enabled-channels">
                      {item.notificationChannels
                        .filter(ch => ch.enabled)
                        .map(ch => (
                          <span key={ch.type} className="channel-tag">
                            {ch.type === 'email' ? '📧' :
                             ch.type === 'line' ? '💬' :
                             ch.type === 'sms' ? '📱' : 
                             '🔔'}
                          </span>
                        ))}
                    </div>
                    <button
                      className="edit-button"
                      onClick={() => setEditingItem(item.hotelId)}
                    >
                      編集
                    </button>
                  </div>
                )}
              </div>

              <div className="monitoring-info">
                <span className="period">
                  {new Date(item.monitoringPeriod.startDate).toLocaleDateString()} - 
                  {new Date(item.monitoringPeriod.endDate).toLocaleDateString()}
                </span>
                <span className="days">
                  {item.monitoringPeriod.daysOfWeek.map(day => 
                    ['日', '月', '火', '水', '木', '金', '土'][day]
                  ).join('・')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};