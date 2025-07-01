// Ultra-fast loading components for premium UX
import React from 'react';
import './LoadingComponents.css';
import imageOptimizer from '../../utils/image-optimizer';
const { LazyImageLoader } = imageOptimizer;

// Loading Spinner Component
export const LoadingSpinner = ({ size = 'medium', color = '#1976d2' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-current ${sizeClasses[size]}`} 
         style={{ borderTopColor: color }}>
    </div>
  );
};

// Skeleton Loader for Hotel Cards
export const HotelCardSkeleton = ({ count = 6 }) => {
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="hotel-card-skeleton">
          <div className="skeleton-image shimmer"></div>
          <div className="skeleton-content">
            <div className="skeleton-title shimmer"></div>
            <div className="skeleton-rating shimmer"></div>
            <div className="skeleton-location shimmer"></div>
            <div className="skeleton-price shimmer"></div>
            <div className="skeleton-amenities">
              <div className="skeleton-amenity shimmer"></div>
              <div className="skeleton-amenity shimmer"></div>
              <div className="skeleton-amenity shimmer"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Search Results Skeleton
export const SearchResultsSkeleton = () => (
  <div className="search-results-skeleton">
    <div className="skeleton-search-header">
      <div className="skeleton-result-count shimmer"></div>
      <div className="skeleton-filters shimmer"></div>
    </div>
    <HotelCardSkeleton count={8} />
  </div>
);

// Map Skeleton Loader
export const MapSkeleton = () => (
  <div className="map-skeleton">
    <div className="skeleton-map-container shimmer">
      <div className="skeleton-map-controls">
        <div className="skeleton-control shimmer"></div>
        <div className="skeleton-control shimmer"></div>
        <div className="skeleton-control shimmer"></div>
      </div>
      <div className="skeleton-markers">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-marker shimmer"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 60 + 20}%`
            }}
          ></div>
        ))}
      </div>
    </div>
  </div>
);

// Premium Spinner with Brand Colors
export const PremiumSpinner = ({ size = 'medium', message = '読み込み中...' }) => (
  <div className={`premium-spinner-container ${size}`}>
    <div className="premium-spinner">
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
      <div className="spinner-logo">
        <span className="logo-text">L</span>
      </div>
    </div>
    {message && <p className="spinner-message">{message}</p>}
  </div>
);

// Progress Bar with Stages
export const StageProgressBar = ({ currentStage, stages, progress }) => (
  <div className="stage-progress-container">
    <div className="progress-header">
      <h3>検索中...</h3>
      <span className="progress-percentage">{Math.round(progress)}%</span>
    </div>
    
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${progress}%` }}
      ></div>
    </div>
    
    <div className="progress-stages">
      {stages.map((stage, index) => (
        <div 
          key={index}
          className={`progress-stage ${
            index < currentStage ? 'completed' : 
            index === currentStage ? 'active' : 'pending'
          }`}
        >
          <div className="stage-icon">
            {index < currentStage ? '✓' : 
             index === currentStage ? '⏳' : '⏸️'}
          </div>
          <span className="stage-label">{stage}</span>
        </div>
      ))}
    </div>
  </div>
);

// Pulse Loading for Interactive Elements
export const PulseLoader = ({ children, isLoading }) => (
  <div className={`pulse-loader ${isLoading ? 'loading' : ''}`}>
    {children}
    {isLoading && <div className="pulse-overlay"></div>}
  </div>
);

// Typing Animation for Search
export const TypingAnimation = ({ text, speed = 100 }) => {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  return (
    <div className="typing-animation">
      <span>{displayText}</span>
      <span className="typing-cursor">|</span>
    </div>
  );
};

// Image Loading with Blur-up and Lazy Loading
export const ImageWithSkeleton = ({ 
  src, 
  alt, 
  className = '',
  skeletonHeight = '200px',
  lazy = true,
  progressive = true,
  lowQualitySrc = null 
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const imgRef = React.useRef(null);

  React.useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const lazyLoader = new LazyImageLoader({
      rootMargin: '100px',
      threshold: 0.01
    });

    const img = imgRef.current;
    
    // Set up lazy loading
    img.dataset.src = src;
    if (lowQualitySrc) {
      img.dataset.lowsrc = lowQualitySrc;
    }

    // Add event listener for when image is lazy loaded
    img.addEventListener('lazyloaded', () => {
      setLoaded(true);
    });

    lazyLoader.observe(img);

    return () => {
      if (lazyLoader.imageObserver) {
        lazyLoader.imageObserver.unobserve(img);
      }
    };
  }, [src, lazy, lowQualitySrc]);

  const placeholderSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect width="1" height="1" fill="%23f0f0f0"/%3E%3C/svg%3E';

  return (
    <div className={`image-skeleton-container ${className}`}>
      {!loaded && !error && (
        <div 
          className="image-skeleton shimmer"
          style={{ height: skeletonHeight }}
        >
          <div className="skeleton-icon">📷</div>
        </div>
      )}
      
      <img
        ref={imgRef}
        src={lazy ? placeholderSrc : src}
        alt={alt}
        className={`skeleton-image ${loaded ? 'loaded' : 'loading'} ${progressive ? 'progressive' : ''}`}
        onLoad={() => !lazy && setLoaded(true)}
        onError={() => setError(true)}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
      />
      
      {error && (
        <div 
          className="image-error"
          style={{ height: skeletonHeight }}
        >
          <span className="error-icon">🖼️</span>
          <span className="error-text">画像を読み込めませんでした</span>
        </div>
      )}
    </div>
  );
};

// Page Transition Loader
export const PageTransitionLoader = ({ isLoading, children }) => (
  <div className="page-transition-container">
    {isLoading && (
      <div className="page-transition-overlay">
        <PremiumSpinner size="large" message="ページを読み込み中..." />
      </div>
    )}
    <div className={`page-content ${isLoading ? 'loading' : ''}`}>
      {children}
    </div>
  </div>
);

// Button Loading State
export const LoadingButton = ({ 
  children, 
  isLoading, 
  disabled, 
  onClick,
  className = '',
  ...props 
}) => (
  <button
    className={`loading-button ${className} ${isLoading ? 'loading' : ''}`}
    disabled={disabled || isLoading}
    onClick={onClick}
    {...props}
  >
    {isLoading ? (
      <div className="button-loading">
        <div className="button-spinner"></div>
        <span>処理中...</span>
      </div>
    ) : (
      children
    )}
  </button>
);

// Error Boundary with Loading
export const LoadingErrorBoundary = ({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (hasError) {
    return fallback || <div>エラーが発生しました</div>;
  }

  if (isLoading) {
    return <PremiumSpinner message="コンテンツを準備中..." />;
  }

  return children;
};