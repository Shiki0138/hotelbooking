// CDN Configuration for static assets optimization
const CDN_CONFIG = {
  // CloudFront configuration
  cloudfront: {
    domain: import.meta.env.VITE_CDN_DOMAIN || 'https://d1234567890.cloudfront.net',
    enabled: import.meta.env.MODE === 'production',
    
    // Asset paths
    paths: {
      images: '/images',
      fonts: '/fonts',
      css: '/static/css',
      js: '/static/js',
      media: '/media'
    },
    
    // Cache control headers
    cacheControl: {
      images: 'public, max-age=31536000, immutable', // 1 year
      fonts: 'public, max-age=31536000, immutable',   // 1 year
      css: 'public, max-age=86400, must-revalidate',  // 1 day
      js: 'public, max-age=86400, must-revalidate',   // 1 day
      media: 'public, max-age=604800'                 // 1 week
    }
  },
  
  // Image CDN with on-the-fly optimization
  imageOptimization: {
    cloudinary: {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD || 'lastminutestay',
      apiKey: import.meta.env.VITE_CLOUDINARY_KEY,
      
      // Transformation presets
      presets: {
        thumbnail: 'w_150,h_150,c_fill,q_auto,f_auto',
        card: 'w_400,h_300,c_fill,q_auto,f_auto',
        hero: 'w_1920,h_600,c_fill,q_auto:best,f_auto',
        detail: 'w_800,h_600,c_fill,q_auto,f_auto',
        
        // Responsive transformations
        responsive: {
          mobile: 'w_400,c_fill,q_auto,f_auto',
          tablet: 'w_800,c_fill,q_auto,f_auto',
          desktop: 'w_1200,c_fill,q_auto,f_auto'
        }
      },
      
      // Auto format and quality
      defaults: {
        fetch_format: 'auto', // Automatically serve WebP/AVIF when supported
        quality: 'auto',      // Automatic quality adjustment
        dpr: 'auto'          // Device pixel ratio optimization
      }
    }
  },
  
  // Preload critical resources
  preload: {
    // Fonts are loaded from Google Fonts CDN - see index.html
    fonts: [
      // '/fonts/inter-var.woff2',
      // '/fonts/inter-400.woff2',
      // '/fonts/inter-600.woff2'
    ],
    
    criticalCSS: [
      // '/static/css/critical.css'
    ]
  },
  
  // Prefetch for improved navigation
  prefetch: {
    enabled: true,
    
    // Prefetch these routes on idle
    routes: [
      '/search',
      '/hotels',
      '/booking'
    ],
    
    // Prefetch strategy
    strategy: {
      maxPrefetchRequests: 3,
      prefetchOnHover: true,
      prefetchDelay: 200 // ms
    }
  }
};

// CDN URL builder
class CDNUrlBuilder {
  constructor(config = CDN_CONFIG) {
    this.config = config;
  }
  
  // Get CDN URL for static assets
  getAssetUrl(path, assetType = 'images') {
    if (!this.config.cloudfront.enabled) {
      return path;
    }
    
    const basePath = this.config.cloudfront.paths[assetType] || '';
    return `${this.config.cloudfront.domain}${basePath}${path}`;
  }
  
  // Get optimized image URL
  getImageUrl(publicId, preset = 'card', options = {}) {
    const { cloudinary } = this.config.imageOptimization;
    
    // Build transformation string
    let transformation = cloudinary.presets[preset] || preset;
    
    // Add additional transformations
    if (options.width) {
      transformation += `,w_${options.width}`;
    }
    if (options.height) {
      transformation += `,h_${options.height}`;
    }
    if (options.blur) {
      transformation += `,e_blur:${options.blur}`;
    }
    
    // Build Cloudinary URL
    return `https://res.cloudinary.com/${cloudinary.cloudName}/image/upload/${transformation}/${publicId}`;
  }
  
  // Get responsive image srcset
  getResponsiveSrcSet(publicId, basePreset = 'card') {
    const { responsive } = this.config.imageOptimization.cloudinary.presets;
    
    return Object.entries(responsive)
      .map(([size, transform]) => {
        const url = this.getImageUrl(publicId, transform);
        const width = transform.match(/w_(\d+)/)[1];
        return `${url} ${width}w`;
      })
      .join(', ');
  }
  
  // Preload critical resources
  injectPreloadLinks() {
    const head = document.head;
    
    // Preload fonts
    if (this.config.preload.fonts && this.config.preload.fonts.length > 0) {
      this.config.preload.fonts.forEach(font => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = this.getAssetUrl(font, 'fonts');
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        head.appendChild(link);
      });
    }
    
    // Preload critical CSS
    if (this.config.preload.criticalCSS && this.config.preload.criticalCSS.length > 0) {
      this.config.preload.criticalCSS.forEach(css => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = this.getAssetUrl(css, 'css');
        link.as = 'style';
        head.appendChild(link);
      });
    }
  }
  
  // Setup prefetch for navigation
  setupPrefetch() {
    if (!this.config.prefetch.enabled) return;
    
    const { routes, strategy } = this.config.prefetch;
    
    // Prefetch on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        routes.slice(0, strategy.maxPrefetchRequests).forEach(route => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = route;
          document.head.appendChild(link);
        });
      });
    }
    
    // Prefetch on hover
    if (strategy.prefetchOnHover) {
      document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a');
        if (!link || link.dataset.prefetched) return;
        
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('/')) return;
        
        setTimeout(() => {
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = href;
          document.head.appendChild(prefetchLink);
          link.dataset.prefetched = 'true';
        }, strategy.prefetchDelay);
      });
    }
  }
}

// Service Worker for advanced caching
const SERVICE_WORKER_CONFIG = {
  // Cache strategies
  cacheStrategies: {
    // Network first for API calls
    api: {
      strategy: 'network-first',
      cacheName: 'api-cache-v1',
      maxAge: 300, // 5 minutes
      maxEntries: 50
    },
    
    // Cache first for static assets
    static: {
      strategy: 'cache-first',
      cacheName: 'static-cache-v1',
      maxAge: 31536000, // 1 year
      maxEntries: 100
    },
    
    // Stale while revalidate for images
    images: {
      strategy: 'stale-while-revalidate',
      cacheName: 'image-cache-v1',
      maxAge: 604800, // 1 week
      maxEntries: 200
    }
  },
  
  // Offline fallback pages
  offlineFallback: {
    page: '/offline.html',
    image: '/images/offline-placeholder.svg'
  }
};

// Export configurations and utilities
export {
  CDN_CONFIG,
  CDNUrlBuilder,
  SERVICE_WORKER_CONFIG
};

// Auto-initialize on load
if (typeof window !== 'undefined') {
  const cdnBuilder = new CDNUrlBuilder();
  
  // Inject preload links
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      cdnBuilder.injectPreloadLinks();
      cdnBuilder.setupPrefetch();
    });
  } else {
    cdnBuilder.injectPreloadLinks();
    cdnBuilder.setupPrefetch();
  }
  
  // Export to window for global access
  window.CDN = cdnBuilder;
}

// Export for ES modules - removed duplicate export