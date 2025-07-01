// Directions and routing service
import mapboxgl from 'mapbox-gl';
import axios from 'axios';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || 'your-mapbox-token';

export class DirectionsService {
  constructor() {
    this.cache = new Map();
  }

  // Get directions between two points
  async getDirections(origin, destination, mode = 'walking') {
    const cacheKey = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}-${mode}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
      return cached.data;
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${mode}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
        {
          params: {
            access_token: MAPBOX_TOKEN,
            geometries: 'geojson',
            language: 'ja',
            alternatives: true,
            steps: true,
            overview: 'full'
          }
        }
      );

      const routes = response.data.routes.map(route => ({
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        steps: this.parseSteps(route.legs[0].steps),
        mode: mode
      }));

      const result = {
        routes,
        origin,
        destination,
        mode
      };

      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Directions API error:', error);
      throw error;
    }
  }

  // Parse navigation steps
  parseSteps(steps) {
    return steps.map(step => ({
      instruction: step.maneuver.instruction,
      distance: step.distance,
      duration: step.duration,
      name: step.name,
      mode: step.mode,
      maneuver: {
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        bearing: step.maneuver.bearing_after
      }
    }));
  }

  // Get multi-modal directions (train + walking)
  async getMultiModalDirections(origin, destination) {
    try {
      // First, find nearest stations
      const [originStation, destStation] = await Promise.all([
        this.findNearestStation(origin),
        this.findNearestStation(destination)
      ]);

      // Get walking directions to/from stations
      const [walkToStation, walkFromStation] = await Promise.all([
        this.getDirections(origin, originStation, 'walking'),
        this.getDirections(destStation, destination, 'walking')
      ]);

      // Get train route (mock for now)
      const trainRoute = await this.getTrainRoute(originStation, destStation);

      return {
        segments: [
          {
            type: 'walking',
            from: origin,
            to: originStation,
            ...walkToStation.routes[0]
          },
          {
            type: 'train',
            from: originStation,
            to: destStation,
            ...trainRoute
          },
          {
            type: 'walking',
            from: destStation,
            to: destination,
            ...walkFromStation.routes[0]
          }
        ],
        totalDistance: walkToStation.routes[0].distance + trainRoute.distance + walkFromStation.routes[0].distance,
        totalDuration: walkToStation.routes[0].duration + trainRoute.duration + walkFromStation.routes[0].duration
      };
    } catch (error) {
      console.error('Multi-modal directions error:', error);
      // Fallback to walking directions
      return this.getDirections(origin, destination, 'walking');
    }
  }

  // Find nearest train station
  async findNearestStation(location) {
    // This would use a real API in production
    // For now, return a mock station
    return {
      name: '最寄り駅',
      lat: location.lat + 0.005,
      lng: location.lng + 0.005
    };
  }

  // Get train route between stations
  async getTrainRoute(fromStation, toStation) {
    // Mock train route data
    return {
      lines: ['JR山手線'],
      stations: 3,
      duration: 600, // 10 minutes
      distance: 5000, // 5km
      fare: 170,
      transfers: 0
    };
  }

  // Calculate isochrone (reachable area within time)
  async getIsochrone(center, minutes = 15, mode = 'walking') {
    try {
      const response = await axios.get(
        `https://api.mapbox.com/isochrone/v1/mapbox/${mode}/${center.lng},${center.lat}`,
        {
          params: {
            access_token: MAPBOX_TOKEN,
            contours_minutes: minutes,
            polygons: true,
            denoise: 1,
            generalize: 50
          }
        }
      );

      return response.data.features[0];
    } catch (error) {
      console.error('Isochrone API error:', error);
      return null;
    }
  }

  // Format duration for display
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  }

  // Format distance for display
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  // Get travel time matrix between multiple points
  async getTravelTimeMatrix(origins, destinations, mode = 'walking') {
    const coordinates = [...origins, ...destinations];
    const sources = origins.map((_, i) => i);
    const destinations_indices = destinations.map((_, i) => origins.length + i);

    try {
      const response = await axios.get(
        `https://api.mapbox.com/directions-matrix/v1/mapbox/${mode}/${coordinates.map(c => `${c.lng},${c.lat}`).join(';')}`,
        {
          params: {
            access_token: MAPBOX_TOKEN,
            sources: sources.join(';'),
            destinations: destinations_indices.join(';')
          }
        }
      );

      return response.data.durations;
    } catch (error) {
      console.error('Matrix API error:', error);
      return null;
    }
  }
}

// React hook for directions
export const useDirections = (origin, destination, mode = 'walking') => {
  const [directions, setDirections] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!origin || !destination) return;

    const service = new DirectionsService();
    
    const fetchDirections = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await service.getDirections(origin, destination, mode);
        setDirections(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDirections();
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, mode]);

  return { directions, loading, error };
};

// Singleton instance
export const directionsService = new DirectionsService();