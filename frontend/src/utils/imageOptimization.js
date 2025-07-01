/**
 * Image Optimization Utilities
 * Provides advanced image optimization features for the LazyImage component
 */

// Image CDN configuration
const IMAGE_CDN_CONFIG = {
  cloudinary: {
    baseUrl: 'https://res.cloudinary.com',
    transformations: {
      quality: 'q_',
      width: 'w_',
      height: 'h_',
      format: 'f_',
      dpr: 'dpr_',
      blur: 'e_blur:',
      progressive: 'fl_progressive',
      optimize: 'q_auto,f_auto'
    }
  },
  imgix: {
    baseUrl: 'https://example.imgix.net',
    transformations: {
      quality: 'q=',
      width: 'w=',
      height: 'h=',
      format: 'fm=',
      dpr: 'dpr=',
      blur: 'blur=',
      auto: 'auto=format,compress'
    }
  }
};

// Device pixel ratio detection
export const getDevicePixelRatio = () => {
  return window.devicePixelRatio || 1;
};

// Network speed detection
export const getNetworkSpeed = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return 'unknown';
  
  // Return effective type (slow-2g, 2g, 3g, 4g)
  return connection.effectiveType || 'unknown';
};

// Save-Data header detection
export const isSaveDataEnabled = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return connection?.saveData || false;
};

// Generate optimized image URL based on conditions
export const generateOptimizedImageUrl = (originalUrl, options = {}) => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    blur = false,
    lowQuality = false,
    cdn = 'cloudinary'
  } = options;

  // Detect optimal settings
  const dpr = getDevicePixelRatio();
  const networkSpeed = getNetworkSpeed();
  const saveData = isSaveDataEnabled();

  // Adjust quality based on network conditions
  let finalQuality = quality;
  if (quality === 'auto') {
    if (saveData || networkSpeed === 'slow-2g' || networkSpeed === '2g') {
      finalQuality = lowQuality ? 10 : 60;
    } else if (networkSpeed === '3g') {
      finalQuality = lowQuality ? 20 : 75;
    } else {
      finalQuality = lowQuality ? 30 : 85;
    }
  }

  // Build transformation string based on CDN
  if (cdn === 'cloudinary' && originalUrl.includes('cloudinary')) {
    const transformations = [];
    
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    transformations.push(`q_${finalQuality}`);
    if (format === 'auto') transformations.push('f_auto');
    else if (format) transformations.push(`f_${format}`);
    if (dpr > 1 && !saveData) transformations.push(`dpr_${Math.min(dpr, 2)}`);
    if (blur) transformations.push(`e_blur:${blur}`);
    transformations.push('c_fill');
    transformations.push('g_auto');
    
    // Insert transformations into URL
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/${transformations.join(',')}/${urlParts[1]}`;
    }
  }

  // Fallback: append query parameters
  const url = new URL(originalUrl);
  if (width) url.searchParams.set('w', width);
  if (height) url.searchParams.set('h', height);
  url.searchParams.set('q', finalQuality);
  if (format !== 'auto') url.searchParams.set('fm', format);
  if (blur) url.searchParams.set('blur', blur);
  
  return url.toString();
};

// Generate srcSet for responsive images
export const generateSrcSet = (baseUrl, sizes = [400, 800, 1200, 1600, 2400]) => {
  const dpr = getDevicePixelRatio();
  const saveData = isSaveDataEnabled();
  
  // Reduce sizes if save data is enabled
  const finalSizes = saveData ? sizes.filter(size => size <= 1200) : sizes;
  
  return finalSizes
    .map(size => {
      const url = generateOptimizedImageUrl(baseUrl, { width: size });
      return `${url} ${size}w`;
    })
    .join(', ');
};

// Generate sizes attribute for responsive images
export const generateSizes = (breakpoints = {}) => {
  const defaultBreakpoints = {
    mobile: '(max-width: 640px) 100vw',
    tablet: '(max-width: 1024px) 50vw',
    desktop: '33vw'
  };
  
  const merged = { ...defaultBreakpoints, ...breakpoints };
  
  return Object.entries(merged)
    .map(([key, value]) => value)
    .join(', ');
};

// Preload critical images
export const preloadCriticalImages = (images) => {
  images.forEach(({ src, srcSet, sizes, as = 'image' }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = as;
    link.href = src;
    
    if (srcSet) {
      link.imageSrcset = srcSet;
    }
    
    if (sizes) {
      link.imageSizes = sizes;
    }
    
    // Set high priority for LCP images
    link.fetchpriority = 'high';
    
    document.head.appendChild(link);
  });
};

// Generate blur data URL for placeholder
export const generateBlurDataUrl = async (imageSrc, width = 40, height = 30) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.filter = 'blur(5px)';
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.3));
    };
    
    img.onerror = () => {
      // Return a default gray placeholder on error
      resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+');
    };
    
    img.src = generateOptimizedImageUrl(imageSrc, { 
      width: width * 2, 
      quality: 30,
      blur: 20
    });
  });
};

// LQIP (Low Quality Image Placeholder) generator
export const generateLQIP = async (imageSrc) => {
  const lqipUrl = generateOptimizedImageUrl(imageSrc, {
    width: 40,
    quality: 10,
    blur: 5
  });
  
  return lqipUrl;
};

// Image format detection and optimization
export const getOptimalImageFormat = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  
  // Check WebP support
  const webpData = canvas.toDataURL('image/webp');
  const hasWebP = webpData.indexOf('image/webp') === 5;
  
  // Check AVIF support (modern browsers)
  const checkAVIF = () => {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = () => resolve(true);
      avif.onerror = () => resolve(false);
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=';
    });
  };
  
  return {
    webp: hasWebP,
    avif: false, // Set to false for now, can be enabled with checkAVIF()
    jpeg: true,
    png: true
  };
};

// Calculate optimal image dimensions based on container
export const calculateOptimalDimensions = (container, aspectRatio = 16/9) => {
  if (!container) return { width: 800, height: 600 };
  
  const containerWidth = container.offsetWidth;
  const dpr = getDevicePixelRatio();
  const saveData = isSaveDataEnabled();
  
  // Adjust for DPR but cap at 2x for performance
  const multiplier = saveData ? 1 : Math.min(dpr, 2);
  
  const width = Math.round(containerWidth * multiplier);
  const height = Math.round(width / aspectRatio);
  
  return { width, height };
};

// Lazy load images in viewport
export const lazyLoadImagesInViewport = (selector = 'img[data-lazy]', options = {}) => {
  const images = document.querySelectorAll(selector);
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        const srcSet = img.dataset.srcset;
        
        if (src) img.src = src;
        if (srcSet) img.srcset = srcSet;
        
        img.classList.add('loaded');
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: options.rootMargin || '50px',
    threshold: options.threshold || 0.1
  });
  
  images.forEach(img => imageObserver.observe(img));
  
  return imageObserver;
};

export default {
  generateOptimizedImageUrl,
  generateSrcSet,
  generateSizes,
  preloadCriticalImages,
  generateBlurDataUrl,
  generateLQIP,
  getOptimalImageFormat,
  calculateOptimalDimensions,
  lazyLoadImagesInViewport,
  getDevicePixelRatio,
  getNetworkSpeed,
  isSaveDataEnabled
};