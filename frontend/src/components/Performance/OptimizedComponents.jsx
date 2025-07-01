// Performance-optimized components for world-class UX
import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

// Virtualized list for large datasets
export const VirtualizedList = memo(({ 
  items, 
  renderItem, 
  itemHeight = 100,
  containerHeight = 400,
  className = ""
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index
    }));
  }, [items, scrollTop, itemHeight, containerHeight]);

  const totalHeight = items.length * itemHeight;
  const offsetY = Math.floor(scrollTop / itemHeight) * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div 
      className={`virtualized-list ${className}`}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item) => (
            <div key={item.index} style={{ height: itemHeight }}>
              {renderItem(item, item.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Intersection Observer for lazy loading
export const LazyComponent = memo(({ 
  children, 
  fallback = <div>Loading...</div>,
  rootMargin = "50px",
  threshold = 0.1 
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const ref = React.useRef();

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.unobserve(ref.current);
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, hasLoaded]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
});

// Optimized image with WebP support
export const OptimizedImage = memo(({ 
  src, 
  webpSrc, 
  alt, 
  width, 
  height,
  className = "",
  lazy = true,
  blur = true
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(!lazy);
  const imgRef = React.useRef();

  React.useEffect(() => {
    if (!lazy) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(imgRef.current);
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div 
      ref={imgRef}
      className={`optimized-image-container ${className}`}
      style={{ width, height, position: 'relative' }}
    >
      {blur && !isLoaded && (
        <div 
          className="image-placeholder"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }}
        />
      )}
      
      {isInView && (
        <picture>
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
          <motion.img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </picture>
      )}
    </div>
  );
});

// Debounced search input
export const DebouncedSearchInput = memo(({ 
  onSearch, 
  placeholder = "Search...",
  delay = 300,
  className = ""
}) => {
  const [value, setValue] = React.useState('');
  const timeoutRef = React.useRef();

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSearch(newValue);
    }, delay);
  }, [onSearch, delay]);

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <motion.input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={`debounced-search ${className}`}
      whileFocus={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    />
  );
});

// Memoized expensive calculations
export const ExpensiveComponent = memo(({ data, config }) => {
  const processedData = useMemo(() => {
    // Simulate expensive calculation
    return data.map(item => ({
      ...item,
      processed: item.value * config.multiplier + config.offset
    }));
  }, [data, config.multiplier, config.offset]);

  return (
    <div className="expensive-component">
      {processedData.map(item => (
        <div key={item.id}>{item.processed}</div>
      ))}
    </div>
  );
});

// Code splitting wrapper
export const CodeSplitWrapper = ({ 
  importFunction, 
  fallback = <div>Loading component...</div> 
}) => {
  const LazyComponent = lazy(importFunction);
  
  return (
    <Suspense fallback={fallback}>
      <LazyComponent />
    </Suspense>
  );
};

// Optimized event handlers
export const useOptimizedHandlers = () => {
  const handlersRef = React.useRef({});

  const createHandler = useCallback((key, handler) => {
    if (!handlersRef.current[key]) {
      handlersRef.current[key] = (...args) => handler(...args);
    }
    return handlersRef.current[key];
  }, []);

  return { createHandler };
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // More than 1 frame at 60fps
        console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  const measureOperation = useCallback((operation, name) => {
    const start = performance.now();
    const result = operation();
    const end = performance.now();
    
    console.log(`${name} took ${(end - start).toFixed(2)}ms`);
    return result;
  }, []);

  return { measureOperation };
};

// Batch updates hook
export const useBatchUpdates = () => {
  const [updates, setUpdates] = React.useState([]);
  const batchTimeoutRef = React.useRef();

  const addUpdate = useCallback((update) => {
    setUpdates(prev => [...prev, update]);
    
    clearTimeout(batchTimeoutRef.current);
    batchTimeoutRef.current = setTimeout(() => {
      setUpdates([]);
    }, 50); // Batch for 50ms
  }, []);

  const processBatch = useCallback((processor) => {
    if (updates.length > 0) {
      processor(updates);
    }
  }, [updates]);

  return { addUpdate, processBatch, updates };
};

// Web Workers wrapper
export const useWebWorker = (workerScript) => {
  const [worker, setWorker] = React.useState(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const newWorker = new Worker(workerScript);
    
    newWorker.onmessage = (e) => {
      if (e.data.type === 'READY') {
        setIsReady(true);
      }
    };
    
    setWorker(newWorker);
    
    return () => {
      newWorker.terminate();
    };
  }, [workerScript]);

  const postMessage = useCallback((message) => {
    if (worker && isReady) {
      worker.postMessage(message);
    }
  }, [worker, isReady]);

  return { worker, isReady, postMessage };
};

// CSS-in-JS optimization
export const useOptimizedStyles = (baseStyles, dynamicStyles = {}) => {
  return useMemo(() => ({
    ...baseStyles,
    ...dynamicStyles
  }), [baseStyles, dynamicStyles]);
};

export default {
  VirtualizedList,
  LazyComponent,
  OptimizedImage,
  DebouncedSearchInput,
  ExpensiveComponent,
  CodeSplitWrapper,
  useOptimizedHandlers,
  usePerformanceMonitor,
  useBatchUpdates,
  useWebWorker,
  useOptimizedStyles
};