import React, { useState, useRef, useEffect } from 'react';
import './HotelCard.css';

interface HotelData {
  id: number;
  name: string;
  location: string;
  address?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount?: number;
  image: string;
  images?: string[];
  amenities: string[];
  isLuxury?: boolean;
  isNew?: boolean;
  isPopular?: boolean;
  isSoldOut?: boolean;
  availableRooms?: number;
  checkIn?: string;
  checkOut?: string;
  cancellationPolicy?: string;
  distanceFromStation?: string;
  tags?: string[];
}

interface HotelCardProps {
  hotel: HotelData;
  onSelect?: (hotel: HotelData) => void;
  onQuickView?: (hotel: HotelData) => void;
  onFavorite?: (hotel: HotelData) => void;
  isFavorite?: boolean;
  viewMode?: 'grid' | 'list';
  showDetails?: boolean;
  className?: string;
}

export const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  onSelect,
  onQuickView,
  onFavorite,
  isFavorite = false,
  viewMode = 'grid',
  showDetails = true,
  className = ''
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const amenityIcons: { [key: string]: string } = {
    'WiFi': '📶',
    '駐車場': '🚗',
    '朝食': '🍳',
    'ジム': '💪',
    'プール': '🏊',
    'スパ': '💆',
    'レストラン': '🍽️',
    'バー': '🍷',
    'ペット可': '🐕',
    '禁煙': '🚭'
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect && !e.defaultPrevented) {
      onSelect(hotel);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(hotel);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavorite) {
      onFavorite(hotel);
    }
  };

  const calculateSavings = () => {
    if (hotel.originalPrice && hotel.price) {
      return hotel.originalPrice - hotel.price;
    }
    return 0;
  };

  const getAvailabilityStatus = () => {
    if (hotel.isSoldOut) {
      return { text: '満室', className: 'sold-out' };
    }
    if (hotel.availableRooms && hotel.availableRooms <= 3) {
      return { text: `残り${hotel.availableRooms}室`, className: 'low-availability' };
    }
    return null;
  };

  const availabilityStatus = getAvailabilityStatus();

  // Auto-cycle through images on hover
  useEffect(() => {
    if (isHovered && hotel.images && hotel.images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % hotel.images!.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setCurrentImageIndex(0);
    }
  }, [isHovered, hotel.images]);

  const cardClass = `
    hotel-card 
    ${viewMode} 
    ${hotel.isLuxury ? 'luxury' : ''}
    ${hotel.isPopular ? 'popular' : ''}
    ${hotel.isSoldOut ? 'sold-out' : ''}
    ${isHovered ? 'hovered' : ''}
    ${className}
  `;

  return (
    <article 
      ref={cardRef}
      className={cardClass}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${hotel.name} - ${hotel.location}`}
    >
      {/* Image Section */}
      <div className="hotel-card-image-section">
        <div className="hotel-card-image-wrapper">
          {!isImageLoaded && (
            <div className="hotel-card-image-skeleton">
              <div className="skeleton-shimmer"></div>
            </div>
          )}
          
          <img
            src={hotel.images?.[currentImageIndex] || hotel.image}
            alt={hotel.name}
            className={`hotel-card-image ${isImageLoaded ? 'loaded' : ''}`}
            onLoad={handleImageLoad}
            loading="lazy"
          />
          
          {/* Image Overlay Gradient */}
          <div className="hotel-card-image-overlay"></div>
          
          {/* Badges */}
          <div className="hotel-card-badges">
            {hotel.isLuxury && (
              <span className="badge badge-luxury">
                <span className="badge-icon">👑</span>
                Premium
              </span>
            )}
            {hotel.isNew && (
              <span className="badge badge-new">
                <span className="badge-icon">✨</span>
                New
              </span>
            )}
            {hotel.isPopular && (
              <span className="badge badge-popular">
                <span className="badge-icon">🔥</span>
                人気
              </span>
            )}
            {availabilityStatus && (
              <span className={`badge badge-${availabilityStatus.className}`}>
                {availabilityStatus.text}
              </span>
            )}
          </div>
          
          {/* Discount Badge */}
          {hotel.discount && hotel.discount > 0 && (
            <div className="hotel-card-discount">
              <span className="discount-percentage">-{hotel.discount}%</span>
              <span className="discount-label">OFF</span>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="hotel-card-quick-actions">
            <button
              className={`quick-action-btn favorite-btn ${isFavorite ? 'active' : ''}`}
              onClick={handleFavorite}
              aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
            {hotel.images && hotel.images.length > 1 && (
              <button
                className="quick-action-btn gallery-btn"
                onClick={() => setShowImageGallery(true)}
                aria-label="画像ギャラリーを表示"
              >
                🖼️
              </button>
            )}
            {onQuickView && (
              <button
                className="quick-action-btn quick-view-btn"
                onClick={handleQuickView}
                aria-label="クイックビュー"
              >
                👁️
              </button>
            )}
          </div>
          
          {/* Image Indicators */}
          {hotel.images && hotel.images.length > 1 && (
            <div className="hotel-card-image-indicators">
              {hotel.images.map((_, index) => (
                <span
                  key={index}
                  className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Content Section */}
      <div className="hotel-card-content">
        {/* Header */}
        <header className="hotel-card-header">
          <h3 className="hotel-card-title">{hotel.name}</h3>
          <div className="hotel-card-location">
            <span className="location-icon">📍</span>
            <span className="location-text">{hotel.location}</span>
            {hotel.distanceFromStation && (
              <span className="distance-info">
                • {hotel.distanceFromStation}
              </span>
            )}
          </div>
        </header>
        
        {/* Rating and Reviews */}
        {showDetails && (
          <div className="hotel-card-rating">
            <div className="rating-stars">
              <span className="stars-filled">
                {'★'.repeat(Math.floor(hotel.rating))}
              </span>
              <span className="stars-empty">
                {'☆'.repeat(5 - Math.floor(hotel.rating))}
              </span>
            </div>
            <span className="rating-number">{hotel.rating}</span>
            {hotel.reviewCount && (
              <span className="review-count">({hotel.reviewCount}件)</span>
            )}
          </div>
        )}
        
        {/* Amenities */}
        {showDetails && hotel.amenities.length > 0 && (
          <div className="hotel-card-amenities">
            {hotel.amenities.slice(0, viewMode === 'grid' ? 4 : 6).map((amenity, index) => (
              <span key={index} className="amenity-item">
                <span className="amenity-icon">
                  {amenityIcons[amenity] || '✓'}
                </span>
                <span className="amenity-text">{amenity}</span>
              </span>
            ))}
            {hotel.amenities.length > (viewMode === 'grid' ? 4 : 6) && (
              <span className="amenity-more">
                +{hotel.amenities.length - (viewMode === 'grid' ? 4 : 6)}
              </span>
            )}
          </div>
        )}
        
        {/* Tags */}
        {hotel.tags && hotel.tags.length > 0 && (
          <div className="hotel-card-tags">
            {hotel.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Pricing Section */}
        <div className="hotel-card-pricing">
          <div className="pricing-main">
            {hotel.originalPrice && hotel.originalPrice > hotel.price && (
              <div className="price-original">
                <span className="price-strike">¥{hotel.originalPrice.toLocaleString()}</span>
                <span className="savings-amount">
                  ¥{calculateSavings().toLocaleString()}お得
                </span>
              </div>
            )}
            <div className="price-current">
              <span className="price-value">¥{hotel.price.toLocaleString()}</span>
              <span className="price-unit">/泊</span>
            </div>
          </div>
          
          {/* Action Button */}
          <button 
            className="hotel-card-book-btn"
            onClick={handleCardClick}
            disabled={hotel.isSoldOut}
          >
            <span className="btn-text">
              {hotel.isSoldOut ? '満室' : '詳細を見る'}
            </span>
            <span className="btn-arrow">→</span>
          </button>
        </div>
        
        {/* Additional Info */}
        {hotel.cancellationPolicy && (
          <div className="hotel-card-policy">
            <span className="policy-icon">✓</span>
            <span className="policy-text">{hotel.cancellationPolicy}</span>
          </div>
        )}
      </div>
      
      {/* Hover Effect Highlight */}
      <div className="hotel-card-highlight"></div>
    </article>
  );
};