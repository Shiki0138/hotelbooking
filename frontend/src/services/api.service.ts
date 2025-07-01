import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../config/api.config';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(API_CONFIG.endpoints.auth.refresh, {
            refreshToken
          });
          
          const { accessToken } = response.data;
          localStorage.setItem('authToken', accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Generic request wrapper
const makeRequest = async <T>(
  method: string,
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient.request({
      method,
      url,
      data,
      ...config
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// API Service methods
export const apiService = {
  // Generic methods
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    makeRequest<T>('GET', url, undefined, config),
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    makeRequest<T>('POST', url, data, config),
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    makeRequest<T>('PUT', url, data, config),
  
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    makeRequest<T>('PATCH', url, data, config),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    makeRequest<T>('DELETE', url, undefined, config),

  // Auth methods
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiService.post(API_CONFIG.endpoints.auth.login, credentials),
    
    signup: (userData: any) =>
      apiService.post(API_CONFIG.endpoints.auth.signup, userData),
    
    logout: () =>
      apiService.post(API_CONFIG.endpoints.auth.logout),
    
    getProfile: () =>
      apiService.get(API_CONFIG.endpoints.auth.profile)
  },

  // Hotel methods
  hotels: {
    list: (params?: any) =>
      apiService.get(API_CONFIG.endpoints.hotels.list, { params }),
    
    getById: (id: string) =>
      apiService.get(API_CONFIG.endpoints.hotels.detail(id)),
    
    search: (searchParams: any) =>
      apiService.post(API_CONFIG.endpoints.hotels.search, searchParams),
    
    autocomplete: (query: string) =>
      apiService.get(API_CONFIG.endpoints.hotels.autocomplete, { 
        params: { q: query } 
      })
  },

  // Booking methods
  bookings: {
    create: (bookingData: any) =>
      apiService.post(API_CONFIG.endpoints.bookings.create, bookingData),
    
    list: (params?: any) =>
      apiService.get(API_CONFIG.endpoints.bookings.list, { params }),
    
    getById: (id: string) =>
      apiService.get(API_CONFIG.endpoints.bookings.detail(id)),
    
    cancel: (id: string) =>
      apiService.post(API_CONFIG.endpoints.bookings.cancel(id))
  },

  // Room methods
  rooms: {
    listByHotel: (hotelId: string) =>
      apiService.get(API_CONFIG.endpoints.rooms.list(hotelId)),
    
    getById: (roomId: string) =>
      apiService.get(API_CONFIG.endpoints.rooms.detail(roomId)),
    
    checkAvailability: (params: any) =>
      apiService.post(API_CONFIG.endpoints.rooms.availability, params)
  }
};

export default apiService;