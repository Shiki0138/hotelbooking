import axios from 'axios';
import { cache } from '../cacheService';
import { logger } from '../../utils/logger';

interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  description: string | null;
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
  links: {
    html: string;
  };
}

interface ImageData {
  url: string;
  thumbnailUrl: string;
  description: string;
  credit: string;
  creditUrl: string;
}

export class ImageService {
  private accessKey: string;
  private baseUrl = 'https://api.unsplash.com';
  private cacheTTL: number;

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
    this.cacheTTL = parseInt(process.env.API_CACHE_TTL_IMAGES || '3600');
  }

  async searchHotelImages(query: string, count: number = 5): Promise<ImageData[]> {
    const cacheKey = `images:hotel:${query}:${count}`;
    
    try {
      // Check cache first
      const cached = await cache.get<ImageData[]>(cacheKey);
      if (cached) {
        logger.info('Hotel images retrieved from cache');
        return cached;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`
        },
        params: {
          query: `${query} hotel`,
          per_page: count,
          orientation: 'landscape',
          content_filter: 'high'
        },
        timeout: 5000
      });

      const images: ImageData[] = response.data.results.map((img: UnsplashImage) => ({
        url: img.urls.regular,
        thumbnailUrl: img.urls.small,
        description: img.description || img.alt_description || 'Hotel image',
        credit: img.user.name,
        creditUrl: `${img.links.html}?utm_source=lastminutestay&utm_medium=referral`
      }));

      // Cache the result
      await cache.set(cacheKey, images, this.cacheTTL);
      
      return images;
    } catch (error) {
      logger.error('Error fetching hotel images:', error);
      return this.getFallbackImages();
    }
  }

  async getLocationImages(location: string, count: number = 3): Promise<ImageData[]> {
    const cacheKey = `images:location:${location}:${count}`;
    
    try {
      // Check cache first
      const cached = await cache.get<ImageData[]>(cacheKey);
      if (cached) {
        logger.info('Location images retrieved from cache');
        return cached;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`
        },
        params: {
          query: `${location} travel destination`,
          per_page: count,
          orientation: 'landscape',
          content_filter: 'high'
        },
        timeout: 5000
      });

      const images: ImageData[] = response.data.results.map((img: UnsplashImage) => ({
        url: img.urls.regular,
        thumbnailUrl: img.urls.small,
        description: img.description || img.alt_description || `${location} view`,
        credit: img.user.name,
        creditUrl: `${img.links.html}?utm_source=lastminutestay&utm_medium=referral`
      }));

      // Cache the result
      await cache.set(cacheKey, images, this.cacheTTL);
      
      return images;
    } catch (error) {
      logger.error('Error fetching location images:', error);
      return [];
    }
  }

  private getFallbackImages(): ImageData[] {
    // Fallback images using placeholder service
    return Array.from({ length: 5 }, (_, i) => ({
      url: `https://via.placeholder.com/800x600/4A5568/FFFFFF?text=Hotel+Image+${i + 1}`,
      thumbnailUrl: `https://via.placeholder.com/400x300/4A5568/FFFFFF?text=Hotel+${i + 1}`,
      description: 'Hotel image',
      credit: 'Placeholder',
      creditUrl: '#'
    }));
  }

  async getRandomHotelImage(): Promise<ImageData | null> {
    const cacheKey = 'images:random:hotel';
    
    try {
      // Check cache first
      const cached = await cache.get<ImageData>(cacheKey);
      if (cached) {
        logger.info('Random hotel image retrieved from cache');
        return cached;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`
        },
        params: {
          query: 'luxury hotel',
          orientation: 'landscape',
          content_filter: 'high'
        },
        timeout: 5000
      });

      const img = response.data;
      const image: ImageData = {
        url: img.urls.regular,
        thumbnailUrl: img.urls.small,
        description: img.description || img.alt_description || 'Luxury hotel',
        credit: img.user.name,
        creditUrl: `${img.links.html}?utm_source=lastminutestay&utm_medium=referral`
      };

      // Cache for shorter time for random images
      await cache.set(cacheKey, image, 300);
      
      return image;
    } catch (error) {
      logger.error('Error fetching random hotel image:', error);
      return null;
    }
  }
}

export const imageService = new ImageService();