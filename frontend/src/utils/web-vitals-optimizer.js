// Core Web Vitals optimization utilities
import { getCLS, getFID, getLCP, getTTFB, getFCP } from 'web-vitals';

// Performance monitoring and optimization
class WebVitalsOptimizer {
  constructor() {
    this.metrics = {
      LCP: null,  // Largest Contentful Paint
      FID: null,  // First Input Delay
      CLS: null,  // Cumulative Layout Shift
      TTFB: null, // Time to First Byte
      FCP: null   // First Contentful Paint
    };
    
    this.thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
      FCP: { good: 1800, poor: 3000 }
    };
    
    this.initializeMonitoring();
  }
  
  initializeMonitoring() {
    // Monitor Core Web Vitals
    getCLS(metric => this.handleMetric('CLS', metric));
    getFID(metric => this.handleMetric('FID', metric));
    getLCP(metric => this.handleMetric('LCP', metric));
    getTTFB(metric => this.handleMetric('TTFB', metric));
    getFCP(metric => this.handleMetric('FCP', metric));
    
    // Monitor long tasks
    this.observeLongTasks();
    
    // Monitor layout shifts
    this.observeLayoutShifts();
  }
  
  handleMetric(name, metric) {
    this.metrics[name] = metric.value;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const threshold = this.thresholds[name];
      const rating = metric.value <= threshold.good ? 'good' : 
                     metric.value <= threshold.poor ? 'needs improvement' : 'poor';
      
      console.log(`${name}: ${metric.value.toFixed(2)} (${rating})`, metric);
    }
    
    // Send to analytics
    this.sendToAnalytics(name, metric);
  }
  
  sendToAnalytics(name, metric) {
    // Send to Google Analytics or custom analytics
    if (window.gtag) {
      window.gtag('event', name, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
      });
    }
  }
  
  // Observe and log long tasks
  observeLongTasks() {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.error('Long task observer error:', e);
    }
  }
  
  // Monitor layout shifts
  observeLayoutShifts() {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            
            if (entry.value > 0.1) {
              console.warn('Large layout shift:', {
                value: entry.value,
                sources: entry.sources
              });
            }
          }
        }
      });
      
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.error('Layout shift observer error:', e);
    }
  }
}

// LCP Optimization: Preload critical resources
export const optimizeLCP = () => {
  // Preload hero images
  const heroImages = document.querySelectorAll('[data-hero-image]');
  heroImages.forEach(img => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = img.dataset.src || img.src;
    
    // Add fetchpriority for critical images
    if (img.dataset.priority === 'high') {
      link.fetchpriority = 'high';
    }
    
    document.head.appendChild(link);
  });
  
  // Preconnect to required origins
  const origins = [
    'https://fonts.googleapis.com',
    'https://res.cloudinary.com',
    process.env.REACT_APP_API_URL
  ];
  
  origins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// FID Optimization: Optimize JavaScript execution
export const optimizeFID = () => {
  // Use requestIdleCallback for non-critical tasks
  const deferredTasks = [];
  
  window.deferTask = (task) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(task, { timeout: 2000 });
    } else {
      deferredTasks.push(task);
    }
  };
  
  // Process deferred tasks when idle
  if (!('requestIdleCallback' in window)) {
    setTimeout(() => {
      deferredTasks.forEach(task => task());
    }, 1000);
  }
  
  // Break up long tasks
  window.yieldToMain = () => {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  };
  
  // Debounce expensive operations
  window.debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
};

// CLS Optimization: Prevent layout shifts
export const optimizeCLS = () => {
  // Add dimensions to images
  const images = document.querySelectorAll('img:not([width]):not([height])');
  images.forEach(img => {
    if (img.dataset.width && img.dataset.height) {
      img.width = img.dataset.width;
      img.height = img.dataset.height;
    }
  });
  
  // Reserve space for ads/dynamic content
  const adSlots = document.querySelectorAll('[data-ad-slot]');
  adSlots.forEach(slot => {
    const minHeight = slot.dataset.minHeight || '250px';
    slot.style.minHeight = minHeight;
  });
  
  // Use CSS containment
  const cards = document.querySelectorAll('.hotel-card, .room-card');
  cards.forEach(card => {
    card.style.contain = 'layout style paint';
  });
  
  // Font loading optimization
  if ('fonts' in document) {
    document.fonts.ready.then(() => {
      document.body.classList.add('fonts-loaded');
    });
  }
};

// Critical CSS extraction
export const extractCriticalCSS = () => {
  const critical = [];
  const sheets = document.styleSheets;
  
  for (let i = 0; i < sheets.length; i++) {
    try {
      const rules = sheets[i].cssRules || sheets[i].rules;
      
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        const selector = rule.selectorText;
        
        // Check if selector matches above-the-fold content
        if (selector && document.querySelector(selector)) {
          const elem = document.querySelector(selector);
          const rect = elem.getBoundingClientRect();
          
          // If element is in viewport
          if (rect.top < window.innerHeight) {
            critical.push(rule.cssText);
          }
        }
      }
    } catch (e) {
      console.warn('Cannot access stylesheet', e);
    }
  }
  
  return critical.join('\n');
};

// Resource hints generator
export const generateResourceHints = () => {
  const hints = [];
  
  // DNS prefetch for external domains
  const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])');
  const domains = new Set();
  
  externalLinks.forEach(link => {
    const url = new URL(link.href);
    domains.add(url.origin);
  });
  
  domains.forEach(domain => {
    hints.push(`<link rel="dns-prefetch" href="${domain}">`);
  });
  
  // Preconnect for critical third-party origins
  const criticalOrigins = [
    'https://fonts.gstatic.com',
    'https://www.google-analytics.com'
  ];
  
  criticalOrigins.forEach(origin => {
    hints.push(`<link rel="preconnect" href="${origin}" crossorigin>`);
  });
  
  return hints;
};

// Initialize optimizations
export const initializeWebVitalsOptimizations = () => {
  // Start monitoring
  const optimizer = new WebVitalsOptimizer();
  
  // Apply optimizations after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeLCP();
      optimizeFID();
      optimizeCLS();
    });
  } else {
    optimizeLCP();
    optimizeFID();
    optimizeCLS();
  }
  
  // Export for debugging
  window.__WEB_VITALS__ = optimizer;
  
  return optimizer;
};

// React hook for Web Vitals
export const useWebVitals = () => {
  const [metrics, setMetrics] = React.useState({});
  
  React.useEffect(() => {
    const updateMetric = (metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name]: metric.value
      }));
    };
    
    getCLS(updateMetric);
    getFID(updateMetric);
    getLCP(updateMetric);
    getTTFB(updateMetric);
    getFCP(updateMetric);
  }, []);
  
  return metrics;
};

export default {
  WebVitalsOptimizer,
  optimizeLCP,
  optimizeFID,
  optimizeCLS,
  extractCriticalCSS,
  generateResourceHints,
  initializeWebVitalsOptimizations,
  useWebVitals
};