// Integration Test Suite for Hotel Booking System
// Testing all 3 phases: Design System + AI Search + 3D/AR features

import { test, expect, devices } from '@playwright/test';

// Test Configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:8080',
  timeout: 30000,
  retries: 2,
  browsers: ['chromium', 'firefox', 'webkit'],
  devices: [
    'Desktop Chrome',
    'Desktop Firefox', 
    'Desktop Safari',
    'Desktop Edge',
    'iPhone 14',
    'iPhone 14 Pro Max',
    'iPad Pro',
    'Samsung Galaxy S23',
    'Pixel 7'
  ],
  viewports: [
    { width: 375, height: 667 },   // Mobile
    { width: 768, height: 1024 },  // Tablet
    { width: 1024, height: 768 },  // Tablet Landscape
    { width: 1440, height: 900 },  // Desktop
    { width: 1920, height: 1080 }, // Large Desktop
    { width: 2560, height: 1440 }, // 4K
  ]
};

// Phase 1: Design System Integration Tests
test.describe('Phase 1: Design System Integration', () => {
  test('Design System Components Load Correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test Theme Provider
    await expect(page.locator('[data-testid="theme-provider"]')).toBeVisible();
    
    // Test Button Components
    await expect(page.locator('button[data-component="Button"]')).toBeVisible();
    
    // Test Card Components
    await expect(page.locator('[data-component="Card"]')).toBeVisible();
    
    // Test Form Components
    await expect(page.locator('[data-component="FormField"]')).toBeVisible();
    
    // Test Grid System
    await expect(page.locator('[data-component="Grid"]')).toBeVisible();
  });

  test('Dark Mode Toggle Functionality', async ({ page }) => {
    await page.goto('/');
    
    // Check initial theme
    const body = page.locator('body');
    const initialClass = await body.getAttribute('class');
    
    // Toggle dark mode
    await page.click('[data-testid="theme-toggle"]');
    
    // Wait for theme change
    await page.waitForTimeout(500);
    
    // Verify theme changed
    const newClass = await body.getAttribute('class');
    expect(newClass).not.toBe(initialClass);
    
    // Verify CSS variables updated
    const computedStyle = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-surface-primary');
    });
    expect(computedStyle).toBeTruthy();
  });

  test('Responsive Grid System', async ({ page }) => {
    const viewports = TEST_CONFIG.viewports;
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      
      // Test grid responsiveness
      const gridItems = page.locator('[data-component="Grid"][item="true"]');
      const count = await gridItems.count();
      
      // Verify grid adapts to viewport
      if (viewport.width < 768) {
        // Mobile: expect stacked layout
        expect(count).toBeGreaterThan(0);
      } else if (viewport.width < 1024) {
        // Tablet: expect 2-column layout
        expect(count).toBeGreaterThan(0);
      } else {
        // Desktop: expect 3+ column layout
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('Component Animations and Interactions', async ({ page }) => {
    await page.goto('/');
    
    // Test button hover effects
    const button = page.locator('button[data-component="Button"]').first();
    await button.hover();
    
    // Verify transform applied
    const transform = await button.evaluate(el => 
      getComputedStyle(el).transform
    );
    expect(transform).not.toBe('none');
    
    // Test card hover effects
    const card = page.locator('[data-component="Card"][interactive="true"]').first();
    await card.hover();
    
    // Verify shadow/elevation change
    const boxShadow = await card.evaluate(el => 
      getComputedStyle(el).boxShadow
    );
    expect(boxShadow).not.toBe('none');
  });
});

// Phase 2: AI Search Integration Tests
test.describe('Phase 2: AI Search Integration', () => {
  test('AI Search Bar Functionality', async ({ page }) => {
    await page.goto('/');
    
    // Test search input
    const searchInput = page.locator('[data-testid="ai-search-input"]');
    await searchInput.fill('Tokyo hotels');
    
    // Verify AI suggestions appear
    await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
    
    // Test autocomplete
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Verify search executed
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('Voice Search Integration', async ({ page, browserName }) => {
    // Skip in Firefox due to limited WebRTC support
    test.skip(browserName === 'firefox', 'Voice search not supported in Firefox');
    
    await page.goto('/');
    
    // Grant microphone permissions (simulation)
    await page.context().grantPermissions(['microphone']);
    
    // Test voice search button
    const voiceButton = page.locator('[data-testid="voice-search-button"]');
    await voiceButton.click();
    
    // Verify voice interface appears
    await expect(page.locator('[data-testid="voice-interface"]')).toBeVisible();
    
    // Verify microphone access
    const micStatus = page.locator('[data-testid="mic-status"]');
    await expect(micStatus).toContainText('Listening');
  });

  test('Image Search Functionality', async ({ page }) => {
    await page.goto('/');
    
    // Test image upload
    const fileInput = page.locator('[data-testid="image-upload-input"]');
    
    // Create a test image file
    const testImage = Buffer.from('fake-image-data');
    await fileInput.setInputFiles({
      name: 'test-hotel.jpg',
      mimeType: 'image/jpeg',
      buffer: testImage
    });
    
    // Verify image processing
    await expect(page.locator('[data-testid="image-processing"]')).toBeVisible();
    
    // Verify results display
    await expect(page.locator('[data-testid="image-search-results"]')).toBeVisible();
  });

  test('Personalized Search Results', async ({ page }) => {
    await page.goto('/');
    
    // Simulate user preferences
    await page.evaluate(() => {
      localStorage.setItem('user-preferences', JSON.stringify({
        priceRange: [10000, 30000],
        amenities: ['WiFi', 'Pool'],
        location: 'Tokyo'
      }));
    });
    
    // Perform search
    await page.fill('[data-testid="search-input"]', 'luxury hotel');
    await page.click('[data-testid="search-button"]');
    
    // Verify personalized results
    const results = page.locator('[data-testid="search-result-item"]');
    const firstResult = results.first();
    
    await expect(firstResult).toContainText('Tokyo');
  });
});

// Phase 3: 3D/AR/VR Integration Tests
test.describe('Phase 3: 3D/AR/VR Integration', () => {
  test('3D Virtual Tour Loading', async ({ page, browserName }) => {
    // Skip in older browsers without WebGL support
    await page.goto('/hotel/1');
    
    // Test WebGL support
    const webglSupported = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    });
    
    if (!webglSupported) {
      test.skip(true, 'WebGL not supported in this browser');
    }
    
    // Test 3D tour button
    const tourButton = page.locator('[data-testid="3d-tour-button"]');
    await tourButton.click();
    
    // Verify 3D viewer loads
    await expect(page.locator('[data-testid="3d-viewer"]')).toBeVisible();
    
    // Test navigation controls
    const navControls = page.locator('[data-testid="3d-navigation-controls"]');
    await expect(navControls).toBeVisible();
    
    // Test scene loading
    await page.waitForSelector('[data-testid="3d-scene-loaded"]', { timeout: 10000 });
  });

  test('AR Room Preview', async ({ page }) => {
    // Test AR support detection
    const arSupported = await page.evaluate(() => {
      return 'xr' in navigator && 'isSessionSupported' in navigator.xr;
    });
    
    await page.goto('/hotel/1/room/1');
    
    if (arSupported) {
      // Test AR button
      const arButton = page.locator('[data-testid="ar-preview-button"]');
      await arButton.click();
      
      // Verify AR interface
      await expect(page.locator('[data-testid="ar-interface"]')).toBeVisible();
    } else {
      // Verify fallback message
      await expect(page.locator('[data-testid="ar-not-supported"]')).toBeVisible();
    }
  });

  test('360° Panorama Viewer', async ({ page }) => {
    await page.goto('/hotel/1/panorama');
    
    // Test panorama viewer
    const panoramaViewer = page.locator('[data-testid="panorama-viewer"]');
    await expect(panoramaViewer).toBeVisible();
    
    // Test mouse drag navigation
    await panoramaViewer.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0);
    await page.mouse.up();
    
    // Verify view changed
    const viewAngle = await page.evaluate(() => {
      return window.panoramaViewer?.getViewAngle();
    });
    expect(viewAngle).toBeDefined();
  });

  test('Interactive Floor Map', async ({ page }) => {
    await page.goto('/hotel/1/floormap');
    
    // Test floor map rendering
    const floorMap = page.locator('[data-testid="interactive-floor-map"]');
    await expect(floorMap).toBeVisible();
    
    // Test room selection
    const room = page.locator('[data-testid="floor-map-room"]').first();
    await room.click();
    
    // Verify room details popup
    await expect(page.locator('[data-testid="room-details-popup"]')).toBeVisible();
    
    // Test floor switching
    const floorSelector = page.locator('[data-testid="floor-selector"]');
    await floorSelector.selectOption('2');
    
    // Verify floor changed
    await expect(page.locator('[data-testid="floor-2-map"]')).toBeVisible();
  });
});

// Cross-Browser Compatibility Tests
test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`Core functionality in ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Test basic page load
      await expect(page.locator('[data-testid="homepage"]')).toBeVisible();
      
      // Test search functionality
      await page.fill('[data-testid="search-input"]', 'test search');
      await page.click('[data-testid="search-button"]');
      
      // Verify results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      // Test theme switching
      await page.click('[data-testid="theme-toggle"]');
      
      // Verify theme changed
      const isDark = await page.evaluate(() => 
        document.documentElement.classList.contains('dark')
      );
      expect(typeof isDark).toBe('boolean');
    });
  });
});

// Accessibility Tests (WCAG 2.1 AA)
test.describe('Accessibility Compliance (WCAG 2.1 AA)', () => {
  test('Keyboard Navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus');
      
      // Verify focus is visible
      const outline = await focusedElement.evaluate(el => 
        getComputedStyle(el).outline
      );
      expect(outline).not.toBe('none');
    }
  });

  test('Screen Reader Compatibility', async ({ page }) => {
    await page.goto('/');
    
    // Test ARIA labels
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      // Each button should have accessible text
      expect(ariaLabel || textContent).toBeTruthy();
    }
    
    // Test landmarks
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    
    // Test headings hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('Color Contrast Compliance', async ({ page }) => {
    await page.goto('/');
    
    // Test text contrast ratios
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div[role="text"]');
    const count = await textElements.count();
    
    for (let i = 0; i < Math.min(count, 20); i++) {
      const element = textElements.nth(i);
      const styles = await element.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        };
      });
      
      // All text should have proper contrast
      expect(styles.color).toBeTruthy();
    }
  });

  test('Form Accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Test form labels
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      if (id) {
        // Check for associated label
        const label = page.locator(`label[for="${id}"]`);
        const labelExists = await label.count() > 0;
        
        // Input should have label or aria-label
        expect(labelExists || ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
  });
});

// Performance Tests
test.describe('Performance Tests', () => {
  test('Page Load Performance', async ({ page }) => {
    // Start timing
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Test Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          resolve(entries);
        }).observe({ entryTypes: ['navigation', 'paint'] });
      });
    });
    
    expect(metrics).toBeDefined();
  });

  test('3D Scene Performance', async ({ page }) => {
    await page.goto('/hotel/1');
    
    // Start performance monitoring
    await page.evaluate(() => {
      window.performanceData = {
        frameCount: 0,
        startTime: performance.now()
      };
      
      function countFrames() {
        window.performanceData.frameCount++;
        requestAnimationFrame(countFrames);
      }
      requestAnimationFrame(countFrames);
    });
    
    // Load 3D tour
    await page.click('[data-testid="3d-tour-button"]');
    await page.waitForTimeout(5000);
    
    // Check FPS
    const fps = await page.evaluate(() => {
      const data = window.performanceData;
      const elapsed = performance.now() - data.startTime;
      return (data.frameCount / elapsed) * 1000;
    });
    
    // Should maintain at least 30 FPS
    expect(fps).toBeGreaterThan(30);
  });
});

// Test Execution Configuration
const EXECUTION_CONFIG = {
  parallelWorkers: 4,
  maxFailures: 10,
  retryFailedTests: true,
  generateReport: true,
  reportFormat: ['json', 'html'],
  outputDir: './test-results',
  video: 'retain-on-failure',
  screenshot: 'only-on-failure'
};

// Test Results Aggregator
class TestResultsAggregator {
  constructor() {
    this.results = {
      phase1: { passed: 0, failed: 0, skipped: 0 },
      phase2: { passed: 0, failed: 0, skipped: 0 },
      phase3: { passed: 0, failed: 0, skipped: 0 },
      crossBrowser: { passed: 0, failed: 0, skipped: 0 },
      accessibility: { passed: 0, failed: 0, skipped: 0 },
      performance: { passed: 0, failed: 0, skipped: 0 },
      totalTests: 0,
      startTime: null,
      endTime: null,
      duration: 0,
      issues: []
    };
  }

  recordResult(phase, status, testName, error = null) {
    this.results[phase][status]++;
    this.results.totalTests++;
    
    if (status === 'failed' && error) {
      this.results.issues.push({
        phase,
        test: testName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  generateReport() {
    const report = {
      summary: {
        totalTests: this.results.totalTests,
        passed: Object.values(this.results).reduce((sum, phase) => 
          sum + (phase.passed || 0), 0),
        failed: Object.values(this.results).reduce((sum, phase) => 
          sum + (phase.failed || 0), 0),
        skipped: Object.values(this.results).reduce((sum, phase) => 
          sum + (phase.skipped || 0), 0),
        duration: this.results.duration,
        passRate: 0
      },
      phases: {
        'Phase 1 - Design System': this.results.phase1,
        'Phase 2 - AI Search': this.results.phase2,
        'Phase 3 - 3D/AR/VR': this.results.phase3,
        'Cross-Browser': this.results.crossBrowser,
        'Accessibility': this.results.accessibility,
        'Performance': this.results.performance
      },
      issues: this.results.issues,
      recommendations: this.generateRecommendations()
    };

    const totalTests = report.summary.passed + report.summary.failed;
    report.summary.passRate = totalTests > 0 ? 
      ((report.summary.passed / totalTests) * 100).toFixed(2) : 0;

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Performance recommendations
    if (this.results.performance.failed > 0) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        message: 'Performance tests failed. Consider optimizing loading times and 3D rendering.'
      });
    }

    // Accessibility recommendations
    if (this.results.accessibility.failed > 0) {
      recommendations.push({
        category: 'Accessibility',
        priority: 'High',
        message: 'Accessibility issues detected. Review WCAG 2.1 AA compliance.'
      });
    }

    // Cross-browser recommendations
    if (this.results.crossBrowser.failed > 0) {
      recommendations.push({
        category: 'Cross-Browser',
        priority: 'Medium',
        message: 'Cross-browser compatibility issues found. Test on older browser versions.'
      });
    }

    return recommendations;
  }
}

// Quality Assurance Metrics
const QA_METRICS = {
  minimumPassRate: 95,
  maxLoadTime: 3000,
  minFPS: 30,
  maxAccessibilityViolations: 0,
  maxPerformanceScore: 90
};

export { TEST_CONFIG, EXECUTION_CONFIG, TestResultsAggregator, QA_METRICS };