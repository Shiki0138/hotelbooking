import { APIClient } from './api/apiClient';

// Google Maps Service with comprehensive integration
export class GoogleMapsService {
  private static instance: GoogleMapsService;
  private apiKey: string;
  private map: google.maps.Map | null = null;
  private markers: google.maps.Marker[] = [];
  private infoWindows: google.maps.InfoWindow[] = [];
  private geocoder: google.maps.Geocoder | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;
  private apiClient: APIClient;

  private constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    this.apiClient = new APIClient();
  }

  public static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  // Initialize Google Maps API
  public async initializeGoogleMaps(): Promise<void> {
    if (typeof window.google !== 'undefined') {
      return; // Already loaded
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,geometry,drawing&callback=initMap`;
      script.async = true;
      script.defer = true;

      window.initMap = () => {
        this.geocoder = new google.maps.Geocoder();
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });
  }

  // Create map instance
  public createMap(element: HTMLElement, options: google.maps.MapOptions): google.maps.Map {
    const defaultOptions: google.maps.MapOptions = {
      zoom: 13,
      center: { lat: 35.6762, lng: 139.6503 }, // Tokyo default
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: this.getCustomMapStyles(),
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: true,
      rotateControl: false,
      fullscreenControl: true
    };

    this.map = new google.maps.Map(element, {
      ...defaultOptions,
      ...options
    });

    // Initialize places service
    this.placesService = new google.maps.places.PlacesService(this.map);
    
    // Initialize directions
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      draggable: true
    });
    this.directionsRenderer.setMap(this.map);

    return this.map;
  }

  // Add hotel markers to map
  public addHotelMarkers(hotels: Hotel[], onMarkerClick?: (hotel: Hotel) => void): void {
    if (!this.map) return;

    // Clear existing markers
    this.clearMarkers();

    hotels.forEach((hotel, index) => {
      if (!hotel.location?.lat || !hotel.location?.lng) return;

      const marker = new google.maps.Marker({
        position: { lat: hotel.location.lat, lng: hotel.location.lng },
        map: this.map,
        title: hotel.name,
        icon: this.createCustomMarkerIcon(hotel),
        animation: google.maps.Animation.DROP
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: this.createInfoWindowContent(hotel)
      });

      marker.addListener('click', () => {
        // Close all open info windows
        this.infoWindows.forEach(iw => iw.close());
        
        // Open clicked info window
        infoWindow.open(this.map, marker);
        
        // Execute callback
        if (onMarkerClick) {
          onMarkerClick(hotel);
        }
      });

      // Hover effects
      marker.addListener('mouseover', () => {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 750);
      });

      this.markers.push(marker);
      this.infoWindows.push(infoWindow);
    });

    // Fit map to show all markers
    this.fitMapToMarkers();
  }

  // Geocoding service
  public async geocodeAddress(address: string): Promise<google.maps.LatLng | null> {
    if (!this.geocoder) {
      await this.initializeGoogleMaps();
      this.geocoder = new google.maps.Geocoder();
    }

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0].geometry.location);
        } else {
          console.error('Geocoding failed:', status);
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  // Reverse geocoding
  public async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.geocoder) {
      await this.initializeGoogleMaps();
      this.geocoder = new google.maps.Geocoder();
    }

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            console.error('Reverse geocoding failed:', status);
            reject(new Error(`Reverse geocoding failed: ${status}`));
          }
        }
      );
    });
  }

  // Places search
  public async searchNearbyPlaces(
    center: google.maps.LatLng,
    radius: number,
    type: string
  ): Promise<google.maps.places.PlaceResult[]> {
    if (!this.placesService) {
      throw new Error('Places service not initialized');
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.PlaceSearchRequest = {
        location: center,
        radius,
        type: type as any
      };

      this.placesService!.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          console.error('Places search failed:', status);
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  // Directions service
  public async getDirections(
    origin: google.maps.LatLng | string,
    destination: google.maps.LatLng | string,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
  ): Promise<google.maps.DirectionsResult> {
    if (!this.directionsService) {
      throw new Error('Directions service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.directionsService!.route(
        {
          origin,
          destination,
          travelMode,
          avoidHighways: false,
          avoidTolls: false
        },
        (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            console.error('Directions request failed:', status);
            reject(new Error(`Directions request failed: ${status}`));
          }
        }
      );
    });
  }

  // Display directions on map
  public displayDirections(result: google.maps.DirectionsResult): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections(result);
    }
  }

  // Clear all markers
  public clearMarkers(): void {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
    this.infoWindows.forEach(iw => iw.close());
    this.infoWindows = [];
  }

  // Fit map to show all markers
  private fitMapToMarkers(): void {
    if (!this.map || this.markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach(marker => {
      if (marker.getPosition()) {
        bounds.extend(marker.getPosition()!);
      }
    });

    this.map.fitBounds(bounds);

    // Ensure minimum zoom level
    google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
      if (this.map!.getZoom()! > 15) {
        this.map!.setZoom(15);
      }
    });
  }

  // Create custom marker icon
  private createCustomMarkerIcon(hotel: Hotel): google.maps.Icon {
    const baseUrl = '/images/markers/';
    let iconUrl = `${baseUrl}hotel-marker.png`;

    // Custom icons based on hotel properties
    if (hotel.rating >= 4.5) {
      iconUrl = `${baseUrl}luxury-hotel-marker.png`;
    } else if (hotel.price && hotel.price < 10000) {
      iconUrl = `${baseUrl}budget-hotel-marker.png`;
    }

    return {
      url: iconUrl,
      scaledSize: new google.maps.Size(32, 32),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(16, 32)
    };
  }

  // Create info window content
  private createInfoWindowContent(hotel: Hotel): string {
    return `
      <div class="hotel-info-window">
        <div class="info-header">
          <h3>${hotel.name}</h3>
          <div class="rating">
            ${'★'.repeat(Math.floor(hotel.rating || 0))}
            <span>${hotel.rating}</span>
          </div>
        </div>
        <div class="info-body">
          ${hotel.image ? `<img src="${hotel.image}" alt="${hotel.name}" style="width: 200px; height: 120px; object-fit: cover; border-radius: 8px;" />` : ''}
          <p class="address">${hotel.address || 'Address not available'}</p>
          ${hotel.price ? `<p class="price">¥${hotel.price.toLocaleString()}/泊</p>` : ''}
          <div class="info-actions">
            <button onclick="window.open('/hotels/${hotel.id}', '_blank')" class="view-details-btn">
              詳細を見る
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Custom map styles for branding
  private getCustomMapStyles(): google.maps.MapTypeStyle[] {
    return [
      {
        featureType: 'all',
        elementType: 'geometry.fill',
        stylers: [{ weight: '2.00' }]
      },
      {
        featureType: 'all',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#9c9c9c' }]
      },
      {
        featureType: 'all',
        elementType: 'labels.text',
        stylers: [{ visibility: 'on' }]
      },
      {
        featureType: 'landscape',
        elementType: 'all',
        stylers: [{ color: '#f2f2f2' }]
      },
      {
        featureType: 'landscape.man_made',
        elementType: 'geometry.fill',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'poi.business',
        elementType: 'all',
        stylers: [{ visibility: 'on' }]
      },
      {
        featureType: 'poi.medical',
        elementType: 'geometry',
        stylers: [{ color: '#fbd3da' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#bde6ab' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.fill',
        stylers: [{ color: '#ffe15f' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#efd151' }]
      },
      {
        featureType: 'road.arterial',
        elementType: 'geometry.fill',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'road.local',
        elementType: 'geometry.fill',
        stylers: [{ color: 'black' }]
      },
      {
        featureType: 'transit.station.airport',
        elementType: 'geometry.fill',
        stylers: [{ color: '#cfb2db' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#a2daf2' }]
      }
    ];
  }

  // Get current location
  public getCurrentLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Set map center to user location
  public async centerMapOnUserLocation(): Promise<void> {
    if (!this.map) return;

    try {
      const position = await this.getCurrentLocation();
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      this.map.setCenter(userLocation);
      this.map.setZoom(15);

      // Add user location marker
      new google.maps.Marker({
        position: userLocation,
        map: this.map,
        title: 'Your Location',
        icon: {
          url: '/images/markers/user-location.png',
          scaledSize: new google.maps.Size(24, 24)
        }
      });
    } catch (error) {
      console.error('Failed to get user location:', error);
      throw error;
    }
  }

  // Generate static map URL
  public generateStaticMapUrl(
    center: { lat: number; lng: number },
    zoom: number = 15,
    size: string = '400x300',
    markers?: { lat: number; lng: number; label?: string }[]
  ): string {
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams({
      center: `${center.lat},${center.lng}`,
      zoom: zoom.toString(),
      size,
      maptype: 'roadmap',
      key: this.apiKey
    });

    if (markers && markers.length > 0) {
      markers.forEach((marker, index) => {
        const markerParam = `color:red|label:${marker.label || (index + 1)}|${marker.lat},${marker.lng}`;
        params.append('markers', markerParam);
      });
    }

    return `${baseUrl}?${params.toString()}`;
  }
}

// Types
export interface Hotel {
  id: string;
  name: string;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  rating?: number;
  price?: number;
  image?: string;
}

// Export singleton instance
export const googleMapsService = GoogleMapsService.getInstance();

export default googleMapsService;