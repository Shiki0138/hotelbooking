import axios from 'axios';
import { cache } from '../cacheService';
import { logger } from '../../utils/logger';

interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  sunrise: number;
  sunset: number;
}

interface WeatherForecast {
  date: Date;
  temp: number;
  description: string;
  icon: string;
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private cacheTTL: number;

  constructor() {
    this.apiKey = process.env.OPENWEATHERMAP_API_KEY || '';
    this.cacheTTL = parseInt(process.env.API_CACHE_TTL_WEATHER || '300');
  }

  async getCurrentWeather(lat: number, lon: number, lang: string = 'en'): Promise<WeatherData | null> {
    const cacheKey = `weather:current:${lat}:${lon}:${lang}`;
    
    try {
      // Check cache first
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        logger.info('Weather data retrieved from cache');
        return cached;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          lang
        },
        timeout: 5000
      });

      const data = response.data;
      const weatherData: WeatherData = {
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        description: data.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure,
        sunrise: data.sys.sunrise * 1000,
        sunset: data.sys.sunset * 1000
      };

      // Cache the result
      await cache.set(cacheKey, weatherData, this.cacheTTL);
      
      return weatherData;
    } catch (error) {
      logger.error('Error fetching weather data:', error);
      return null;
    }
  }

  async getWeatherForecast(lat: number, lon: number, days: number = 5, lang: string = 'en'): Promise<WeatherForecast[]> {
    const cacheKey = `weather:forecast:${lat}:${lon}:${days}:${lang}`;
    
    try {
      // Check cache first
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        logger.info('Weather forecast retrieved from cache');
        return cached;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          lang,
          cnt: days * 8 // 8 forecasts per day (3-hour intervals)
        },
        timeout: 5000
      });

      // Group by day and get daily summary
      const dailyForecasts = new Map<string, any[]>();
      
      response.data.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!dailyForecasts.has(date)) {
          dailyForecasts.set(date, []);
        }
        dailyForecasts.get(date)!.push(item);
      });

      const forecasts: WeatherForecast[] = [];
      let count = 0;
      
      dailyForecasts.forEach((dayData, dateStr) => {
        if (count >= days) return;
        
        // Get the midday forecast or the first available
        const middayForecast = dayData.find(d => {
          const hour = new Date(d.dt * 1000).getHours();
          return hour >= 11 && hour <= 13;
        }) || dayData[0];

        forecasts.push({
          date: new Date(dateStr),
          temp: Math.round(middayForecast.main.temp),
          description: middayForecast.weather[0].description,
          icon: `https://openweathermap.org/img/wn/${middayForecast.weather[0].icon}@2x.png`
        });
        
        count++;
      });

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(forecasts), this.cacheTTL);
      
      return forecasts;
    } catch (error) {
      logger.error('Error fetching weather forecast:', error);
      return [];
    }
  }
}

export const weatherService = new WeatherService();