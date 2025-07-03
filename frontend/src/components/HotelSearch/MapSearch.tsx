import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { searchHotelsByLocation } from '../../services/googleMaps.service';

interface MapSearchProps {
  apiKey: string;
  onSelectHotel: (hotel: any) => void;
  onSearchArea: (bounds: google.maps.LatLngBounds, center: { lat: number; lng: number }) => void;
}

interface Hotel {
  id: string;
  name: string;
  position: {
    lat: number;
    lng: number;
  };
  price: number;
  rating: number;
  image: string;
  address: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: 35.6762,
  lng: 139.6503, // Tokyo
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: true,
  fullscreenControl: true,
};

const MapSearch: React.FC<MapSearchProps> = ({ apiKey, onSelectHotel, onSearchArea }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [searchRadius, setSearchRadius] = useState(5000); // 5km default
  const [showCircle, setShowCircle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'click' | 'area' | 'radius'>('click');
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);

    // Initialize drawing manager for area selection
    const drawing = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [
          google.maps.drawing.OverlayType.RECTANGLE,
          google.maps.drawing.OverlayType.CIRCLE,
        ],
      },
      rectangleOptions: {
        fillColor: '#2563eb',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#2563eb',
        clickable: false,
        editable: true,
        zIndex: 1,
      },
      circleOptions: {
        fillColor: '#2563eb',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#2563eb',
        clickable: false,
        editable: true,
        zIndex: 1,
      },
    });

    drawing.setMap(map);
    setDrawingManager(drawing);

    // Add search box
    const input = searchInputRef.current;
    if (input) {
      const searchBox = new google.maps.places.SearchBox(input);
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

      map.addListener('bounds_changed', () => {
        searchBox.setBounds(map.getBounds() as google.maps.LatLngBounds);
      });

      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces();
        if (!places || places.length === 0) return;

        const place = places[0];
        if (place.geometry?.location) {
          map.panTo(place.geometry.location);
          map.setZoom(14);
          handleMapClick({ latLng: place.geometry.location } as google.maps.MapMouseEvent);
        }
      });
    }

    // Handle rectangle completion
    google.maps.event.addListener(drawing, 'rectanglecomplete', (rectangle: google.maps.Rectangle) => {
      const bounds = rectangle.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const center = bounds.getCenter();
        
        onSearchArea(bounds, { lat: center.lat(), lng: center.lng() });
        searchHotelsInBounds(bounds);
        
        // Remove rectangle after search
        setTimeout(() => rectangle.setMap(null), 1000);
      }
    });

    // Handle circle completion
    google.maps.event.addListener(drawing, 'circlecomplete', (circle: google.maps.Circle) => {
      const center = circle.getCenter();
      const radius = circle.getRadius();
      
      searchHotelsInRadius({ lat: center.lat(), lng: center.lng() }, radius);
      
      // Remove circle after search
      setTimeout(() => circle.setMap(null), 1000);
    });
  }, [onSearchArea]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (searchMode !== 'click' || !e.latLng) return;

    const clickedLocation = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };

    setCenter(clickedLocation);
    setShowCircle(true);
    await searchHotelsInRadius(clickedLocation, searchRadius);
  }, [searchMode, searchRadius]);

  const searchHotelsInRadius = async (center: { lat: number; lng: number }, radius: number) => {
    setIsLoading(true);
    try {
      const results = await searchHotelsByLocation(center, radius);
      setHotels(results);
    } catch (error) {
      console.error('Error searching hotels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchHotelsInBounds = async (bounds: google.maps.LatLngBounds) => {
    setIsLoading(true);
    try {
      // Convert bounds to center and radius for API call
      const center = bounds.getCenter();
      const ne = bounds.getNorthEast();
      const distance = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
      
      const results = await searchHotelsByLocation(
        { lat: center.lat(), lng: center.lng() },
        distance
      );
      
      // Filter results to only show hotels within bounds
      const filteredResults = results.filter(hotel => {
        const hotelLatLng = new google.maps.LatLng(hotel.position.lat, hotel.position.lng);
        return bounds.contains(hotelLatLng);
      });
      
      setHotels(filteredResults);
    } catch (error) {
      console.error('Error searching hotels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = parseInt(e.target.value);
    setSearchRadius(newRadius);
    if (showCircle) {
      searchHotelsInRadius(center, newRadius);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(newCenter);
          if (map) {
            map.panTo(newCenter);
            map.setZoom(14);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <div className="relative">
      {/* Search Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-md">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for a location..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {/* Search Mode */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSearchMode('click')}
              className={`flex-1 px-3 py-1 rounded-md text-sm ${
                searchMode === 'click'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Click Search
            </button>
            <button
              onClick={() => setSearchMode('area')}
              className={`flex-1 px-3 py-1 rounded-md text-sm ${
                searchMode === 'area'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Draw Area
            </button>
            <button
              onClick={getCurrentLocation}
              className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm flex items-center"
            >
              <MapPin className="w-4 h-4 mr-1" />
              My Location
            </button>
          </div>

          {/* Radius Slider */}
          {searchMode === 'click' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Search Radius: {(searchRadius / 1000).toFixed(1)}km
              </label>
              <input
                type="range"
                min="1000"
                max="20000"
                step="1000"
                value={searchRadius}
                onChange={handleRadiusChange}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-white rounded-lg shadow-lg p-4 flex items-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Searching hotels...
        </div>
      )}

      {/* Map */}
      <LoadScript googleMapsApiKey={apiKey} libraries={['places', 'drawing', 'geometry']}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={12}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={options}
        >
          {/* Search Area Circle */}
          {showCircle && searchMode === 'click' && (
            <Circle
              center={center}
              radius={searchRadius}
              options={{
                fillColor: '#2563eb',
                fillOpacity: 0.2,
                strokeColor: '#2563eb',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          )}

          {/* Hotel Markers */}
          {hotels.map((hotel) => (
            <Marker
              key={hotel.id}
              position={hotel.position}
              onClick={() => setSelectedHotel(hotel)}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(40, 40),
              }}
            />
          ))}

          {/* Info Window */}
          {selectedHotel && (
            <InfoWindow
              position={selectedHotel.position}
              onCloseClick={() => setSelectedHotel(null)}
            >
              <div className="p-2 max-w-xs">
                <img
                  src={selectedHotel.image}
                  alt={selectedHotel.name}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
                <h3 className="font-semibold text-lg">{selectedHotel.name}</h3>
                <p className="text-sm text-gray-600 mb-1">{selectedHotel.address}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-600">
                    ¥{selectedHotel.price.toLocaleString()}/night
                  </span>
                  <span className="text-sm text-yellow-600">★ {selectedHotel.rating}</span>
                </div>
                <button
                  onClick={() => onSelectHotel(selectedHotel)}
                  className="w-full mt-2 bg-blue-600 text-white py-1 rounded-md hover:bg-blue-700 text-sm"
                >
                  View Details
                </button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* Hotel Count */}
      {hotels.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2">
          <p className="text-sm font-medium">
            Found {hotels.length} hotel{hotels.length !== 1 ? 's' : ''} in this area
          </p>
        </div>
      )}
    </div>
  );
};

export default MapSearch;