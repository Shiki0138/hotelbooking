import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import axios from '../../config/axios';

interface Hotel {
  id: string;
  lat: number;
  lng: number;
  price: number;
  priceRange: string;
}

interface LocationSearchMapProps {
  hotels: Hotel[];
  onHotelSelect?: (hotelId: string) => void;
  onBoundsChanged?: (bounds: google.maps.LatLngBounds) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  priceRange?: string;
  className?: string;
}

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 35.6762,
  lng: 139.6503 // Tokyo
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    }
  ]
};

// 価格帯別マーカーアイコン
const getPriceMarkerIcon = (priceRange: string): google.maps.Icon => {
  const icons = {
    '～1.5万円': {
      url: '/icons/marker-green.png',
      scaledSize: new google.maps.Size(30, 30)
    },
    '1.5～3万円': {
      url: '/icons/marker-blue.png',
      scaledSize: new google.maps.Size(30, 30)
    },
    '3～5万円': {
      url: '/icons/marker-orange.png',
      scaledSize: new google.maps.Size(30, 30)
    },
    '5～10万円': {
      url: '/icons/marker-red.png',
      scaledSize: new google.maps.Size(30, 30)
    },
    '10万円～': {
      url: '/icons/marker-purple.png',
      scaledSize: new google.maps.Size(30, 30)
    }
  };
  
  return icons[priceRange as keyof typeof icons] || {
    url: '/icons/marker-default.png',
    scaledSize: new google.maps.Size(30, 30)
  };
};

// クラスター設定
const clusterOptions = {
  imagePath: '/images/cluster/m',
  gridSize: 60,
  maxZoom: 15,
  styles: [
    {
      textColor: 'white',
      url: '/images/cluster/cluster-small.png',
      height: 40,
      width: 40,
      textSize: 12
    },
    {
      textColor: 'white',
      url: '/images/cluster/cluster-medium.png',
      height: 50,
      width: 50,
      textSize: 14
    },
    {
      textColor: 'white',
      url: '/images/cluster/cluster-large.png',
      height: 60,
      width: 60,
      textSize: 16
    }
  ]
};

export const LocationSearchMap: React.FC<LocationSearchMapProps> = ({
  hotels,
  onHotelSelect,
  onBoundsChanged,
  center = defaultCenter,
  zoom = 10,
  height = '400px',
  priceRange,
  className = ''
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [mapHotels, setMapHotels] = useState<Hotel[]>(hotels);
  const [loading, setLoading] = useState(false);

  // Google Maps API キー
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  // マップ境界変更時のホテル再取得
  const handleBoundsChanged = useCallback(async () => {
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const boundsString = `${ne.lat()},${sw.lat()},${ne.lng()},${sw.lng()}`;

    setLoading(true);
    try {
      const response = await axios.get('/api/locations/map/hotels', {
        params: {
          bounds: boundsString,
          priceRange,
          limit: 200
        }
      });

      if (response.data.success) {
        setMapHotels(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching map hotels:', error);
    } finally {
      setLoading(false);
    }

    onBoundsChanged?.(bounds);
  }, [map, priceRange, onBoundsChanged]);

  // マップ読み込み完了
  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  // マーカークリック
  const handleMarkerClick = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    onHotelSelect?.(hotel.id);
  };

  // InfoWindow閉じる
  const handleInfoWindowClose = () => {
    setSelectedHotel(null);
  };

  // 外部からのホテルデータ更新
  useEffect(() => {
    setMapHotels(hotels);
  }, [hotels]);

  // マップスタイル
  const containerStyle = {
    ...mapContainerStyle,
    height
  };

  if (!apiKey) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ height }}>
        <div className="text-center">
          <p className="text-gray-500 mb-2">Google Maps APIキーが設定されていません</p>
          <p className="text-sm text-gray-400">管理者にお問い合わせください</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute top-4 left-4 z-10 bg-white px-3 py-1 rounded-lg shadow-md">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">読み込み中...</span>
          </div>
        </div>
      )}

      <LoadScript
        googleMapsApiKey={apiKey}
        libraries={libraries}
        loadingElement={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={zoom}
          options={mapOptions}
          onLoad={onMapLoad}
          onBoundsChanged={handleBoundsChanged}
        >
          <MarkerClusterer options={clusterOptions}>
            {(clusterer) =>
              mapHotels.map((hotel) => (
                <Marker
                  key={hotel.id}
                  position={{ lat: hotel.lat, lng: hotel.lng }}
                  icon={getPriceMarkerIcon(hotel.priceRange)}
                  onClick={() => handleMarkerClick(hotel)}
                  clusterer={clusterer}
                  title={`¥${hotel.price.toLocaleString()} - ${hotel.priceRange}`}
                />
              ))
            }
          </MarkerClusterer>

          {selectedHotel && (
            <InfoWindow
              position={{ lat: selectedHotel.lat, lng: selectedHotel.lng }}
              onCloseClick={handleInfoWindowClose}
            >
              <div className="p-3 max-w-xs">
                <div className="font-semibold mb-2">ホテル情報</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>料金:</span>
                    <span className="font-medium">¥{selectedHotel.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>価格帯:</span>
                    <span className="text-blue-600">{selectedHotel.priceRange}</span>
                  </div>
                </div>
                <button
                  className="mt-3 w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  onClick={() => onHotelSelect?.(selectedHotel.id)}
                >
                  詳細を見る
                </button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* 凡例 */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md z-10">
        <div className="text-sm font-semibold mb-2">価格帯</div>
        <div className="space-y-1">
          {[
            { range: '～1.5万円', color: 'bg-green-500' },
            { range: '1.5～3万円', color: 'bg-blue-500' },
            { range: '3～5万円', color: 'bg-orange-500' },
            { range: '5～10万円', color: 'bg-red-500' },
            { range: '10万円～', color: 'bg-purple-500' }
          ].map(({ range, color }) => (
            <div key={range} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${color}`}></div>
              <span className="text-xs">{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ホテル数表示 */}
      <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-lg shadow-md z-10">
        <span className="text-sm">
          ホテル: <span className="font-semibold">{mapHotels.length}</span>件
        </span>
      </div>
    </div>
  );
};