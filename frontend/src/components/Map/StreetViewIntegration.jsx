// Street View integration component
import React, { useEffect, useRef, useState } from 'react';
import './StreetViewIntegration.css';

const StreetViewIntegration = ({ 
  location, 
  isVisible, 
  onClose,
  heading = 0,
  pitch = 0,
  zoom = 1 
}) => {
  const streetViewRef = useRef(null);
  const panoramaRef = useRef(null);
  const [streetViewAvailable, setStreetViewAvailable] = useState(true);
  const [currentPov, setCurrentPov] = useState({ heading, pitch });

  useEffect(() => {
    if (!isVisible || !location || !window.google) return;

    initializeStreetView();
  }, [isVisible, location]);

  const initializeStreetView = () => {
    if (!streetViewRef.current) return;

    const streetViewService = new window.google.maps.StreetViewService();
    const position = { lat: location.lat, lng: location.lng };

    // Check if Street View is available at this location
    streetViewService.getPanoramaByLocation(position, 100, (data, status) => {
      if (status === 'OK') {
        setStreetViewAvailable(true);
        createPanorama(data.location.latLng);
      } else {
        setStreetViewAvailable(false);
        // Try to find the nearest available location
        findNearestStreetView(position);
      }
    });
  };

  const createPanorama = (position) => {
    const panorama = new window.google.maps.StreetViewPanorama(
      streetViewRef.current,
      {
        position: position,
        pov: {
          heading: currentPov.heading,
          pitch: currentPov.pitch
        },
        zoom: zoom,
        addressControl: false,
        enableCloseButton: false,
        fullscreenControl: true,
        motionTracking: false,
        motionTrackingControl: false,
        showRoadLabels: true
      }
    );

    panoramaRef.current = panorama;

    // Listen for POV changes
    panorama.addListener('pov_changed', () => {
      const pov = panorama.getPov();
      setCurrentPov({ heading: pov.heading, pitch: pov.pitch });
    });

    // Listen for position changes
    panorama.addListener('position_changed', () => {
      const position = panorama.getPosition();
      console.log('Street View position changed:', position.toJSON());
    });
  };

  const findNearestStreetView = (originalPosition) => {
    const streetViewService = new window.google.maps.StreetViewService();
    
    // Try locations in increasing radius
    const radiuses = [200, 500, 1000, 2000];
    
    const tryRadius = (index) => {
      if (index >= radiuses.length) {
        setStreetViewAvailable(false);
        return;
      }

      streetViewService.getPanoramaByLocation(
        originalPosition, 
        radiuses[index], 
        (data, status) => {
          if (status === 'OK') {
            setStreetViewAvailable(true);
            createPanorama(data.location.latLng);
          } else {
            tryRadius(index + 1);
          }
        }
      );
    };

    tryRadius(0);
  };

  const handleDirectionChange = (direction) => {
    if (!panoramaRef.current) return;

    const currentPov = panoramaRef.current.getPov();
    let newHeading = currentPov.heading;

    switch (direction) {
      case 'left':
        newHeading -= 90;
        break;
      case 'right':
        newHeading += 90;
        break;
      case 'up':
        panoramaRef.current.setPov({
          ...currentPov,
          pitch: Math.min(currentPov.pitch + 30, 90)
        });
        return;
      case 'down':
        panoramaRef.current.setPov({
          ...currentPov,
          pitch: Math.max(currentPov.pitch - 30, -90)
        });
        return;
    }

    // Normalize heading to 0-360 range
    if (newHeading < 0) newHeading += 360;
    if (newHeading >= 360) newHeading -= 360;

    panoramaRef.current.setPov({
      ...currentPov,
      heading: newHeading
    });
  };

  const handleZoomChange = (zoomIn) => {
    if (!panoramaRef.current) return;

    const currentZoom = panoramaRef.current.getZoom();
    const newZoom = zoomIn 
      ? Math.min(currentZoom + 1, 5) 
      : Math.max(currentZoom - 1, 0);
    
    panoramaRef.current.setZoom(newZoom);
  };

  if (!isVisible) return null;

  return (
    <div className="street-view-integration">
      <div className="street-view-header">
        <h3>ストリートビュー</h3>
        <div className="street-view-controls">
          <button onClick={() => handleZoomChange(true)} title="ズームイン">
            🔍+
          </button>
          <button onClick={() => handleZoomChange(false)} title="ズームアウト">
            🔍-
          </button>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
      </div>

      <div className="street-view-content">
        {streetViewAvailable ? (
          <>
            <div ref={streetViewRef} className="street-view-container" />
            
            <StreetViewNavigation 
              onDirectionChange={handleDirectionChange}
              currentPov={currentPov}
            />
            
            <LocationInfo location={location} />
          </>
        ) : (
          <StreetViewNotAvailable location={location} />
        )}
      </div>
    </div>
  );
};

// Navigation controls for Street View
const StreetViewNavigation = ({ onDirectionChange, currentPov }) => (
  <div className="street-view-navigation">
    <div className="nav-controls">
      <button 
        className="nav-btn nav-up"
        onClick={() => onDirectionChange('up')}
        title="上を見る"
      >
        ▲
      </button>
      
      <div className="nav-horizontal">
        <button 
          className="nav-btn nav-left"
          onClick={() => onDirectionChange('left')}
          title="左を向く"
        >
          ◀
        </button>
        
        <div className="nav-center">
          <div className="compass">
            <div 
              className="compass-needle"
              style={{ transform: `rotate(${currentPov.heading}deg)` }}
            >
              N
            </div>
          </div>
        </div>
        
        <button 
          className="nav-btn nav-right"
          onClick={() => onDirectionChange('right')}
          title="右を向く"
        >
          ▶
        </button>
      </div>
      
      <button 
        className="nav-btn nav-down"
        onClick={() => onDirectionChange('down')}
        title="下を見る"
      >
        ▼
      </button>
    </div>
    
    <div className="pov-info">
      <span>方角: {Math.round(currentPov.heading)}°</span>
      <span>角度: {Math.round(currentPov.pitch)}°</span>
    </div>
  </div>
);

// Location information overlay
const LocationInfo = ({ location }) => (
  <div className="location-info">
    <h4>{location.name || '選択された地点'}</h4>
    {location.address && (
      <p className="location-address">{location.address}</p>
    )}
    <div className="location-coordinates">
      <span>緯度: {location.lat.toFixed(6)}</span>
      <span>経度: {location.lng.toFixed(6)}</span>
    </div>
  </div>
);

// Street View not available component
const StreetViewNotAvailable = ({ location }) => (
  <div className="street-view-not-available">
    <div className="not-available-icon">📷</div>
    <h4>ストリートビューが利用できません</h4>
    <p>この地点ではストリートビューが提供されていません。</p>
    <div className="alternative-options">
      <h5>代替オプション:</h5>
      <ul>
        <li>地図表示で周辺を確認</li>
        <li>衛星写真で地域を確認</li>
        <li>近くの利用可能な地点を検索</li>
      </ul>
    </div>
  </div>
);

// Mini Street View for quick preview
export const MiniStreetView = ({ 
  location, 
  size = 'small', 
  onClick,
  showOverlay = true 
}) => {
  const miniViewRef = useRef(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!location || !window.google || !miniViewRef.current) return;

    const streetViewService = new window.google.maps.StreetViewService();
    
    streetViewService.getPanoramaByLocation(
      { lat: location.lat, lng: location.lng }, 
      100, 
      (data, status) => {
        if (status === 'OK') {
          setAvailable(true);
          
          const panorama = new window.google.maps.StreetViewPanorama(
            miniViewRef.current,
            {
              position: data.location.latLng,
              pov: { heading: 0, pitch: 0 },
              zoom: 1,
              addressControl: false,
              enableCloseButton: false,
              fullscreenControl: false,
              motionTracking: false,
              motionTrackingControl: false,
              showRoadLabels: false,
              clickToGo: false,
              scrollwheel: false
            }
          );
        } else {
          setAvailable(false);
        }
      }
    );
  }, [location]);

  return (
    <div 
      className={`mini-street-view ${size} ${available ? 'available' : 'unavailable'}`}
      onClick={onClick}
    >
      <div ref={miniViewRef} className="mini-view-container" />
      
      {showOverlay && (
        <div className="mini-view-overlay">
          {available ? (
            <button className="view-street-view-btn">
              👁️ ストリートビュー
            </button>
          ) : (
            <div className="not-available-overlay">
              <span>利用不可</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StreetViewIntegration;