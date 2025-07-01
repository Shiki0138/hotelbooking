// Custom Hotel Marker Component
import React from 'react';
import './HotelMarker.css';

const HotelMarker = ({ 
  hotel, 
  isSelected, 
  onClick, 
  showPrice = true,
  showAvailability = true 
}) => {
  const getPriceColor = (price) => {
    if (price < 10000) return '#4CAF50';
    if (price < 20000) return '#FF9800';
    return '#F44336';
  };

  const getAvailabilityStatus = (available) => {
    if (available <= 1) return { text: '残り1室', color: '#F44336' };
    if (available <= 3) return { text: `残り${available}室`, color: '#FF9800' };
    return { text: '空室あり', color: '#4CAF50' };
  };

  return (
    <div 
      className={`hotel-marker ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(hotel)}
    >
      <div className="marker-content">
        {showPrice && (
          <div 
            className="marker-price" 
            style={{ backgroundColor: getPriceColor(hotel.price) }}
          >
            ¥{hotel.price.toLocaleString()}
          </div>
        )}
        
        <div className="marker-info">
          <div className="marker-name">{hotel.name}</div>
          <div className="marker-rating">
            <span className="stars">{'★'.repeat(Math.floor(hotel.rating))}</span>
            <span className="rating-value">{hotel.rating}</span>
          </div>
          
          {showAvailability && hotel.availability && (
            <div 
              className="marker-availability"
              style={{ color: getAvailabilityStatus(hotel.availability).color }}
            >
              {getAvailabilityStatus(hotel.availability).text}
            </div>
          )}
        </div>
      </div>
      
      <div className="marker-pointer" />
    </div>
  );
};

// Cluster Marker Component
export const ClusterMarker = ({ pointCount, totalPrice }) => {
  const avgPrice = Math.round(totalPrice / pointCount);
  
  return (
    <div className="cluster-marker">
      <div className="cluster-count">{pointCount}</div>
      <div className="cluster-avg-price">
        平均 ¥{avgPrice.toLocaleString()}
      </div>
    </div>
  );
};

// Price Label Component for map overlay
export const PriceLabel = ({ price, position, isHighlighted }) => {
  return (
    <div 
      className={`price-label ${isHighlighted ? 'highlighted' : ''}`}
      style={{
        left: position.x,
        top: position.y
      }}
    >
      ¥{price.toLocaleString()}
    </div>
  );
};

// Mini Marker for dense areas
export const MiniMarker = ({ hotel, onClick }) => {
  return (
    <div 
      className="mini-marker"
      onClick={() => onClick(hotel)}
      title={hotel.name}
    >
      <div className="mini-price">
        {Math.round(hotel.price / 1000)}k
      </div>
    </div>
  );
};

// Animated Marker for new hotels
export const AnimatedMarker = ({ hotel, onAnimationEnd }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);
  
  return (
    <div className="animated-marker">
      <div className="pulse-ring" />
      <HotelMarker hotel={hotel} />
    </div>
  );
};

// Last Minute Deal Marker
export const DealMarker = ({ hotel, discount }) => {
  return (
    <div className="deal-marker">
      <div className="deal-badge">
        -{discount}%
      </div>
      <HotelMarker hotel={hotel} showPrice={true} />
      <div className="deal-timer">
        残り時間: {hotel.dealTimeLeft}
      </div>
    </div>
  );
};

export default HotelMarker;