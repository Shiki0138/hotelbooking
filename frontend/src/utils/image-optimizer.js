// Image optimization utilities for performance improvement
import React from 'react';
import { CDNUrlBuilder } from '../../cdn-config.js';

const cdnBuilder = new CDNUrlBuilder();

// Lazy loading with Intersection Observer
class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.01,
      ...options
    };
    
    this.imageObserver = null;
    this.init();
  }
  
  init() {
    if ('IntersectionObserver' in window) {
      this.imageObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        this.options
      );
    }
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.imageObserver.unobserve(entry.target);
      }
    });
  }
  
  loadImage(img) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;
    
    if (src) {
      // Create a new image to preload
      const tempImg = new Image();
      
      tempImg.onload = () => {
        img.src = src;
        if (srcset) {
          img.srcset = srcset;
        }
        img.classList.add('loaded');
        
        // Trigger custom event
        img.dispatchEvent(new CustomEvent('lazyloaded'));
      };
      
      tempImg.src = src;
    }
  }
  
  observe(img) {
    if (this.imageObserver) {
      this.imageObserver.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img);
    }
  }
  
  // Observe all images with data-src
  observeAll(container = document) {
    const images = container.querySelectorAll('img[data-src]');
    images.forEach(img => this.observe(img));
  }
}

// Progressive image loading
class ProgressiveImageLoader {
  constructor(img, options = {}) {
    this.img = img;
    this.options = {
      blurRadius: 20,
      transitionDuration: 400,
      ...options
    };
    
    this.loadImage();
  }
  
  loadImage() {
    const lowQualitySrc = this.img.dataset.lowsrc;
    const highQualitySrc = this.img.dataset.src || this.img.src;
    
    if (!lowQualitySrc) {
      // No progressive loading, just lazy load
      return;
    }
    
    // Load low quality first
    this.img.src = lowQualitySrc;
    this.img.style.filter = `blur(${this.options.blurRadius}px)`;
    this.img.style.transition = `filter ${this.options.transitionDuration}ms`;
    
    // Load high quality
    const highQualityImg = new Image();
    
    highQualityImg.onload = () => {
      this.img.src = highQualitySrc;
      this.img.style.filter = 'none';
      this.img.classList.add('progressive-loaded');
    };
    
    highQualityImg.src = highQualitySrc;
  }
}

// React component for optimized images
export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  preset = 'card',
  lazy = true,
  progressive = false,
  className = '',
  ...props
}) => {
  const imgRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!imgRef.current) return;
    
    if (lazy) {
      const lazyLoader = new LazyImageLoader();
      lazyLoader.observe(imgRef.current);
    }
    
    if (progressive) {
      new ProgressiveImageLoader(imgRef.current);
    }
  }, [lazy, progressive]);
  
  // Generate optimized URLs
  const optimizedSrc = cdnBuilder.getImageUrl(src, preset);
  const srcSet = cdnBuilder.getResponsiveSrcSet(src, preset);
  const lowQualitySrc = progressive 
    ? cdnBuilder.getImageUrl(src, 'thumbnail', { blur: 1000 }) 
    : null;
  
  // JSX moved to JSX file - this should be a React.createElement call
  return React.createElement('img', {
    ref: imgRef,
    className: `optimized-image ${className}`,
    alt: alt,
    width: width,
    height: height,
    'data-src': lazy ? optimizedSrc : undefined,
    'data-srcset': lazy ? srcSet : undefined,
    'data-lowsrc': lowQualitySrc,
    src: !lazy ? optimizedSrc : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
    srcSet: !lazy ? srcSet : undefined,
    loading: lazy ? 'lazy' : undefined,
    ...props
  });
};

// Picture component for art direction
export const OptimizedPicture = ({
  src,
  alt,
  sources = [],
  fallbackPreset = 'card',
  lazy = true,
  className = '',
  ...props
}) => {
  const pictureRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!lazy || !pictureRef.current) return;
    
    const lazyLoader = new LazyImageLoader();
    const img = pictureRef.current.querySelector('img');
    if (img) {
      lazyLoader.observe(img);
    }
  }, [lazy]);
  
  return React.createElement('picture', {
    ref: pictureRef,
    className: className
  }, [
    ...sources.map((source, index) => 
      React.createElement('source', {
        key: index,
        media: source.media,
        srcSet: lazy ? undefined : cdnBuilder.getImageUrl(src, source.preset),
        'data-srcset': lazy ? cdnBuilder.getImageUrl(src, source.preset) : undefined,
        type: source.type
      })
    ),
    React.createElement(OptimizedImage, {
      src: src,
      alt: alt,
      preset: fallbackPreset,
      lazy: lazy,
      ...props
    })
  ]);
};

// WebP support detection
export const supportsWebP = () => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('image/webp') === 0;
};

// AVIF support detection
export const supportsAVIF = () => {
  return new Promise(resolve => {
    const avif = new Image();
    avif.onload = () => resolve(true);
    avif.onerror = () => resolve(false);
    avif.src = 'data:image/avif;base64,AAAAHGZ0eXBtaWYxAAAAAG1pZjFhdmlmbWlhZgAAAPFtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAABEAAAQABAAAAAAEVAAEAAAAeAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAAGppcHJwAAAAS2lwY28AAAAUaXNwZQAAAAAAAAABAAAAAQAAABBwYXNwAAAAAQAAAAEAAAAVYXYxQ4EgAAAKBzgABpAQ0AIAAAAQcGl4aQAAAAADCAgIAAAAF2lwbWEAAAAAAAAAAQABBAECg4QAAAAmbWRhdAoHOAAGkBDQAjITFkAAAEgAAAB5TNw9UxdXU6F6oA==';
  });
};

// Image format selection based on browser support
export const getBestImageFormat = async () => {
  if (await supportsAVIF()) return 'avif';
  if (supportsWebP()) return 'webp';
  return 'jpeg';
};

// Preload critical images
export const preloadImages = (urls) => {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = cdnBuilder.getImageUrl(url, 'card');
    document.head.appendChild(link);
  });
};

// Initialize lazy loading on DOM ready
if (typeof window !== 'undefined') {
  const lazyImageLoader = new LazyImageLoader();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lazyImageLoader.observeAll();
    });
  } else {
    lazyImageLoader.observeAll();
  }
  
  // Re-observe on dynamic content
  const observer = new MutationObserver(() => {
    lazyImageLoader.observeAll();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Default export
export default {
  LazyImageLoader,
  ProgressiveImageLoader,
  OptimizedImage,
  OptimizedPicture,
  supportsWebP,
  supportsAVIF,
  getBestImageFormat,
  preloadImages
};