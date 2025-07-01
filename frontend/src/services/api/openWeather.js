// OpenWeather API Integration
class OpenWeatherAPI {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5';
    this.geocodingURL = 'https://api.openweathermap.org/geo/1.0';
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  // Get current weather by coordinates
  async getCurrentWeather(latitude, longitude) {
    try {
      const cacheKey = `current_${latitude}_${longitude}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await fetch(
        `${this.baseURL}/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&lang=ja`
      );

      if (!response.ok) {
        throw new Error(`Weather API failed: ${response.status}`);
      }

      const data = await response.json();
      const formattedData = this.formatCurrentWeather(data);
      
      this.saveToCache(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('Current weather error:', error);
      return this.getFallbackCurrentWeather();
    }
  }

  // Get current weather by city name
  async getCurrentWeatherByCity(cityName) {
    try {
      const cacheKey = `current_city_${cityName}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await fetch(
        `${this.baseURL}/weather?q=${encodeURIComponent(cityName)}&appid=${this.apiKey}&units=metric&lang=ja`
      );

      if (!response.ok) {
        throw new Error(`Weather API failed: ${response.status}`);
      }

      const data = await response.json();
      const formattedData = this.formatCurrentWeather(data);
      
      this.saveToCache(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('Current weather by city error:', error);
      return this.getFallbackCurrentWeather();
    }
  }

  // Get 5-day weather forecast
  async getWeatherForecast(latitude, longitude) {
    try {
      const cacheKey = `forecast_${latitude}_${longitude}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await fetch(
        `${this.baseURL}/forecast?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&lang=ja`
      );

      if (!response.ok) {
        throw new Error(`Forecast API failed: ${response.status}`);
      }

      const data = await response.json();
      const formattedData = this.formatForecast(data);
      
      this.saveToCache(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('Weather forecast error:', error);
      return this.getFallbackForecast();
    }
  }

  // Get weather forecast by city
  async getWeatherForecastByCity(cityName) {
    try {
      const cacheKey = `forecast_city_${cityName}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await fetch(
        `${this.baseURL}/forecast?q=${encodeURIComponent(cityName)}&appid=${this.apiKey}&units=metric&lang=ja`
      );

      if (!response.ok) {
        throw new Error(`Forecast API failed: ${response.status}`);
      }

      const data = await response.json();
      const formattedData = this.formatForecast(data);
      
      this.saveToCache(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('Weather forecast by city error:', error);
      return this.getFallbackForecast();
    }
  }

  // Get air quality data
  async getAirQuality(latitude, longitude) {
    try {
      const cacheKey = `air_quality_${latitude}_${longitude}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await fetch(
        `${this.baseURL}/air_pollution?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Air quality API failed: ${response.status}`);
      }

      const data = await response.json();
      const formattedData = this.formatAirQuality(data);
      
      this.saveToCache(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('Air quality error:', error);
      return null;
    }
  }

  // Format current weather data
  formatCurrentWeather(data) {
    return {
      location: {
        name: data.name,
        country: data.sys.country,
        coordinates: {
          latitude: data.coord.lat,
          longitude: data.coord.lon
        }
      },
      current: {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        description: data.weather[0].description,
        main: data.weather[0].main,
        icon: data.weather[0].icon,
        iconUrl: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        windSpeed: data.wind?.speed || 0,
        windDirection: data.wind?.deg || 0,
        visibility: data.visibility ? data.visibility / 1000 : null, // Convert to km
        cloudiness: data.clouds.all,
        uvIndex: data.uvi || null
      },
      sun: {
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000)
      },
      timestamp: new Date(),
      source: 'OpenWeatherMap'
    };
  }

  // Format forecast data
  formatForecast(data) {
    const dailyForecasts = new Map();
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toDateString();
      
      if (!dailyForecasts.has(dateKey)) {
        dailyForecasts.set(dateKey, {
          date: date,
          temperatures: [],
          conditions: [],
          humidity: [],
          precipitation: 0,
          windSpeed: []
        });
      }
      
      const dayData = dailyForecasts.get(dateKey);
      dayData.temperatures.push(item.main.temp);
      dayData.conditions.push({
        main: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon
      });
      dayData.humidity.push(item.main.humidity);
      dayData.windSpeed.push(item.wind?.speed || 0);
      
      if (item.rain) {
        dayData.precipitation += item.rain['3h'] || 0;
      }
      if (item.snow) {
        dayData.precipitation += item.snow['3h'] || 0;
      }
    });

    const formattedDays = Array.from(dailyForecasts.values()).map(day => {
      const mostCommonCondition = this.getMostCommonCondition(day.conditions);
      
      return {
        date: day.date,
        temperature: {
          min: Math.round(Math.min(...day.temperatures)),
          max: Math.round(Math.max(...day.temperatures)),
          avg: Math.round(day.temperatures.reduce((a, b) => a + b, 0) / day.temperatures.length)
        },
        condition: mostCommonCondition,
        humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
        precipitation: Math.round(day.precipitation * 10) / 10,
        windSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length),
        iconUrl: `https://openweathermap.org/img/wn/${mostCommonCondition.icon}@2x.png`
      };
    });

    return {
      location: {
        name: data.city.name,
        country: data.city.country,
        coordinates: {
          latitude: data.city.coord.lat,
          longitude: data.city.coord.lon
        }
      },
      forecast: formattedDays.slice(0, 5), // 5-day forecast
      timestamp: new Date(),
      source: 'OpenWeatherMap'
    };
  }

  // Format air quality data
  formatAirQuality(data) {
    const aqi = data.list[0];
    const components = aqi.components;
    
    return {
      airQualityIndex: aqi.main.aqi,
      airQualityLevel: this.getAQILevel(aqi.main.aqi),
      components: {
        co: components.co,        // Carbon monoxide
        no: components.no,        // Nitric oxide
        no2: components.no2,      // Nitrogen dioxide
        o3: components.o3,        // Ozone
        so2: components.so2,      // Sulphur dioxide
        pm2_5: components.pm2_5,  // Fine particles matter
        pm10: components.pm10,    // Coarse particulate matter
        nh3: components.nh3       // Ammonia
      },
      timestamp: new Date(aqi.dt * 1000),
      source: 'OpenWeatherMap'
    };
  }

  // Get most common weather condition
  getMostCommonCondition(conditions) {
    const conditionCounts = {};
    conditions.forEach(condition => {
      const key = condition.main;
      conditionCounts[key] = (conditionCounts[key] || 0) + 1;
    });
    
    const mostCommon = Object.entries(conditionCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    return conditions.find(c => c.main === mostCommon);
  }

  // Get AQI level description
  getAQILevel(aqi) {
    const levels = {
      1: { level: '良い', description: '大気質は良好です', color: '#00e400' },
      2: { level: '普通', description: '大気質は普通です', color: '#ffff00' },
      3: { level: '悪い', description: '敏感な人は注意が必要です', color: '#ff7e00' },
      4: { level: 'とても悪い', description: '健康に影響があります', color: '#ff0000' },
      5: { level: '最悪', description: '緊急事態レベルです', color: '#8f3f97' }
    };
    
    return levels[aqi] || levels[1];
  }

  // Get weather alerts
  async getWeatherAlerts(latitude, longitude) {
    try {
      const response = await fetch(
        `${this.baseURL}/onecall?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&exclude=minutely,hourly&lang=ja`
      );

      if (!response.ok) {
        throw new Error(`Weather alerts API failed: ${response.status}`);
      }

      const data = await response.json();
      
      return data.alerts?.map(alert => ({
        event: alert.event,
        description: alert.description,
        start: new Date(alert.start * 1000),
        end: new Date(alert.end * 1000),
        severity: alert.tags || []
      })) || [];
    } catch (error) {
      console.error('Weather alerts error:', error);
      return [];
    }
  }

  // Get travel weather recommendations
  getTravelRecommendations(currentWeather, forecast) {
    const recommendations = [];
    
    // Temperature recommendations
    if (currentWeather.current.temperature < 10) {
      recommendations.push({
        type: 'clothing',
        message: '厚手のコートと防寒具をお忘れなく',
        icon: '🧥'
      });
    } else if (currentWeather.current.temperature > 30) {
      recommendations.push({
        type: 'clothing',
        message: '軽装と日焼け止めをご用意ください',
        icon: '🌞'
      });
    }
    
    // Precipitation recommendations
    const rainDays = forecast.forecast.filter(day => day.precipitation > 0).length;
    if (rainDays > 2) {
      recommendations.push({
        type: 'weather',
        message: '雨の日が多いため、傘をお持ちください',
        icon: '☔'
      });
    }
    
    // Activity recommendations
    const clearDays = forecast.forecast.filter(day => 
      day.condition.main === 'Clear'
    ).length;
    
    if (clearDays >= 3) {
      recommendations.push({
        type: 'activity',
        message: '晴れの日が多いため、屋外活動がおすすめです',
        icon: '🌅'
      });
    }
    
    return recommendations;
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  // Fallback data for demo
  getFallbackCurrentWeather() {
    return {
      location: {
        name: '東京',
        country: 'JP',
        coordinates: { latitude: 35.6762, longitude: 139.6503 }
      },
      current: {
        temperature: 22,
        feelsLike: 24,
        humidity: 65,
        pressure: 1013,
        description: '曇り',
        main: 'Clouds',
        icon: '04d',
        iconUrl: 'https://openweathermap.org/img/wn/04d@2x.png',
        windSpeed: 3.5,
        windDirection: 180,
        visibility: 10,
        cloudiness: 75
      },
      sun: {
        sunrise: new Date(),
        sunset: new Date()
      },
      timestamp: new Date(),
      source: 'Fallback'
    };
  }

  getFallbackForecast() {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      days.push({
        date: date,
        temperature: {
          min: 15 + Math.random() * 10,
          max: 25 + Math.random() * 10,
          avg: 20 + Math.random() * 10
        },
        condition: {
          main: 'Clear',
          description: '晴れ',
          icon: '01d'
        },
        humidity: 60 + Math.random() * 20,
        precipitation: Math.random() * 5,
        windSpeed: 2 + Math.random() * 8,
        iconUrl: 'https://openweathermap.org/img/wn/01d@2x.png'
      });
    }
    
    return {
      location: {
        name: '東京',
        country: 'JP',
        coordinates: { latitude: 35.6762, longitude: 139.6503 }
      },
      forecast: days,
      timestamp: new Date(),
      source: 'Fallback'
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export default new OpenWeatherAPI();