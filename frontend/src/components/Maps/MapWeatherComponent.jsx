// Integrated Maps and Weather Component
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleMapsAPI from '../../services/api/googleMaps';
import OpenWeatherAPI from '../../services/api/openWeather';

export const MapWeatherComponent = ({ 
  hotels = [], 
  onHotelSelect,
  showWeather = true,
  className = "",
  height = "500px"
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      try {
        if (!mapRef.current) return;

        const mapInstance = await GoogleMapsAPI.createMap('hotel-map', {
          zoom: 12,
          center: hotels.length > 0 
            ? { lat: hotels[0].location.latitude, lng: hotels[0].location.longitude }
            : { lat: 35.6762, lng: 139.6503 }, // Tokyo default
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        if (mapInstance) {
          mapInstanceRef.current = mapInstance;
          setMapReady(true);
        }
      } catch (error) {
        console.error('Map initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeMap();
  }, []);

  // Add hotel markers when map is ready
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || hotels.length === 0) return;

    const { map, addMarker, addInfoWindow, fitBounds } = mapInstanceRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    const markers = [];

    hotels.forEach((hotel, index) => {
      if (!hotel.location?.latitude || !hotel.location?.longitude) return;

      const position = {
        lat: hotel.location.latitude,
        lng: hotel.location.longitude
      };

      const marker = addMarker(position, {
        title: hotel.name,
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#667eea" stroke="#ffffff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="16">🏨</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      const infoContent = `
        <div style="max-width: 300px; padding: 10px;">
          <h3 style="margin: 0 0 8px 0; color: #333;">${hotel.name}</h3>
          <p style="margin: 0 0 8px 0; color: #666;">${hotel.location.address || 'アドレス不明'}</p>
          ${hotel.price ? `
            <div style="margin: 8px 0;">
              <span style="font-size: 18px; font-weight: bold; color: #667eea;">
                ¥${hotel.price.total?.toLocaleString() || 'N/A'}
              </span>
              <span style="color: #666; margin-left: 4px;">/泊</span>
            </div>
          ` : ''}
          ${hotel.rating ? `
            <div style="margin: 8px 0;">
              <span style="color: #ffa500;">★</span>
              <span style="margin-left: 4px;">${hotel.rating.stars || hotel.rating}/5</span>
            </div>
          ` : ''}
          <button 
            onclick="window.selectHotel('${hotel.id}')"
            style="
              background: #667eea; 
              color: white; 
              border: none; 
              padding: 8px 16px; 
              border-radius: 6px; 
              cursor: pointer; 
              margin-top: 8px;
            "
          >
            詳細を見る
          </button>
        </div>
      `;

      addInfoWindow(marker, infoContent);
      
      marker.addListener('click', () => {
        setSelectedHotel(hotel);
        if (onHotelSelect) onHotelSelect(hotel);
      });

      bounds.extend(position);
      markers.push(marker);
    });

    // Set up global hotel selection function
    window.selectHotel = (hotelId) => {
      const hotel = hotels.find(h => h.id === hotelId);
      if (hotel) {
        setSelectedHotel(hotel);
        if (onHotelSelect) onHotelSelect(hotel);
      }
    };

    // Fit map to show all hotels
    if (markers.length > 1) {
      fitBounds(bounds);
    } else if (markers.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    }

    return () => {
      // Cleanup
      delete window.selectHotel;
    };
  }, [mapReady, hotels, onHotelSelect]);

  // Get user location and weather
  useEffect(() => {
    const getUserLocationAndWeather = async () => {
      if (!showWeather) return;

      try {
        const location = await GoogleMapsAPI.getCurrentLocation();
        setUserLocation(location);

        // Get weather for user location or first hotel location
        const weatherLocation = location || (hotels[0]?.location && {
          latitude: hotels[0].location.latitude,
          longitude: hotels[0].location.longitude
        });

        if (weatherLocation) {
          const [weather, forecast] = await Promise.all([
            OpenWeatherAPI.getCurrentWeather(weatherLocation.latitude, weatherLocation.longitude),
            OpenWeatherAPI.getWeatherForecast(weatherLocation.latitude, weatherLocation.longitude)
          ]);

          setCurrentWeather(weather);
          setForecast(forecast);
        }
      } catch (error) {
        console.error('Location/Weather error:', error);
        setWeatherError('位置情報や天気情報の取得に失敗しました');

        // Fallback to default location weather
        if (showWeather) {
          try {
            const weather = await OpenWeatherAPI.getCurrentWeatherByCity('東京');
            const forecast = await OpenWeatherAPI.getWeatherForecastByCity('東京');
            setCurrentWeather(weather);
            setForecast(forecast);
          } catch (fallbackError) {
            console.error('Fallback weather failed:', fallbackError);
          }
        }
      }
    };

    getUserLocationAndWeather();
  }, [showWeather, hotels]);

  // Add user location marker
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !userLocation) return;

    const { addMarker } = mapInstanceRef.current;
    
    const userMarker = addMarker({
      lat: userLocation.latitude,
      lng: userLocation.longitude
    }, {
      title: '現在地',
      icon: {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#4285f4" stroke="#ffffff" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="#ffffff"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(24, 24)
      }
    });

    return () => {
      if (userMarker && userMarker.setMap) {
        userMarker.setMap(null);
      }
    };
  }, [mapReady, userLocation]);

  const formatTemperature = (temp) => `${Math.round(temp)}°C`;

  if (loading) {
    return (
      <div className={`map-weather-loading ${className}`} style={{ height }}>
        <motion.div
          className="loading-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: '12px'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: '2rem', marginBottom: '10px' }}
            >
              🗺️
            </motion.div>
            <p>地図を読み込み中...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`map-weather-container ${className}`} style={{ height }}>
      <div className="map-container" style={{ position: 'relative', height: '100%' }}>
        {/* Map */}
        <div 
          id="hotel-map" 
          ref={mapRef}
          style={{ 
            width: '100%', 
            height: '100%', 
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        />

        {/* Weather Widget */}
        <AnimatePresence>
          {showWeather && currentWeather && (
            <motion.div
              className="weather-widget"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                maxWidth: '300px',
                zIndex: 1000
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <img 
                  src={currentWeather.current.iconUrl} 
                  alt={currentWeather.current.description}
                  style={{ width: '50px', height: '50px', marginRight: '12px' }}
                />
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                    {formatTemperature(currentWeather.current.temperature)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {currentWeather.current.description}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                📍 {currentWeather.location.name}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>体感温度: {formatTemperature(currentWeather.current.feelsLike)}</div>
                <div>湿度: {currentWeather.current.humidity}%</div>
                <div>風速: {currentWeather.current.windSpeed}m/s</div>
                <div>視界: {currentWeather.current.visibility}km</div>
              </div>

              {weatherError && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#fff3cd', 
                  color: '#856404',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  {weatherError}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forecast Widget */}
        <AnimatePresence>
          {showWeather && forecast && (
            <motion.div
              className="forecast-widget"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                zIndex: 1000
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                5日間の天気予報
              </div>
              
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
                {forecast.forecast.slice(0, 5).map((day, index) => (
                  <div 
                    key={index}
                    style={{
                      textAlign: 'center',
                      minWidth: '60px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ color: '#666', marginBottom: '4px' }}>
                      {index === 0 ? '今日' : 
                       index === 1 ? '明日' : 
                       day.date.toLocaleDateString('ja-JP', { weekday: 'short' })}
                    </div>
                    <img 
                      src={day.iconUrl} 
                      alt={day.condition.description}
                      style={{ width: '32px', height: '32px', marginBottom: '4px' }}
                    />
                    <div style={{ fontWeight: 'bold', color: '#333' }}>
                      {formatTemperature(day.temperature.max)}
                    </div>
                    <div style={{ color: '#666' }}>
                      {formatTemperature(day.temperature.min)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Hotel Details */}
        <AnimatePresence>
          {selectedHotel && (
            <motion.div
              className="selected-hotel-details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '16px',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                maxWidth: '320px',
                zIndex: 1000
              }}
            >
              <button
                onClick={() => setSelectedHotel(null)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>

              <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '18px' }}>
                {selectedHotel.name}
              </h3>
              
              <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '14px' }}>
                {selectedHotel.location.address}
              </p>

              {selectedHotel.price && (
                <div style={{ margin: '12px 0', fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
                  ¥{selectedHotel.price.total?.toLocaleString()} /泊
                </div>
              )}

              {selectedHotel.rating && (
                <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#ffa500', marginRight: '4px' }}>★</span>
                  <span>{selectedHotel.rating.stars || selectedHotel.rating}/5</span>
                  {selectedHotel.rating.review && (
                    <span style={{ color: '#666', marginLeft: '8px', fontSize: '12px' }}>
                      ({selectedHotel.rating.review.count} レビュー)
                    </span>
                  )}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onHotelSelect?.(selectedHotel)}
                style={{
                  width: '100%',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginTop: '12px'
                }}
              >
                このホテルを予約
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MapWeatherComponent;