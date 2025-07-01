// Map Control Components
import React, { useState } from 'react';
import { directionsService } from '../../services/map/directions-service';
import './MapControls.css';

const MapControls = ({
  viewMode,
  onViewModeChange,
  onAreaSearch,
  showStreetView,
  onStreetViewToggle,
  onStyleChange,
  currentStyle = 'light'
}) => {
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [isochroneTime, setIsochroneTime] = useState(15);
  const [showIsochrone, setShowIsochrone] = useState(false);

  const mapStyles = [
    { id: 'light', name: 'ライト', icon: '☀️' },
    { id: 'dark', name: 'ダーク', icon: '🌙' },
    { id: 'streets', name: 'ストリート', icon: '🛣️' },
    { id: 'satellite', name: '衛星写真', icon: '🛰️' }
  ];

  return (
    <div className="map-controls-container">
      {/* View Mode Toggle */}
      <div className="map-control-group">
        <button
          className={`map-control-btn ${viewMode === '2D' ? 'active' : ''}`}
          onClick={() => onViewModeChange('2D')}
          title="2D表示"
        >
          <span className="control-icon">2D</span>
        </button>
        <button
          className={`map-control-btn ${viewMode === '3D' ? 'active' : ''}`}
          onClick={() => onViewModeChange('3D')}
          title="3D表示"
        >
          <span className="control-icon">3D</span>
        </button>
      </div>

      {/* Map Style Selector */}
      <div className="map-control-group">
        <button
          className="map-control-btn"
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          title="地図スタイル"
        >
          <span className="control-icon">🎨</span>
        </button>
        
        {showStyleMenu && (
          <div className="style-menu">
            {mapStyles.map(style => (
              <button
                key={style.id}
                className={`style-option ${currentStyle === style.id ? 'active' : ''}`}
                onClick={() => {
                  onStyleChange(style.id);
                  setShowStyleMenu(false);
                }}
              >
                <span className="style-icon">{style.icon}</span>
                <span className="style-name">{style.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Street View Toggle */}
      <button
        className={`map-control-btn ${showStreetView ? 'active' : ''}`}
        onClick={onStreetViewToggle}
        title="ストリートビュー"
      >
        <span className="control-icon">👁️</span>
      </button>

      {/* Area Search */}
      <button
        className="map-control-btn area-search"
        onClick={onAreaSearch}
        title="この地域で検索"
      >
        <span className="control-icon">🔍</span>
        <span className="control-text">この地域で検索</span>
      </button>

      {/* Isochrone Control */}
      <IsochroneControl
        time={isochroneTime}
        onTimeChange={setIsochroneTime}
        showIsochrone={showIsochrone}
        onToggle={() => setShowIsochrone(!showIsochrone)}
      />
    </div>
  );
};

// Isochrone Control Component
const IsochroneControl = ({ time, onTimeChange, showIsochrone, onToggle }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="isochrone-control">
      <button
        className={`map-control-btn ${showIsochrone ? 'active' : ''}`}
        onClick={() => setExpanded(!expanded)}
        title="到達圏表示"
      >
        <span className="control-icon">⏱️</span>
      </button>
      
      {expanded && (
        <div className="isochrone-panel">
          <h4>徒歩到達圏</h4>
          <div className="time-selector">
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={time}
              onChange={(e) => onTimeChange(parseInt(e.target.value))}
            />
            <span className="time-value">{time}分</span>
          </div>
          <button
            className={`toggle-btn ${showIsochrone ? 'active' : ''}`}
            onClick={onToggle}
          >
            {showIsochrone ? '非表示' : '表示'}
          </button>
        </div>
      )}
    </div>
  );
};

// Direction Input Component
export const DirectionInput = ({ onGetDirections }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState('walking');
  const [showPanel, setShowPanel] = useState(false);

  const handleGetDirections = () => {
    if (origin && destination) {
      onGetDirections({
        origin,
        destination,
        mode
      });
    }
  };

  return (
    <>
      <button
        className="map-control-btn directions-btn"
        onClick={() => setShowPanel(!showPanel)}
        title="経路案内"
      >
        <span className="control-icon">🚶</span>
      </button>

      {showPanel && (
        <div className="directions-panel">
          <div className="directions-header">
            <h3>経路案内</h3>
            <button 
              className="close-btn"
              onClick={() => setShowPanel(false)}
            >
              ×
            </button>
          </div>

          <div className="directions-form">
            <div className="input-group">
              <label>出発地</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="現在地または住所"
              />
            </div>

            <div className="input-group">
              <label>目的地</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="ホテルまたは住所"
              />
            </div>

            <div className="mode-selector">
              <button
                className={`mode-btn ${mode === 'walking' ? 'active' : ''}`}
                onClick={() => setMode('walking')}
              >
                🚶 徒歩
              </button>
              <button
                className={`mode-btn ${mode === 'cycling' ? 'active' : ''}`}
                onClick={() => setMode('cycling')}
              >
                🚴 自転車
              </button>
              <button
                className={`mode-btn ${mode === 'driving' ? 'active' : ''}`}
                onClick={() => setMode('driving')}
              >
                🚗 車
              </button>
            </div>

            <button 
              className="get-directions-btn"
              onClick={handleGetDirections}
            >
              経路を検索
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Route Display Component
export const RouteDisplay = ({ route, onClose }) => {
  const service = new directionsService();

  if (!route) return null;

  return (
    <div className="route-display">
      <div className="route-header">
        <h3>経路案内</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="route-summary">
        <div className="route-time">
          <span className="icon">⏱️</span>
          <span className="value">{service.formatDuration(route.duration)}</span>
        </div>
        <div className="route-distance">
          <span className="icon">📏</span>
          <span className="value">{service.formatDistance(route.distance)}</span>
        </div>
      </div>

      <div className="route-steps">
        {route.steps.map((step, index) => (
          <div key={index} className="route-step">
            <div className="step-number">{index + 1}</div>
            <div className="step-content">
              <div className="step-instruction">{step.instruction}</div>
              <div className="step-distance">{service.formatDistance(step.distance)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapControls;