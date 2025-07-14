import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { HotelCardEnhanced } from './HotelCardEnhanced';

interface SwipeableHotelCarouselProps {
  hotels: any[];
  selectedDates: { checkin: string; checkout: string };
  favorites: string[];
  onToggleFavorite: (hotelId: string) => void;
  currentUser: any;
  onHotelClick: (hotel: any) => void;
  title: string;
}

export const SwipeableHotelCarousel: React.FC<SwipeableHotelCarouselProps> = ({
  hotels,
  selectedDates,
  favorites,
  onToggleFavorite,
  currentUser,
  onHotelClick,
  title
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
      setIsMobile(window.innerWidth < 768);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const cardWidth = isMobile ? containerWidth - 32 : 320;
  const cardGap = 16;
  const cardsToShow = isMobile ? 1 : Math.floor(containerWidth / (cardWidth + cardGap));

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = cardWidth / 3;
    
    if (info.offset.x > threshold && currentIndex > 0) {
      // Swipe right - go to previous
      setCurrentIndex(currentIndex - 1);
    } else if (info.offset.x < -threshold && currentIndex < hotels.length - cardsToShow) {
      // Swipe left - go to next
      setCurrentIndex(currentIndex + 1);
    }
    
    // Animate to position
    controls.start({
      x: -currentIndex * (cardWidth + cardGap),
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    });
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      controls.start({
        x: -(currentIndex - 1) * (cardWidth + cardGap),
        transition: { type: 'spring', stiffness: 300, damping: 30 }
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < hotels.length - cardsToShow) {
      setCurrentIndex(currentIndex + 1);
      controls.start({
        x: -(currentIndex + 1) * (cardWidth + cardGap),
        transition: { type: 'spring', stiffness: 300, damping: 30 }
      });
    }
  };

  return (
    <div style={{
      width: '100%',
      overflow: 'hidden',
      padding: '24px 0',
      background: 'linear-gradient(to bottom, #f9fafb, #ffffff)'
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontSize: isMobile ? '20px' : '24px',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          {title}
        </h2>
        
        {/* ナビゲーションボタン（デスクトップのみ） */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: currentIndex === 0 ? '#e5e7eb' : '#1f2937',
                color: 'white',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              ←
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex >= hotels.length - cardsToShow}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: currentIndex >= hotels.length - cardsToShow ? '#e5e7eb' : '#1f2937',
                color: 'white',
                cursor: currentIndex >= hotels.length - cardsToShow ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* カルーセルコンテナ */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '0 16px'
        }}
      >
        <motion.div
          drag={isMobile ? "x" : false}
          dragConstraints={{
            left: -(hotels.length - 1) * (cardWidth + cardGap),
            right: 0
          }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          animate={controls}
          style={{
            display: 'flex',
            gap: `${cardGap}px`,
            cursor: isMobile ? 'grab' : 'auto'
          }}
          whileDrag={{ cursor: 'grabbing' }}
        >
          {hotels.map((hotel, index) => (
            <div
              key={hotel.id}
              style={{
                minWidth: `${cardWidth}px`,
                maxWidth: `${cardWidth}px`
              }}
            >
              <HotelCardEnhanced
                hotel={hotel}
                selectedDates={selectedDates}
                isFavorite={favorites.includes(hotel.id)}
                onToggleFavorite={onToggleFavorite}
                currentUser={currentUser}
                onHotelClick={onHotelClick}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* ページインジケーター（モバイルのみ） */}
      {isMobile && hotels.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '16px'
        }}>
          {hotels.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: index === currentIndex ? '#1f2937' : '#e5e7eb',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};