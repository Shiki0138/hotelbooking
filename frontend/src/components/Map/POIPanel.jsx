// POI (Points of Interest) Panel Component
import React, { useState, useEffect } from 'react';
import { poiService } from '../../services/map/poi-service';
import './POIPanel.css';

const POIPanel = ({ 
  categories, 
  activeCategories, 
  onToggleCategory, 
  selectedPOI, 
  onClosePOI,
  currentLocation,
  onSelectPOI,
  onGetDirections
}) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [pois, setPOIs] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch POIs when location changes
  useEffect(() => {
    if (!currentLocation) return;

    const fetchPOIs = async () => {
      setLoading(true);
      try {
        const activeCategoryKeys = Object.keys(activeCategories)
          .filter(key => activeCategories[key]);
        
        const result = await poiService.getPOIsNearLocation(
          currentLocation.lat,
          currentLocation.lng,
          1500,
          activeCategoryKeys
        );
        
        setPOIs(result);
      } catch (error) {
        console.error('Failed to fetch POIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPOIs();
  }, [currentLocation, activeCategories]);

  const getCategoryIcon = (categoryId) => {
    const icons = {
      STATION: '🚉',
      TOURIST: '🏛️',
      RESTAURANT: '🍽️',
      SHOPPING: '🛍️',
      CONVENIENCE: '🏪'
    };
    return icons[categoryId] || '📍';
  };

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatWalkingTime = (distance) => {
    const minutes = Math.round(distance / 80); // 80m/min walking speed
    return `${minutes}分`;
  };

  return (
    <div className="poi-panel">
      <h3>周辺施設</h3>
      
      <div className="poi-categories">
        {Object.entries(categories).map(([key, category]) => (
          <div key={key} className="poi-category-section">
            <div 
              className="poi-category-header"
              onClick={() => onToggleCategory(key)}
            >
              <input
                type="checkbox"
                className="poi-checkbox"
                checked={activeCategories[key]}
                onChange={() => onToggleCategory(key)}
                onClick={(e) => e.stopPropagation()}
              />
              <span 
                className="poi-icon"
                style={{ backgroundColor: category.color }}
              >
                {getCategoryIcon(key)}
              </span>
              <span className="poi-label">{category.name}</span>
              {pois[key] && pois[key].length > 0 && (
                <span className="poi-count">{pois[key].length}</span>
              )}
              <button
                className="poi-expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCategory(expandedCategory === key ? null : key);
                }}
              >
                {expandedCategory === key ? '−' : '+'}
              </button>
            </div>
            
            {expandedCategory === key && pois[key] && (
              <div className="poi-list">
                {loading ? (
                  <div className="poi-loading">読み込み中...</div>
                ) : pois[key].length === 0 ? (
                  <div className="poi-empty">周辺に施設が見つかりません</div>
                ) : (
                  pois[key].slice(0, 5).map((poi) => (
                    <POIItem
                      key={poi.id}
                      poi={poi}
                      onSelect={() => onSelectPOI(poi)}
                      onGetDirections={() => onGetDirections(poi)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPOI && (
        <POIDetail
          poi={selectedPOI}
          onClose={onClosePOI}
          onGetDirections={() => onGetDirections(selectedPOI)}
        />
      )}
    </div>
  );
};

// POI Item Component
const POIItem = ({ poi, onSelect, onGetDirections }) => {
  return (
    <div className="poi-item" onClick={onSelect}>
      <div className="poi-item-header">
        <h4 className="poi-item-name">{poi.name}</h4>
        {poi.rating && (
          <span className="poi-item-rating">
            ⭐ {poi.rating}
          </span>
        )}
      </div>
      
      <div className="poi-item-info">
        <span className="poi-item-distance">
          {formatDistance(poi.distance)} ({formatWalkingTime(poi.distance)})
        </span>
        {poi.address && (
          <span className="poi-item-address">{poi.address}</span>
        )}
      </div>
      
      <div className="poi-item-actions">
        <button 
          className="poi-directions-btn"
          onClick={(e) => {
            e.stopPropagation();
            onGetDirections();
          }}
        >
          経路案内
        </button>
      </div>
    </div>
  );
};

// POI Detail Component
const POIDetail = ({ poi, onClose, onGetDirections }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch additional details based on POI type
    const fetchDetails = async () => {
      setLoading(true);
      try {
        let additionalDetails = {};
        
        if (poi.category === 'STATION') {
          const stations = await poiService.getTrainStationsWithRoutes(
            poi.lat, 
            poi.lng, 
            100
          );
          additionalDetails = stations[0] || {};
        } else if (poi.category === 'TOURIST') {
          additionalDetails = await poiService.getAttractionDetails(poi.id);
        }
        
        setDetails({ ...poi, ...additionalDetails });
      } catch (error) {
        console.error('Failed to fetch POI details:', error);
        setDetails(poi);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [poi]);

  if (loading) {
    return (
      <div className="poi-detail loading">
        <div className="poi-detail-header">
          <h3>読み込み中...</h3>
          <button className="poi-close-btn" onClick={onClose}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="poi-detail">
      <div className="poi-detail-header">
        <h3>{details.name}</h3>
        <button className="poi-close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="poi-detail-content">
        {details.photos && details.photos.length > 0 && (
          <img 
            src={details.photos[0]} 
            alt={details.name}
            className="poi-detail-photo"
          />
        )}
        
        <div className="poi-detail-info">
          {details.address && (
            <p className="poi-detail-address">📍 {details.address}</p>
          )}
          
          {details.distance && (
            <p className="poi-detail-distance">
              🚶 {formatDistance(details.distance)} 
              ({formatWalkingTime(details.distance)})
            </p>
          )}
          
          {details.rating && (
            <p className="poi-detail-rating">
              ⭐ {details.rating} / 5.0
            </p>
          )}
          
          {details.openingHours && (
            <p className="poi-detail-hours">
              🕐 {details.openingHours}
            </p>
          )}
          
          {details.admissionFee && (
            <p className="poi-detail-fee">
              💴 {details.admissionFee}
            </p>
          )}
          
          {details.routes && details.routes.length > 0 && (
            <div className="poi-detail-routes">
              <h4>利用可能な路線</h4>
              {details.routes.map((route, index) => (
                <div key={index} className="poi-route">
                  <span className="poi-route-line">{route.line}</span>
                  <span className="poi-route-direction">{route.direction}</span>
                </div>
              ))}
            </div>
          )}
          
          {details.description && (
            <p className="poi-detail-description">{details.description}</p>
          )}
        </div>
        
        <button 
          className="poi-detail-directions"
          onClick={onGetDirections}
        >
          ここへの経路を表示
        </button>
      </div>
    </div>
  );
};

// Helper functions
function formatDistance(distance) {
  if (!distance) return '';
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

function formatWalkingTime(distance) {
  if (!distance) return '';
  const minutes = Math.round(distance / 80);
  return `徒歩${minutes}分`;
}

export default POIPanel;