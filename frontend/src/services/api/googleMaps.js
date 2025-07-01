// Google Maps API Integration
class GoogleMapsAPI {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    this.baseURL = 'https://maps.googleapis.com/maps/api';
    this.isLoaded = false;
    this.loadPromise = null;
  }

  // Load Google Maps JavaScript API
  async loadGoogleMaps() {
    if (this.isLoaded) {
      return window.google;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve(window.google);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,geometry&language=ja`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isLoaded = true;
        resolve(window.google);
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // Geocoding: Convert address to coordinates
  async geocodeAddress(address) {
    try {
      const response = await fetch(
        `${this.baseURL}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}&language=ja`
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results.length) {
        throw new Error(`Geocoding failed: ${data.status}`);
      }

      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components,
        placeId: result.place_id,
        types: result.types
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Reverse Geocoding: Convert coordinates to address
  async reverseGeocode(latitude, longitude) {
    try {
      // APIキーがない場合はモックデータを返す
      if (!this.apiKey || this.apiKey === 'your_google_maps_api_key_here') {
        console.warn('Google Maps API key not configured, returning mock data');
        return [{
          formattedAddress: '東京都千代田区',
          addressComponents: [
            { long_name: '千代田区', short_name: '千代田区', types: ['locality'] },
            { long_name: '東京都', short_name: '東京都', types: ['administrative_area_level_1'] },
            { long_name: '日本', short_name: 'JP', types: ['country'] }
          ],
          placeId: 'mock_current_location',
          types: ['locality']
        }];
      }

      const response = await fetch(
        `${this.baseURL}/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}&language=ja`
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results.length) {
        throw new Error(`Reverse geocoding failed: ${data.status}`);
      }

      return data.results.map(result => ({
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components,
        placeId: result.place_id,
        types: result.types
      }));
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // エラーの場合もモックデータを返す
      return [{
        formattedAddress: '東京都千代田区',
        addressComponents: [
          { long_name: '千代田区', short_name: '千代田区', types: ['locality'] },
          { long_name: '東京都', short_name: '東京都', types: ['administrative_area_level_1'] },
          { long_name: '日本', short_name: 'JP', types: ['country'] }
        ],
        placeId: 'mock_current_location',
        types: ['locality']
      }];
    }
  }

  // Places Autocomplete
  async getPlacesSuggestions(input) {
    try {
      // APIキーがない場合はモックデータを返す
      if (!this.apiKey || this.apiKey === 'your_google_maps_api_key_here') {
        console.warn('Google Maps API key not configured, returning mock data');
        return this.getMockPlacesSuggestions(input);
      }

      const response = await fetch(
        `${this.baseURL}/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${this.apiKey}&language=ja&types=lodging|tourist_attraction|establishment`
      );

      if (!response.ok) {
        throw new Error(`Places autocomplete failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Places autocomplete failed: ${data.status}`);
      }

      return data.predictions.map(prediction => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
        types: prediction.types
      }));
    } catch (error) {
      console.error('Places autocomplete error:', error);
      // エラーの場合もモックデータを返す
      return this.getMockPlacesSuggestions(input);
    }
  }

  // モックデータを返すヘルパーメソッド
  getMockPlacesSuggestions(input) {
    const mockSuggestions = [
      {
        placeId: 'mock_tokyo_station',
        description: '東京駅, 東京都千代田区',
        mainText: '東京駅',
        secondaryText: '東京都千代田区',
        types: ['train_station', 'transit_station']
      },
      {
        placeId: 'mock_shinjuku',
        description: '新宿駅, 東京都新宿区',
        mainText: '新宿駅',
        secondaryText: '東京都新宿区',
        types: ['train_station', 'transit_station']
      },
      {
        placeId: 'mock_shibuya',
        description: '渋谷駅, 東京都渋谷区',
        mainText: '渋谷駅',
        secondaryText: '東京都渋谷区',
        types: ['train_station', 'transit_station']
      }
    ];

    // 入力に基づいてフィルタリング
    return mockSuggestions.filter(suggestion => 
      suggestion.mainText.toLowerCase().includes(input.toLowerCase()) ||
      suggestion.description.toLowerCase().includes(input.toLowerCase())
    );
  }

  // Get place details
  async getPlaceDetails(placeId) {
    try {
      // APIキーがない場合はモックデータを返す
      if (!this.apiKey || this.apiKey === 'your_google_maps_api_key_here') {
        console.warn('Google Maps API key not configured, returning mock data');
        return this.getMockPlaceDetails(placeId);
      }

      const response = await fetch(
        `${this.baseURL}/place/details/json?place_id=${placeId}&key=${this.apiKey}&language=ja&fields=name,formatted_address,geometry,photos,rating,reviews,types,website,formatted_phone_number`
      );

      if (!response.ok) {
        throw new Error(`Place details failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Place details failed: ${data.status}`);
      }

      const place = data.result;
      return {
        placeId: placeId,
        name: place.name,
        formattedAddress: place.formatted_address,
        location: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        },
        rating: place.rating,
        photos: place.photos?.map(photo => ({
          reference: photo.photo_reference,
          width: photo.width,
          height: photo.height,
          url: `${this.baseURL}/place/photo?photoreference=${photo.photo_reference}&maxwidth=800&key=${this.apiKey}`
        })) || [],
        reviews: place.reviews || [],
        types: place.types,
        website: place.website,
        phoneNumber: place.formatted_phone_number
      };
    } catch (error) {
      console.error('Place details error:', error);
      // エラーの場合もモックデータを返す
      return this.getMockPlaceDetails(placeId);
    }
  }

  // モックの場所詳細を返すヘルパーメソッド
  getMockPlaceDetails(placeId) {
    const mockDetails = {
      'mock_tokyo_station': {
        placeId: 'mock_tokyo_station',
        name: '東京駅',
        formattedAddress: '〒100-0005 東京都千代田区丸の内１丁目',
        location: {
          latitude: 35.6812,
          longitude: 139.7671
        },
        rating: 4.3,
        photos: [],
        reviews: [],
        types: ['train_station', 'transit_station'],
        website: 'https://www.jreast.co.jp/estation/station/info.aspx?StationCd=1039',
        phoneNumber: '050-2016-1600'
      },
      'mock_shinjuku': {
        placeId: 'mock_shinjuku',
        name: '新宿駅',
        formattedAddress: '〒160-0023 東京都新宿区西新宿',
        location: {
          latitude: 35.6896,
          longitude: 139.7006
        },
        rating: 4.1,
        photos: [],
        reviews: [],
        types: ['train_station', 'transit_station'],
        website: 'https://www.jreast.co.jp/',
        phoneNumber: '050-2016-1600'
      },
      'mock_shibuya': {
        placeId: 'mock_shibuya',
        name: '渋谷駅',
        formattedAddress: '〒150-0043 東京都渋谷区道玄坂１丁目',
        location: {
          latitude: 35.6580,
          longitude: 139.7016
        },
        rating: 4.2,
        photos: [],
        reviews: [],
        types: ['train_station', 'transit_station'],
        website: 'https://www.jreast.co.jp/',
        phoneNumber: '050-2016-1600'
      }
    };

    return mockDetails[placeId] || null;
  }

  // Find nearby places
  async findNearbyPlaces(latitude, longitude, radius = 5000, type = 'lodging') {
    try {
      const response = await fetch(
        `${this.baseURL}/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${this.apiKey}&language=ja`
      );

      if (!response.ok) {
        throw new Error(`Nearby search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Nearby search failed: ${data.status}`);
      }

      return data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        location: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        },
        rating: place.rating,
        priceLevel: place.price_level,
        photos: place.photos?.map(photo => ({
          reference: photo.photo_reference,
          url: `${this.baseURL}/place/photo?photoreference=${photo.photo_reference}&maxwidth=400&key=${this.apiKey}`
        })) || [],
        types: place.types,
        openNow: place.opening_hours?.open_now
      }));
    } catch (error) {
      console.error('Nearby search error:', error);
      return [];
    }
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Get directions between two points
  async getDirections(origin, destination, mode = 'DRIVING') {
    try {
      await this.loadGoogleMaps();
      
      return new Promise((resolve, reject) => {
        const directionsService = new window.google.maps.DirectionsService();
        
        directionsService.route({
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode[mode],
          language: 'ja'
        }, (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            resolve({
              routes: result.routes.map(route => ({
                summary: route.summary,
                distance: route.legs[0].distance,
                duration: route.legs[0].duration,
                steps: route.legs[0].steps.map(step => ({
                  instruction: step.instructions,
                  distance: step.distance,
                  duration: step.duration,
                  startLocation: step.start_location,
                  endLocation: step.end_location
                }))
              }))
            });
          } else {
            reject(new Error(`Directions failed: ${status}`));
          }
        });
      });
    } catch (error) {
      console.error('Directions error:', error);
      return null;
    }
  }

  // Create interactive map
  async createMap(containerId, options = {}) {
    try {
      await this.loadGoogleMaps();
      
      const defaultOptions = {
        zoom: 12,
        center: { lat: 35.6762, lng: 139.6503 }, // Tokyo
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        language: 'ja'
      };

      const mapOptions = { ...defaultOptions, ...options };
      const mapElement = document.getElementById(containerId);
      
      if (!mapElement) {
        throw new Error(`Map container element not found: ${containerId}`);
      }

      const map = new window.google.maps.Map(mapElement, mapOptions);
      
      return {
        map,
        addMarker: (position, options = {}) => {
          const marker = new window.google.maps.Marker({
            position,
            map,
            ...options
          });
          return marker;
        },
        addInfoWindow: (marker, content) => {
          const infoWindow = new window.google.maps.InfoWindow({
            content
          });
          
          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
          
          return infoWindow;
        },
        fitBounds: (bounds) => {
          map.fitBounds(bounds);
        },
        setCenter: (center) => {
          map.setCenter(center);
        },
        setZoom: (zoom) => {
          map.setZoom(zoom);
        }
      };
    } catch (error) {
      console.error('Map creation error:', error);
      return null;
    }
  }

  // Get current location
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
}

export default new GoogleMapsAPI();