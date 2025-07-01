// Price overlay component for map
import React, { useState, useEffect } from 'react';
import './PriceOverlay.css';

const PriceOverlay = ({ hotels, mapBounds, priceFilters, onPriceFilter }) => {
  const [priceRanges, setPriceRanges] = useState([]);
  const [showPriceLegend, setShowPriceLegend] = useState(true);
  const [selectedRange, setSelectedRange] = useState(null);

  useEffect(() => {
    if (!hotels || hotels.length === 0) return;

    const prices = hotels.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const ranges = generatePriceRanges(minPrice, maxPrice);
    setPriceRanges(ranges);
  }, [hotels]);

  const generatePriceRanges = (min, max) => {
    const range = max - min;
    const step = Math.ceil(range / 5 / 1000) * 1000; // Round to nearest 1000
    
    const ranges = [];
    for (let i = 0; i < 5; i++) {
      const start = min + (i * step);
      const end = i === 4 ? max : min + ((i + 1) * step);
      
      ranges.push({
        id: i,
        min: start,
        max: end,
        color: getPriceColor(i),
        count: hotels.filter(h => h.price >= start && h.price <= end).length
      });
    }
    
    return ranges;
  };

  const getPriceColor = (index) => {
    const colors = [
      '#4CAF50', // Green - Low price
      '#8BC34A', // Light Green
      '#FFC107', // Yellow
      '#FF9800', // Orange
      '#F44336'  // Red - High price
    ];
    return colors[index];
  };

  const handleRangeClick = (range) => {
    const newSelection = selectedRange?.id === range.id ? null : range;
    setSelectedRange(newSelection);
    
    if (onPriceFilter) {
      onPriceFilter(newSelection ? {
        min: newSelection.min,
        max: newSelection.max
      } : null);
    }
  };

  return (
    <div className="price-overlay">
      {showPriceLegend && (
        <div className="price-legend">
          <div className="price-legend-header">
            <h4>価格帯</h4>
            <button
              className="toggle-legend"
              onClick={() => setShowPriceLegend(false)}
            >
              ×
            </button>
          </div>
          
          <div className="price-ranges">
            {priceRanges.map(range => (
              <div
                key={range.id}
                className={`price-range-item ${selectedRange?.id === range.id ? 'selected' : ''}`}
                onClick={() => handleRangeClick(range)}
              >
                <div
                  className="price-color-indicator"
                  style={{ backgroundColor: range.color }}
                />
                <div className="price-range-info">
                  <div className="price-range-text">
                    ¥{(range.min / 1000).toFixed(0)}k - ¥{(range.max / 1000).toFixed(0)}k
                  </div>
                  <div className="price-range-count">
                    {range.count}件
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="price-summary">
            <div className="price-stat">
              <span className="stat-label">最安値</span>
              <span className="stat-value">¥{Math.min(...hotels.map(h => h.price)).toLocaleString()}</span>
            </div>
            <div className="price-stat">
              <span className="stat-label">平均価格</span>
              <span className="stat-value">¥{Math.round(hotels.reduce((sum, h) => sum + h.price, 0) / hotels.length).toLocaleString()}</span>
            </div>
          </div>

          <button
            className="clear-filter-btn"
            onClick={() => {
              setSelectedRange(null);
              onPriceFilter?.(null);
            }}
            disabled={!selectedRange}
          >
            フィルタをクリア
          </button>
        </div>
      )}

      {!showPriceLegend && (
        <button
          className="show-legend-btn"
          onClick={() => setShowPriceLegend(true)}
        >
          💰 価格帯表示
        </button>
      )}

      <PriceBubbles hotels={hotels} priceRanges={priceRanges} />
    </div>
  );
};

// Price bubbles for individual hotels
const PriceBubbles = ({ hotels, priceRanges }) => {
  const [visibleBubbles, setVisibleBubbles] = useState([]);

  useEffect(() => {
    // Filter bubbles based on map zoom and visible area
    const bubbles = hotels.map(hotel => {
      const range = priceRanges.find(r => 
        hotel.price >= r.min && hotel.price <= r.max
      );
      
      return {
        id: hotel.id,
        x: Math.random() * 100, // Would calculate actual position from lat/lng
        y: Math.random() * 100,
        price: hotel.price,
        color: range?.color || '#666',
        size: getPriceBubbleSize(hotel.price, hotels)
      };
    });

    setVisibleBubbles(bubbles);
  }, [hotels, priceRanges]);

  const getPriceBubbleSize = (price, allHotels) => {
    const prices = allHotels.map(h => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const normalized = (price - min) / (max - min);
    return 20 + (normalized * 20); // 20px to 40px
  };

  return (
    <div className="price-bubbles">
      {visibleBubbles.map(bubble => (
        <div
          key={bubble.id}
          className="price-bubble"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            backgroundColor: bubble.color
          }}
        >
          <span className="bubble-price">
            ¥{(bubble.price / 1000).toFixed(0)}k
          </span>
        </div>
      ))}
    </div>
  );
};

export default PriceOverlay;