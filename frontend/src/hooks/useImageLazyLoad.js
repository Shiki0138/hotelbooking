import { useEffect, useRef, useState, useCallback } from 'react';
import { getNetworkSpeed, isSaveDataEnabled } from '../utils/imageOptimization';

/**
 * Custom hook for implementing lazy loading with advanced features
 * @param {Object} options - Configuration options
 * @returns {Object} - Lazy loading state and refs
 */
export const useImageLazyLoad = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    onLoad,
    onError,
    onIntersect,
    loadingStrategy = 'auto'
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  // Determine loading strategy based on network conditions
  useEffect(() => {
    if (loadingStrategy === 'auto') {
      const networkSpeed = getNetworkSpeed();
      const saveData = isSaveDataEnabled();
      
      // Eagerly load on fast connections, lazy load on slow/save-data
      if (!saveData && (networkSpeed === '4g' || networkSpeed === 'unknown')) {
        setShouldLoad(true);
      }
    } else if (loadingStrategy === 'eager') {
      setShouldLoad(true);
    }
  }, [loadingStrategy]);

  // Set up Intersection Observer
  useEffect(() => {
    if (!elementRef.current || shouldLoad) {
      return;
    }

    const observerOptions = {
      threshold: Array.isArray(threshold) ? threshold : [threshold],
      rootMargin
    };

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            setShouldLoad(true);
            onIntersect?.(entry);
            observerRef.current?.disconnect();
          }
        });
      },
      observerOptions
    );

    observerRef.current.observe(elementRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, onIntersect, shouldLoad]);

  // Handle image loading
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoaded(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Preload image
  const preloadImage = useCallback((src) => {
    if (!src || !shouldLoad) return;

    const img = new Image();
    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;
  }, [shouldLoad, handleLoad, handleError]);

  return {
    elementRef,
    isIntersecting,
    isLoaded,
    hasError,
    shouldLoad,
    preloadImage,
    handleLoad,
    handleError
  };
};

/**
 * Hook for managing multiple lazy-loaded images
 */
export const useImageLazyLoadBatch = (images, options = {}) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [errorImages, setErrorImages] = useState(new Set());
  
  const handleImageLoad = useCallback((index) => {
    setLoadedImages(prev => new Set(prev).add(index));
  }, []);

  const handleImageError = useCallback((index) => {
    setErrorImages(prev => new Set(prev).add(index));
  }, []);

  const isAllLoaded = loadedImages.size + errorImages.size === images.length;
  const loadingProgress = ((loadedImages.size + errorImages.size) / images.length) * 100;

  return {
    loadedImages,
    errorImages,
    isAllLoaded,
    loadingProgress,
    handleImageLoad,
    handleImageError
  };
};

/**
 * Hook for progressive image loading
 */
export const useProgressiveImage = (lowQualitySrc, highQualitySrc) => {
  const [src, setSrc] = useState(lowQualitySrc);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!highQualitySrc) return;

    const img = new Image();
    img.onload = () => {
      setSrc(highQualitySrc);
      setIsLoading(false);
    };
    img.src = highQualitySrc;
  }, [highQualitySrc]);

  return { src, isLoading };
};

export default useImageLazyLoad;