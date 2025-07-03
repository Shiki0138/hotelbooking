import React from 'react';

// モバイル最適化されたスタイルとコンポーネント

export const MobileSearchButton: React.FC<{ onClick: () => void; loading?: boolean }> = ({ 
  onClick, 
  loading = false 
}) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors touch-manipulation"
    style={{ minHeight: '48px' }} // タッチターゲットサイズ
  >
    {loading ? (
      <span className="flex items-center justify-center gap-2">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        検索中...
      </span>
    ) : (
      'ホテルを検索'
    )}
  </button>
);

export const MobileFilterToggle: React.FC<{ 
  isOpen: boolean; 
  onToggle: () => void; 
  filterCount?: number;
}> = ({ isOpen, onToggle, filterCount = 0 }) => (
  <button
    onClick={onToggle}
    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors touch-manipulation relative"
    style={{ minHeight: '48px' }}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
    </svg>
    フィルター
    {filterCount > 0 && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
        {filterCount}
      </span>
    )}
    <svg className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
);

export const MobileSortSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white touch-manipulation"
    style={{ minHeight: '48px' }}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export const MobileHotelCard: React.FC<{
  hotel: any;
  onViewDetails: (hotel: any) => void;
  onAddToWatchlist?: (hotel: any) => void;
}> = ({ hotel, onViewDetails, onAddToWatchlist }) => (
  <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
    <div className="relative">
      <img
        src={hotel.hotelThumbnailUrl || 'https://via.placeholder.com/400x200'}
        alt={hotel.hotelName}
        className="w-full h-40 sm:h-48 object-cover"
        loading="lazy"
      />
      
      <div className="absolute bottom-0 right-0 bg-black bg-opacity-75 text-white px-3 py-2 rounded-tl-lg">
        <div className="text-xs">1泊</div>
        <div className="text-lg font-bold">¥{hotel.hotelMinCharge.toLocaleString()}〜</div>
      </div>

      {onAddToWatchlist && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToWatchlist(hotel);
          }}
          className="absolute top-3 right-3 bg-white bg-opacity-90 p-3 rounded-full hover:bg-opacity-100 transition-opacity touch-manipulation"
          style={{ minHeight: '44px', minWidth: '44px' }}
          title="ウォッチリストに追加"
        >
          <svg className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      )}
    </div>

    <div className="p-4">
      <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">
        {hotel.hotelName}
      </h3>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center">
          <span className="text-yellow-400">
            {'★'.repeat(Math.floor(hotel.reviewAverage))}
          </span>
          <span className="ml-1 text-sm font-medium">{hotel.reviewAverage.toFixed(1)}</span>
        </div>
        <span className="text-sm text-gray-500">({hotel.reviewCount}件)</span>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        <p className="line-clamp-1">{hotel.address1} {hotel.address2}</p>
        {hotel.access && (
          <p className="line-clamp-1 mt-1">{hotel.access}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(hotel)}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium touch-manipulation"
          style={{ minHeight: '44px' }}
        >
          詳細を見る
        </button>
        
        <a
          href={hotel.hotelInformationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center justify-center gap-1 touch-manipulation"
          style={{ minHeight: '44px', minWidth: '80px' }}
        >
          予約
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  </div>
);

export const MobileDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}> = ({ isOpen, onClose, children, title }) => (
  <>
    {/* オーバーレイ */}
    {isOpen && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
    )}
    
    {/* ドロワー */}
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ maxHeight: '80vh' }}
    >
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
        {children}
      </div>
    </div>
  </>
);

export const MobileTabBar: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { key: string; label: string; icon: string }[];
}> = ({ activeTab, onTabChange, tabs }) => (
  <div className="bg-white border-t">
    <div className="grid grid-cols-5 max-w-md mx-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`p-3 text-center transition-colors touch-manipulation ${
            activeTab === tab.key
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          style={{ minHeight: '60px' }}
        >
          <div className="text-xl mb-1">{tab.icon}</div>
          <div className="text-xs font-medium">{tab.label}</div>
        </button>
      ))}
    </div>
  </div>
);

// LazyImage コンポーネント（画像遅延読み込み）
export const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}> = ({ src, alt, className = '', placeholder = 'https://via.placeholder.com/400x300' }) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [imageRef, setImageRef] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    let observer: IntersectionObserver;
    
    if (imageRef && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.unobserve(imageRef);
            }
          });
        },
        { threshold: 0.1 }
      );
      
      observer.observe(imageRef);
    } else if (imageRef) {
      // フォールバック
      setImageSrc(src);
    }

    return () => {
      if (observer && imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, src]);

  return (
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
};

// スワイプ対応の画像ギャラリー
export const SwipeableImageGallery: React.FC<{
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}> = ({ images, currentIndex, onIndexChange }) => {
  const [startX, setStartX] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || startX === null) return;
    
    const currentX = e.touches[0].clientX;
    const diffX = startX - currentX;
    
    // 50px以上スワイプしたら画像を変更
    if (Math.abs(diffX) > 50) {
      if (diffX > 0 && currentIndex < images.length - 1) {
        onIndexChange(currentIndex + 1);
      } else if (diffX < 0 && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      }
      setIsDragging(false);
      setStartX(null);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setStartX(null);
  };

  return (
    <div
      className="relative h-64 bg-gray-200 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <LazyImage
        src={images[currentIndex]}
        alt={`画像 ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />
      
      {/* インジケーター */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => onIndexChange(index)}
            className={`w-3 h-3 rounded-full transition-colors touch-manipulation ${
              index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default {
  MobileSearchButton,
  MobileFilterToggle,
  MobileSortSelector,
  MobileHotelCard,
  MobileDrawer,
  MobileTabBar,
  LazyImage,
  SwipeableImageGallery,
};