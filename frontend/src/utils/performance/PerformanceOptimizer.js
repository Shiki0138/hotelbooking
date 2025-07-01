// Advanced performance optimization utilities
class PerformanceOptimizer {
  constructor() {
    this.metrics = {};
    this.observers = new Map();
    this.initializeObservers();
  }

  // Initialize performance observers
  initializeObservers() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
        this.reportMetric('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.metrics.fid = entry.processingStart - entry.startTime;
          this.reportMetric('FID', entry.processingStart - entry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.metrics.cls = clsValue;
        this.reportMetric('CLS', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      this.observers.set('lcp', lcpObserver);
      this.observers.set('fid', fidObserver);
      this.observers.set('cls', clsObserver);
    }
  }

  // Report metrics to analytics
  reportMetric(name, value) {
    console.log(`Performance Metric - ${name}: ${value}`);
    
    // Send to analytics service (example)
    if (window.gtag) {
      window.gtag('event', 'web_vital', {
        name: name,
        value: Math.round(value),
        event_category: 'Web Vitals',
        non_interaction: true
      });
    }
  }

  // Optimize images with intersection observer
  optimizeImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px'
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  // Preload critical resources
  preloadCriticalResources() {
    const criticalResources = [
      '/api/hotels/popular',
      '/api/user/preferences'
    ];

    criticalResources.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  // Bundle size optimization
  async loadChunkWhenNeeded(chunkName) {
    try {
      // Vite doesn't support dynamic imports with variables in the same way as Webpack
      // This is a placeholder implementation
      console.warn(`Dynamic chunk loading not implemented for: ${chunkName}`);
      return null;
    } catch (error) {
      console.error(`Failed to load chunk: ${chunkName}`, error);
      return null;
    }
  }

  // Memory leak prevention
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics = {};
  }

  // CPU usage monitoring
  monitorCPUUsage() {
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime > lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.reportMetric('FPS', fps);
        
        if (fps < 30) {
          console.warn('Low FPS detected, optimizing performance...');
          this.optimizeForLowPerformance();
        }
        
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  // Low performance optimization
  optimizeForLowPerformance() {
    // Reduce animation quality
    document.documentElement.style.setProperty('--animation-speed-fast', '0s');
    document.documentElement.style.setProperty('--animation-speed-normal', '0.1s');
    document.documentElement.style.setProperty('--animation-speed-slow', '0.2s');

    // Disable complex animations
    const complexAnimations = document.querySelectorAll('.complex-animation');
    complexAnimations.forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });

    // Reduce 3D effects
    const threeDElements = document.querySelectorAll('.hotel-room-3d, .panorama-viewer');
    threeDElements.forEach(el => {
      el.style.transform = 'none';
      el.style.perspective = 'none';
    });
  }

  // Service Worker registration
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Cache optimization
  setupCaching() {
    // Cache API responses
    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      const cacheKey = `cache_${url}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached && this.isCacheValid(cacheKey)) {
        return new Response(cached);
      }
      
      const response = await originalFetch(url, options);
      const clonedResponse = response.clone();
      
      if (response.ok) {
        const data = await clonedResponse.text();
        sessionStorage.setItem(cacheKey, data);
        sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }
      
      return response;
    };
  }

  isCacheValid(cacheKey) {
    const timestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
    if (!timestamp) return false;
    
    const cacheAge = Date.now() - parseInt(timestamp);
    return cacheAge < 5 * 60 * 1000; // 5 minutes
  }

  // Real-time performance dashboard
  createPerformanceDashboard() {
    if (process.env.NODE_ENV === 'development') {
      const dashboard = document.createElement('div');
      dashboard.id = 'performance-dashboard';
      dashboard.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        max-width: 200px;
      `;
      
      document.body.appendChild(dashboard);
      
      setInterval(() => {
        const { lcp, fid, cls } = this.metrics;
        dashboard.innerHTML = `
          <div>LCP: ${lcp ? Math.round(lcp) + 'ms' : 'measuring...'}</div>
          <div>FID: ${fid ? Math.round(fid) + 'ms' : 'measuring...'}</div>
          <div>CLS: ${cls ? cls.toFixed(3) : 'measuring...'}</div>
          <div>Memory: ${this.getMemoryUsage()}</div>
        `;
      }, 1000);
    }
  }

  getMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.totalJSHeapSize;
      return `${Math.round(used / 1048576)}MB / ${Math.round(total / 1048576)}MB`;
    }
    return 'N/A';
  }

  // Initialize all optimizations
  init() {
    this.optimizeImages();
    this.preloadCriticalResources();
    this.monitorCPUUsage();
    this.registerServiceWorker();
    this.setupCaching();
    this.createPerformanceDashboard();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }
}

// Export singleton instance
export default new PerformanceOptimizer();