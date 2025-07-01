// Hotel Map Component with Mapbox integration
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createMapboxManager, POI_CATEGORIES } from '../../services/map/mapbox-config';
import { useHotelSearch } from '../../hooks/useHotelSearch';
import HotelMarker from './HotelMarker';
import MapControls from './MapControls';
import PriceOverlay from './PriceOverlay';
import POIPanel from './POIPanel';
import './HotelMap.css';

const HotelMap = ({ 
  hotels = [], 
  selectedHotel, 
  onHotelSelect,
  searchCenter,
  searchRadius,
  showPOIs = true,
  showPrices = true,
  showDirections = false,
  userLocation = null
}) => {
  const mapContainer = useRef(null);
  const mapManager = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewMode, setViewMode] = useState('2D');
  const [activeCategories, setActiveCategories] = useState(
    Object.keys(POI_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  const [showStreetView, setShowStreetView] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapManager.current) return;

    const initializeMap = async () => {
      const manager = createMapboxManager(mapContainer.current, {
        center: searchCenter || [139.7671, 35.6812],
        zoom: searchRadius ? 14 - Math.log2(searchRadius) : 13
      });

      await manager.initialize();
      mapManager.current = manager;
      setMapLoaded(true);

      // Setup event listeners
      setupMapEvents(manager.map);
    };

    initializeMap();

    return () => {
      if (mapManager.current) {
        mapManager.current.destroy();
        mapManager.current = null;
      }
    };
  }, [searchCenter, searchRadius]);

  // Setup map event listeners
  const setupMapEvents = (map) => {
    // Click on hotel cluster
    map.on('click', 'hotel-clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['hotel-clusters']
      });

      const clusterId = features[0].properties.cluster_id;
      map.getSource('hotels').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom
        });
      });
    });

    // Click on individual hotel
    map.on('click', 'hotel-points', (e) => {
      const hotel = e.features[0].properties;
      onHotelSelect(hotel.id);
    });

    // Hover effects
    map.on('mouseenter', 'hotel-points', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'hotel-points', () => {
      map.getCanvas().style.cursor = '';
    });

    // POI clicks
    Object.values(POI_CATEGORIES).forEach(category => {
      map.on('click', `poi-${category.id}`, (e) => {
        const poi = e.features[0].properties;
        setSelectedPOI({ ...poi, category: category.id });
      });
    });
  };

  // Update hotels on map
  useEffect(() => {
    if (!mapManager.current || !mapLoaded) return;

    mapManager.current.updateHotels(hotels);

    // Add custom markers for better visualization
    hotels.forEach(hotel => {
      const markerId = `hotel-${hotel.id}`;
      
      // Remove existing marker
      mapManager.current.removeMarker(markerId);

      // Add new marker with price
      mapManager.current.addMarker(markerId, [hotel.lng, hotel.lat], {
        className: selectedHotel?.id === hotel.id ? 'selected' : '',
        html: `
          <div class="hotel-marker-content">
            <div class="hotel-price">¥${hotel.price.toLocaleString()}</div>
            <div class="hotel-rating">${hotel.rating}★</div>
          </div>
        `,
        popup: `
          <div class="hotel-popup">
            <h3>${hotel.name}</h3>
            <p class="price">¥${hotel.price.toLocaleString()}/泊</p>
            <p class="rating">${hotel.rating}★ (${hotel.reviewCount}件)</p>
            <button class="view-details" data-hotel-id="${hotel.id}">
              詳細を見る
            </button>
          </div>
        `
      });
    });

    // Fit map to show all hotels
    if (hotels.length > 0) {
      mapManager.current.fitToMarkers(100);
    }
  }, [hotels, selectedHotel, mapLoaded, onHotelSelect]);

  // Update POIs visibility
  useEffect(() => {
    if (!mapManager.current || !mapLoaded) return;

    Object.entries(activeCategories).forEach(([categoryId, isActive]) => {
      mapManager.current.map.setLayoutProperty(
        `poi-${categoryId}`,
        'visibility',
        isActive ? 'visible' : 'none'
      );
    });
  }, [activeCategories, mapLoaded]);

  // Handle view mode change (2D/3D)
  const handleViewModeChange = useCallback((mode) => {
    if (!mapManager.current) return;

    setViewMode(mode);
    
    if (mode === '3D') {
      mapManager.current.map.easeTo({
        pitch: 60,
        bearing: -20,
        duration: 1000
      });
    } else {
      mapManager.current.map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
    }
  }, []);

  // Handle directions request
  const handleDirections = useCallback((from, to) => {
    if (!mapManager.current || !showDirections) return;

    // Add directions control if not already added
    if (!mapManager.current.directionsAdded) {
      mapManager.current.map.addControl(
        mapManager.current.directions,
        'top-left'
      );
      mapManager.current.directionsAdded = true;
    }

    // Set origin and destination
    mapManager.current.directions.setOrigin(from);
    mapManager.current.directions.setDestination(to);

    // Listen for route updates
    mapManager.current.directions.on('route', (e) => {
      const route = e.route[0];
      setRouteInfo({
        distance: (route.distance / 1000).toFixed(1),
        duration: Math.round(route.duration / 60)
      });
    });
  }, [showDirections]);

  // Handle street view
  const handleStreetView = useCallback((location) => {
    setShowStreetView(true);
    // Street view implementation will be added in the next component
  }, []);

  // Handle area search
  const handleAreaSearch = useCallback(() => {
    if (!mapManager.current) return;

    const bounds = mapManager.current.map.getBounds();
    const center = mapManager.current.map.getCenter();
    const zoom = mapManager.current.map.getZoom();

    // Trigger search with current map bounds
    if (window.onMapAreaSearch) {
      window.onMapAreaSearch({
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        },
        center: [center.lng, center.lat],
        radius: Math.pow(2, 15 - zoom) // Approximate radius based on zoom
      });
    }
  }, []);

  return (
    <div className="hotel-map-container">
      <div ref={mapContainer} className="mapbox-container" />
      
      {mapLoaded && (
        <>
          <MapControls
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onAreaSearch={handleAreaSearch}
            showStreetView={showStreetView}
            onStreetViewToggle={() => setShowStreetView(!showStreetView)}
          />

          {showPOIs && (
            <POIPanel
              categories={POI_CATEGORIES}
              activeCategories={activeCategories}
              onToggleCategory={(categoryId) => {
                setActiveCategories(prev => ({
                  ...prev,
                  [categoryId]: !prev[categoryId]
                }));
              }}
              selectedPOI={selectedPOI}
              onClosePOI={() => setSelectedPOI(null)}
            />
          )}

          {showPrices && (
            <PriceOverlay
              hotels={hotels}
              mapBounds={mapManager.current?.map.getBounds()}
            />
          )}

          {routeInfo && (
            <div className="route-info">
              <div className="route-distance">距離: {routeInfo.distance}km</div>
              <div className="route-duration">時間: {routeInfo.duration}分</div>
            </div>
          )}

          {showStreetView && (
            <StreetViewPanel
              location={selectedHotel || selectedPOI}
              onClose={() => setShowStreetView(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

// Street View Panel Component
const StreetViewPanel = ({ location, onClose }) => {
  const streetViewRef = useRef(null);

  useEffect(() => {
    if (!location || !window.google) return;

    const panorama = new window.google.maps.StreetViewPanorama(
      streetViewRef.current,
      {
        position: { lat: location.lat, lng: location.lng },
        pov: {
          heading: 34,
          pitch: 10
        },
        zoom: 1,
        addressControl: false,
        linksControl: true,
        panControl: true,
        enableCloseButton: false
      }
    );
  }, [location]);

  return (
    <div className="street-view-panel">
      <button className="close-street-view" onClick={onClose}>×</button>
      <div ref={streetViewRef} className="street-view-container" />
    </div>
  );
};

export default HotelMap;