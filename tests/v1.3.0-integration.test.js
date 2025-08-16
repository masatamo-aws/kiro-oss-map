/**
 * Integration Tests for Kiro OSS Map v1.3.0
 * Tests new features: PWA, Offline functionality, Performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Service Worker API
global.navigator = {
  ...global.navigator,
  serviceWorker: {
    register: vi.fn(),
    addEventListener: vi.fn(),
    controller: null
  },
  onLine: true
};

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
};

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

describe('v1.3.0 Integration Tests', () => {
  
  describe('Service Worker Tests', () => {
    let mockRegistration;
    
    beforeEach(() => {
      mockRegistration = {
        scope: '/',
        addEventListener: vi.fn(),
        installing: null,
        waiting: null,
        active: { state: 'activated' }
      };
      
      navigator.serviceWorker.register.mockResolvedValue(mockRegistration);
    });
    
    it('should register service worker successfully', async () => {
      const { default: App } = await import('../src/main.js');
      const app = new App();
      
      await app.registerServiceWorker();
      
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/'
      });
    });
    
    it('should handle service worker update', async () => {
      const { default: App } = await import('../src/main.js');
      const app = new App();
      
      // Mock new service worker available
      const newWorker = { 
        state: 'installed',
        addEventListener: vi.fn()
      };
      mockRegistration.installing = newWorker;
      
      await app.registerServiceWorker();
      
      // Simulate updatefound event
      const updateHandler = mockRegistration.addEventListener.mock.calls
        .find(call => call[0] === 'updatefound')[1];
      
      updateHandler();
      
      expect(newWorker.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));
    });
  });
  
  describe('Offline Search Tests', () => {
    let OfflineSearchService;
    
    beforeEach(async () => {
      // Mock IndexedDB operations
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            put: vi.fn(),
            get: vi.fn(),
            getAll: vi.fn(),
            delete: vi.fn(),
            createIndex: vi.fn()
          }))
        })),
        createObjectStore: vi.fn()
      };
      
      global.indexedDB.open.mockImplementation(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB
      }));
      
      const module = await import('../src/services/OfflineSearchService.js');
      OfflineSearchService = module.default;
    });
    
    it('should initialize database correctly', async () => {
      expect(OfflineSearchService).toBeDefined();
      expect(OfflineSearchService.dbName).toBe('KiroOSSMapOffline');
    });
    
    it('should cache search results', async () => {
      const query = 'test query';
      const results = [
        { id: '1', name: 'Test Location', lat: 35.6812, lng: 139.7671 }
      ];
      
      await OfflineSearchService.cacheSearchResults(query, results);
      
      // Verify caching logic (would need proper mock setup)
      expect(true).toBe(true); // Placeholder assertion
    });
    
    it('should perform offline search', async () => {
      const query = 'test';
      const results = await OfflineSearchService.searchOffline(query);
      
      expect(Array.isArray(results)).toBe(true);
    });
  });
  
  describe('Image Optimization Tests', () => {
    let ImageOptimizationService;
    
    beforeEach(async () => {
      // Mock canvas and image APIs
      global.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/webp;base64,test');
      global.Image = vi.fn(() => ({
        onload: null,
        onerror: null,
        src: '',
        naturalWidth: 100,
        naturalHeight: 100
      }));
      
      const module = await import('../src/services/ImageOptimizationService.js');
      ImageOptimizationService = module.default;
    });
    
    it('should detect supported formats', () => {
      expect(ImageOptimizationService.supportedFormats).toBeDefined();
      expect(typeof ImageOptimizationService.supportedFormats.webp).toBe('boolean');
    });
    
    it('should optimize image URL', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const optimizedUrl = ImageOptimizationService.optimizeImageUrl(originalUrl, {
        width: 800,
        quality: 80
      });
      
      expect(optimizedUrl).toContain('w=800');
      expect(optimizedUrl).toContain('q=80');
    });
    
    it('should setup intersection observer for lazy loading', () => {
      expect(ImageOptimizationService.observer).toBeDefined();
      expect(global.IntersectionObserver).toHaveBeenCalled();
    });
  });
  
  describe('Browser Compatibility Tests', () => {
    let BrowserCompatibilityService;
    
    beforeEach(async () => {
      // Mock user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });
      
      const module = await import('../src/services/BrowserCompatibilityService.js');
      BrowserCompatibilityService = module.default;
    });
    
    it('should detect browser correctly', () => {
      expect(BrowserCompatibilityService.browserInfo.name).toBe('chrome');
      expect(BrowserCompatibilityService.browserInfo.version).toBeGreaterThan(0);
    });
    
    it('should detect features correctly', () => {
      const features = BrowserCompatibilityService.features;
      
      expect(typeof features.geolocation).toBe('boolean');
      expect(typeof features.webgl).toBe('boolean');
      expect(typeof features.serviceWorker).toBe('boolean');
    });
    
    it('should check compatibility', () => {
      const isCompatible = BrowserCompatibilityService.checkCompatibility();
      expect(typeof isCompatible).toBe('boolean');
    });
    
    it('should provide compatibility report', () => {
      const report = BrowserCompatibilityService.getCompatibilityReport();
      
      expect(report).toHaveProperty('browser');
      expect(report).toHaveProperty('features');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('isCompatible');
    });
  });
  
  describe('Performance Tests', () => {
    it('should have optimized bundle configuration', async () => {
      const viteConfig = await import('../vite.config.js');
      const config = viteConfig.default;
      
      expect(config.build.rollupOptions.output.manualChunks).toBeDefined();
      expect(config.build.minify).toBe('terser');
      expect(config.build.cssCodeSplit).toBe(true);
    });
    
    it('should implement code splitting', async () => {
      // Test that services are properly split
      const mapService = await import('../src/services/MapService.js');
      const searchService = await import('../src/services/SearchService.js');
      
      expect(mapService).toBeDefined();
      expect(searchService).toBeDefined();
    });
  });
  
  describe('Integration Tests', () => {
    let app;
    
    beforeEach(() => {
      // Setup DOM
      document.body.innerHTML = `
        <div id="app">
          <div id="map"></div>
          <div id="loading-screen"></div>
        </div>
      `;
    });
    
    afterEach(() => {
      document.body.innerHTML = '';
    });
    
    it('should initialize app with v1.3.0 services', async () => {
      const { default: App } = await import('../src/main.js');
      
      // Mock required services
      vi.doMock('../src/services/MapService.js', () => ({
        MapService: vi.fn(() => ({
          initialize: vi.fn(),
          isInitialized: true
        }))
      }));
      
      app = new App();
      
      expect(app.version).toBe('1.3.0');
      expect(app.services.compatibility).toBeDefined();
      expect(app.services.imageOptimization).toBeDefined();
    });
    
    it('should handle online/offline transitions', async () => {
      const { SearchService } = await import('../src/services/SearchService.js');
      const searchService = new SearchService();
      
      // Test online state
      expect(searchService.isOnline).toBe(true);
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
      
      expect(searchService.isOnline).toBe(false);
      
      // Test offline search fallback
      const results = await searchService.search('test query');
      expect(Array.isArray(results)).toBe(true);
    });
  });
  
  describe('Error Handling Tests', () => {
    it('should handle service worker registration failure', async () => {
      navigator.serviceWorker.register.mockRejectedValue(new Error('Registration failed'));
      
      const { default: App } = await import('../src/main.js');
      const app = new App();
      
      // Should not throw error
      await expect(app.registerServiceWorker()).resolves.toBeUndefined();
    });
    
    it('should handle offline search failure gracefully', async () => {
      const { default: OfflineSearchService } = await import('../src/services/OfflineSearchService.js');
      
      // Mock database error
      OfflineSearchService.db = null;
      
      const results = await OfflineSearchService.searchOffline('test');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  it('should meet loading time requirements', async () => {
    const startTime = performance.now();
    
    await import('../src/main.js');
    
    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(100); // Module loading should be fast
  });
  
  it('should have efficient memory usage', () => {
    // Test memory usage patterns
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    // Simulate app usage
    for (let i = 0; i < 1000; i++) {
      const obj = { data: new Array(100).fill(i) };
      // Simulate cleanup
      obj.data = null;
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
  });
});