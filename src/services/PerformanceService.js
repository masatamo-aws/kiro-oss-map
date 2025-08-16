/**
 * PerformanceService - パフォーマンス監視・最適化サービス
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class PerformanceService {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.memoryThreshold = 50 * 1024 * 1024; // 50MB
    this.performanceEntries = [];
    this.isMonitoring = false;
    
    this.setupEventListeners();
    this.initializeObservers();
    this.startMonitoring();
  }

  setupEventListeners() {
    EventBus.on('performance:measure', (data) => {
      this.measure(data.name, data.startMark, data.endMark);
    });

    EventBus.on('performance:mark', (data) => {
      this.mark(data.name);
    });

    EventBus.on('performance:getMetrics', (data) => {
      const metrics = this.getMetrics();
      if (data.callback) {
        data.callback(metrics);
      }
    });

    EventBus.on('performance:optimize', () => {
      this.optimize();
    });
  }

  initializeObservers() {
    // Performance Observer for navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processNavigationEntry(entry);
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);

        // Performance Observer for resource timing
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processResourceEntry(entry);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);

        // Performance Observer for paint timing
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPaintEntry(entry);
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', paintObserver);

        // Performance Observer for largest contentful paint
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processLCPEntry(entry);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);

        // Performance Observer for layout shift
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processCLSEntry(entry);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);

      } catch (error) {
        Logger.warn('Performance Observer not fully supported', { error: error.message });
      }
    }

    // Intersection Observer for lazy loading optimization
    this.setupIntersectionObserver();

    // Mutation Observer for DOM changes
    this.setupMutationObserver();
  }

  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.handleElementVisible(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
  }

  setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      let domChanges = 0;
      mutations.forEach(mutation => {
        domChanges += mutation.addedNodes.length + mutation.removedNodes.length;
      });
      
      if (domChanges > 10) {
        this.throttledOptimize();
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  startMonitoring() {
    this.isMonitoring = true;
    
    // Monitor memory usage
    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Check every 10 seconds

    // Monitor frame rate
    this.frameRateMonitor();

    // Monitor network conditions
    this.monitorNetworkConditions();

    Logger.info('Performance monitoring started');
  }

  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    if (this.frameRateAnimationId) {
      cancelAnimationFrame(this.frameRateAnimationId);
    }

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();

    Logger.info('Performance monitoring stopped');
  }

  // Performance measurement methods
  mark(name) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
      Logger.debug('Performance mark', { name });
    }
  }

  measure(name, startMark, endMark) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        if (measure) {
          this.metrics.set(name, {
            duration: measure.duration,
            startTime: measure.startTime,
            timestamp: Date.now()
          });
          Logger.debug('Performance measure', { name, duration: measure.duration });
        }
      } catch (error) {
        Logger.warn('Performance measure failed', { name, error: error.message });
      }
    }
  }

  // Process performance entries
  processNavigationEntry(entry) {
    const metrics = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      domInteractive: entry.domInteractive - entry.navigationStart,
      firstByte: entry.responseStart - entry.requestStart,
      dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcpConnect: entry.connectEnd - entry.connectStart,
      serverResponse: entry.responseEnd - entry.responseStart
    };

    this.metrics.set('navigation', metrics);
    EventBus.emit('performance:navigationMetrics', { metrics });
  }

  processResourceEntry(entry) {
    const resourceMetrics = {
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize || entry.encodedBodySize,
      type: this.getResourceType(entry.name),
      cached: entry.transferSize === 0 && entry.encodedBodySize > 0
    };

    // Track slow resources
    if (entry.duration > 1000) { // > 1 second
      Logger.warn('Slow resource detected', resourceMetrics);
      EventBus.emit('performance:slowResource', { resource: resourceMetrics });
    }
  }

  processPaintEntry(entry) {
    this.metrics.set(entry.name, {
      startTime: entry.startTime,
      timestamp: Date.now()
    });

    if (entry.name === 'first-contentful-paint') {
      EventBus.emit('performance:firstContentfulPaint', { time: entry.startTime });
    }
  }

  processLCPEntry(entry) {
    this.metrics.set('largest-contentful-paint', {
      startTime: entry.startTime,
      size: entry.size,
      element: entry.element?.tagName,
      timestamp: Date.now()
    });

    EventBus.emit('performance:largestContentfulPaint', { 
      time: entry.startTime,
      element: entry.element 
    });
  }

  processCLSEntry(entry) {
    if (!entry.hadRecentInput) {
      const currentCLS = this.metrics.get('cumulative-layout-shift') || { value: 0 };
      currentCLS.value += entry.value;
      this.metrics.set('cumulative-layout-shift', currentCLS);

      if (entry.value > 0.1) {
        Logger.warn('Large layout shift detected', { value: entry.value });
        EventBus.emit('performance:layoutShift', { value: entry.value });
      }
    }
  }

  // Memory monitoring
  checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      const memoryMetrics = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };

      this.metrics.set('memory', memoryMetrics);

      if (memory.usedJSHeapSize > this.memoryThreshold) {
        Logger.warn('High memory usage detected', memoryMetrics);
        EventBus.emit('performance:highMemoryUsage', { metrics: memoryMetrics });
        this.optimize();
      }
    }
  }

  // Frame rate monitoring
  frameRateMonitor() {
    let lastTime = performance.now();
    let frameCount = 0;
    const frameRates = [];

    const measureFrameRate = (currentTime) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) { // Every second
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameRates.push(fps);
        
        // Keep only last 10 measurements
        if (frameRates.length > 10) {
          frameRates.shift();
        }

        const avgFPS = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
        
        this.metrics.set('frameRate', {
          current: fps,
          average: Math.round(avgFPS),
          timestamp: Date.now()
        });

        if (fps < 30) {
          Logger.warn('Low frame rate detected', { fps, average: avgFPS });
          EventBus.emit('performance:lowFrameRate', { fps, average: avgFPS });
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      this.frameRateAnimationId = requestAnimationFrame(measureFrameRate);
    };

    this.frameRateAnimationId = requestAnimationFrame(measureFrameRate);
  }

  // Network monitoring
  monitorNetworkConditions() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const networkMetrics = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };

      this.metrics.set('network', networkMetrics);

      connection.addEventListener('change', () => {
        const updatedMetrics = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        };

        this.metrics.set('network', updatedMetrics);
        EventBus.emit('performance:networkChange', { metrics: updatedMetrics });

        // Optimize for slow connections
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          this.optimizeForSlowConnection();
        }
      });
    }
  }

  // Optimization methods
  optimize() {
    Logger.info('Running performance optimization');

    // Clean up unused event listeners
    this.cleanupEventListeners();

    // Optimize images
    this.optimizeImages();

    // Clean up DOM
    this.cleanupDOM();

    // Garbage collection hint
    this.suggestGarbageCollection();

    // Optimize animations
    this.optimizeAnimations();

    EventBus.emit('performance:optimized');
  }

  throttledOptimize = this.throttle(() => {
    this.optimize();
  }, 5000);

  cleanupEventListeners() {
    // Remove unused event listeners
    const elements = document.querySelectorAll('[data-cleanup-listeners]');
    elements.forEach(element => {
      const clone = element.cloneNode(true);
      element.parentNode?.replaceChild(clone, element);
    });
  }

  optimizeImages() {
    const images = document.querySelectorAll('img[data-optimize]');
    images.forEach(img => {
      if (!this.isElementVisible(img)) {
        img.loading = 'lazy';
      }
    });
  }

  cleanupDOM() {
    // Remove hidden elements that are no longer needed
    const hiddenElements = document.querySelectorAll('[data-cleanup-when-hidden]');
    hiddenElements.forEach(element => {
      if (element.style.display === 'none' || element.hidden) {
        element.remove();
      }
    });
  }

  suggestGarbageCollection() {
    // Force garbage collection in development
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }
  }

  optimizeAnimations() {
    // Pause animations for non-visible elements
    const animatedElements = document.querySelectorAll('[data-animate]');
    animatedElements.forEach(element => {
      if (!this.isElementVisible(element)) {
        element.style.animationPlayState = 'paused';
      } else {
        element.style.animationPlayState = 'running';
      }
    });
  }

  optimizeForSlowConnection() {
    Logger.info('Optimizing for slow connection');

    // Reduce image quality
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.dataset.lowQualitySrc) {
        img.src = img.dataset.lowQualitySrc;
      }
    });

    // Disable non-essential animations
    document.body.classList.add('reduced-motion');

    // Reduce update frequency
    EventBus.emit('performance:reduceUpdates');
  }

  // Utility methods
  getResourceType(url) {
    const extension = url.split('.').pop()?.toLowerCase();
    const typeMap = {
      'js': 'script',
      'css': 'stylesheet',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'gif': 'image',
      'svg': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font'
    };
    return typeMap[extension] || 'other';
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  handleElementVisible(element) {
    // Lazy load content when element becomes visible
    if (element.dataset.lazyLoad) {
      this.lazyLoadElement(element);
    }
  }

  lazyLoadElement(element) {
    if (element.dataset.src) {
      element.src = element.dataset.src;
      element.removeAttribute('data-src');
    }
    
    if (element.dataset.srcset) {
      element.srcset = element.dataset.srcset;
      element.removeAttribute('data-srcset');
    }
  }

  observeElement(element) {
    this.intersectionObserver?.observe(element);
  }

  unobserveElement(element) {
    this.intersectionObserver?.unobserve(element);
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public API
  getMetrics() {
    const metricsObject = {};
    this.metrics.forEach((value, key) => {
      metricsObject[key] = value;
    });
    return metricsObject;
  }

  getPerformanceScore() {
    const metrics = this.getMetrics();
    let score = 100;

    // Deduct points for poor metrics
    if (metrics.navigation?.domContentLoaded > 2000) score -= 20;
    if (metrics['first-contentful-paint']?.startTime > 2000) score -= 15;
    if (metrics['largest-contentful-paint']?.startTime > 4000) score -= 15;
    if (metrics['cumulative-layout-shift']?.value > 0.1) score -= 10;
    if (metrics.frameRate?.average < 30) score -= 20;
    if (metrics.memory?.usage > 80) score -= 20;

    return Math.max(0, score);
  }

  generateReport() {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    
    return {
      score,
      metrics,
      recommendations: this.getRecommendations(metrics),
      timestamp: new Date().toISOString()
    };
  }

  getRecommendations(metrics) {
    const recommendations = [];

    if (metrics.navigation?.domContentLoaded > 2000) {
      recommendations.push('Consider optimizing JavaScript execution and DOM manipulation');
    }

    if (metrics['first-contentful-paint']?.startTime > 2000) {
      recommendations.push('Optimize critical rendering path and reduce render-blocking resources');
    }

    if (metrics.memory?.usage > 80) {
      recommendations.push('High memory usage detected. Consider implementing memory optimization');
    }

    if (metrics.frameRate?.average < 30) {
      recommendations.push('Low frame rate detected. Optimize animations and reduce DOM manipulations');
    }

    return recommendations;
  }

  // Cleanup
  destroy() {
    this.stopMonitoring();
    this.metrics.clear();
  }
}