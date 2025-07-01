// Mapbox configuration and initialization
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';

// Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'your-mapbox-token';

// Map styles
export const MAP_STYLES = {
  STREETS: 'mapbox://styles/mapbox/streets-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v10',
  DARK: 'mapbox://styles/mapbox/dark-v10',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v11',
  CUSTOM: 'mapbox://styles/lastminutestay/custom-style' // Custom style for branding
};

// Default map configuration
export const DEFAULT_MAP_CONFIG = {
  style: MAP_STYLES.LIGHT,
  center: [139.7671, 35.6812], // Tokyo
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
  pitch: 0,
  bearing: 0,
  antialias: true,
  locale: 'ja-JP'
};

// Map theme configurations
export const MAP_THEMES = {
  light: {
    style: MAP_STYLES.LIGHT,
    markerColor: '#FF6B6B',
    clusterColor: '#4ECDC4',
    routeColor: '#4285F4',
    textColor: '#2C3E50'
  },
  dark: {
    style: MAP_STYLES.DARK,
    markerColor: '#FF6B6B',
    clusterColor: '#4ECDC4',
    routeColor: '#64B5F6',
    textColor: '#FFFFFF'
  }
};

// POI (Points of Interest) categories
export const POI_CATEGORIES = {
  STATION: {
    id: 'station',
    name: '駅',
    icon: 'rail',
    color: '#4285F4',
    minZoom: 13
  },
  TOURIST: {
    id: 'tourist',
    name: '観光地',
    icon: 'attraction',
    color: '#9C27B0',
    minZoom: 13
  },
  RESTAURANT: {
    id: 'restaurant',
    name: 'レストラン',
    icon: 'restaurant',
    color: '#FF9800',
    minZoom: 14
  },
  SHOPPING: {
    id: 'shopping',
    name: 'ショッピング',
    icon: 'shop',
    color: '#4CAF50',
    minZoom: 14
  },
  CONVENIENCE: {
    id: 'convenience',
    name: 'コンビニ',
    icon: 'convenience-store',
    color: '#00BCD4',
    minZoom: 15
  }
};

// Map utilities
export class MapboxManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = { ...DEFAULT_MAP_CONFIG, ...options };
    this.map = null;
    this.markers = new Map();
    this.popups = new Map();
    this.directions = null;
    this.geocoder = null;
  }

  // Initialize map
  async initialize() {
    return new Promise((resolve) => {
      this.map = new mapboxgl.Map({
        container: this.container,
        ...this.options
      });

      // Add navigation controls
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Add scale control
      this.map.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }), 'bottom-left');

      // Add fullscreen control
      this.map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Add geolocate control
      this.map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }), 'top-right');

      // Initialize geocoder
      this.initializeGeocoder();

      // Initialize directions
      this.initializeDirections();

      this.map.on('load', () => {
        this.setupLayers();
        resolve(this.map);
      });
    });
  }

  // Initialize geocoder for search
  initializeGeocoder() {
    this.geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'ホテル、駅、観光地を検索...',
      language: 'ja',
      countries: 'jp',
      bbox: [122.93, 24.04, 153.99, 45.55], // Japan bounding box
      proximity: {
        longitude: this.options.center[0],
        latitude: this.options.center[1]
      }
    });

    this.map.addControl(this.geocoder, 'top-left');

    // Handle geocoder results
    this.geocoder.on('result', (e) => {
      this.handleGeocoderResult(e.result);
    });
  }

  // Initialize directions control
  initializeDirections() {
    this.directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'mapbox/walking',
      alternatives: true,
      geometries: 'geojson',
      controls: {
        profileSwitcher: true,
        instructions: true
      },
      language: 'ja'
    });

    // Add custom styling
    this.directions.on('route', (e) => {
      this.styleRoute(e.route);
    });
  }

  // Setup custom layers
  setupLayers() {
    // Add 3D buildings layer
    this.add3DBuildings();

    // Add custom hotel markers layer
    this.addHotelLayer();

    // Add POI layers
    Object.values(POI_CATEGORIES).forEach(category => {
      this.addPOILayer(category);
    });
  }

  // Add 3D buildings
  add3DBuildings() {
    const layers = this.map.getStyle().layers;
    let labelLayerId;
    
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
        labelLayerId = layers[i].id;
        break;
      }
    }

    this.map.addLayer({
      'id': '3d-buildings',
      'source': 'composite',
      'source-layer': 'building',
      'filter': ['==', 'extrude', 'true'],
      'type': 'fill-extrusion',
      'minzoom': 15,
      'paint': {
        'fill-extrusion-color': '#aaa',
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15, 0,
          15.05, ['get', 'height']
        ],
        'fill-extrusion-base': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15, 0,
          15.05, ['get', 'min_height']
        ],
        'fill-extrusion-opacity': 0.6
      }
    }, labelLayerId);
  }

  // Add hotel markers layer
  addHotelLayer() {
    // This will be populated with actual hotel data
    this.map.addSource('hotels', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // Cluster circles
    this.map.addLayer({
      id: 'hotel-clusters',
      type: 'circle',
      source: 'hotels',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          10, '#f1f075',
          30, '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, 10,
          30, 30,
          40
        ]
      }
    });

    // Cluster count
    this.map.addLayer({
      id: 'hotel-cluster-count',
      type: 'symbol',
      source: 'hotels',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // Individual hotel markers
    this.map.addLayer({
      id: 'hotel-points',
      type: 'symbol',
      source: 'hotels',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': 'hotel-marker',
        'icon-size': 1,
        'icon-allow-overlap': true,
        'text-field': '{title}',
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.25],
        'text-anchor': 'top',
        'text-size': 12
      },
      paint: {
        'text-color': '#333',
        'text-halo-color': '#fff',
        'text-halo-width': 2
      }
    });
  }

  // Add POI layer
  addPOILayer(category) {
    this.map.addSource(`poi-${category.id}`, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    this.map.addLayer({
      id: `poi-${category.id}`,
      type: 'symbol',
      source: `poi-${category.id}`,
      minzoom: category.minZoom,
      layout: {
        'icon-image': category.icon,
        'icon-size': 0.8,
        'text-field': '{name}',
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 10,
        'text-offset': [0, 1],
        'text-anchor': 'top',
        'text-optional': true
      },
      paint: {
        'text-color': category.color,
        'text-halo-color': '#fff',
        'text-halo-width': 1
      }
    });
  }

  // Update hotels on map
  updateHotels(hotels) {
    const features = hotels.map(hotel => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [hotel.lng, hotel.lat]
      },
      properties: {
        id: hotel.id,
        title: hotel.name,
        price: hotel.price,
        rating: hotel.rating,
        availability: hotel.availability
      }
    }));

    this.map.getSource('hotels').setData({
      type: 'FeatureCollection',
      features
    });
  }

  // Add custom marker
  addMarker(id, coordinates, options = {}) {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    
    if (options.className) {
      el.className += ` ${options.className}`;
    }

    if (options.html) {
      el.innerHTML = options.html;
    }

    const marker = new mapboxgl.Marker(el)
      .setLngLat(coordinates)
      .addTo(this.map);

    if (options.popup) {
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(options.popup);
      marker.setPopup(popup);
    }

    this.markers.set(id, marker);
    return marker;
  }

  // Remove marker
  removeMarker(id) {
    const marker = this.markers.get(id);
    if (marker) {
      marker.remove();
      this.markers.delete(id);
    }
  }

  // Fit bounds to markers
  fitToMarkers(padding = 50) {
    if (this.markers.size === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    this.markers.forEach(marker => {
      bounds.extend(marker.getLngLat());
    });

    this.map.fitBounds(bounds, { padding });
  }

  // Handle geocoder result
  handleGeocoderResult(result) {
    // Custom handling of search results
    this.map.flyTo({
      center: result.center,
      zoom: 15,
      essential: true
    });
  }

  // Style route
  styleRoute(route) {
    // Custom route styling based on travel mode
    const duration = Math.round(route.duration / 60);
    const distance = (route.distance / 1000).toFixed(1);
    
    console.log(`Route: ${distance}km, ${duration}分`);
  }

  // Clean up
  destroy() {
    this.markers.forEach(marker => marker.remove());
    this.markers.clear();
    this.popups.forEach(popup => popup.remove());
    this.popups.clear();
    
    if (this.map) {
      this.map.remove();
    }
  }
}

// Export singleton instance creator
export const createMapboxManager = (container, options) => {
  return new MapboxManager(container, options);
};