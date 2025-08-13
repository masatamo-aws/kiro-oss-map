// Main application entry point
import './styles/main.css';
import { MapService } from './services/MapService.js';
import { SearchService } from './services/SearchService.js';
import { RouteService } from './services/RouteService.js';
import { GeolocationService } from './services/GeolocationService.js';
import { ShareService } from './services/ShareService.js';
import { ThemeService } from './services/ThemeService.js';
import { PWAService } from './services/PWAService.js';
import { EventBus } from './utils/EventBus.js';
import { Logger } from './utils/Logger.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { StorageService } from './services/StorageService.js';

// Web Components
import './components/SearchBox.js';
import './components/RoutePanel.js';
import './components/ShareDialog.js';

class App {
  constructor() {
    this.services = {};
    this.isInitialized = false;
    this.version = '1.0.0'; // アプリケーションバージョン
    
    this.init();
  }

  async init() {
    try {
      // Initialize error handling
      ErrorHandler.initialize();
      
      // Show loading screen
      this.showLoading();
      
      // Initialize services
      await this.initializeServices();
      
      // Initialize UI
      this.initializeUI();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Hide loading screen
      this.hideLoading();
      
      this.isInitialized = true;
      
      // Emit app ready event
      EventBus.emit('app:ready');
      
      Logger.info('Kiro OSS Map initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize app', error, 'app-initialization');
      this.showError('アプリケーションの初期化に失敗しました。');
    }
  }

  async initializeServices() {
    try {
      // Initialize core services first
      this.services.storage = new StorageService();
      this.services.theme = new ThemeService();
      this.services.geolocation = new GeolocationService();
      this.services.search = new SearchService();
      this.services.route = new RouteService();
      this.services.share = new ShareService();

      // Apply saved theme early
      this.services.theme.initialize();

      // Wait for MapLibre GL to be available
      await this.waitForMapLibre();

      // Initialize map service
      this.services.map = new MapService();
      await this.services.map.initialize('map');

      // Initialize PWA service last
      this.services.pwa = new PWAService();

      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    }
  }

  async waitForMapLibre() {
    return new Promise((resolve, reject) => {
      if (typeof maplibregl !== 'undefined') {
        resolve();
        return;
      }

      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const checkMapLibre = () => {
        attempts++;
        if (typeof maplibregl !== 'undefined') {
          console.log('MapLibre GL loaded successfully');
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('MapLibre GL failed to load'));
        } else {
          setTimeout(checkMapLibre, 100);
        }
      };

      checkMapLibre();
    });
  }

  initializeUI() {
    // Initialize version display
    this.initializeVersionDisplay();
    
    // Initialize sidebar toggle for mobile
    this.initializeSidebarToggle();
    
    // Initialize layer controls
    this.initializeLayerControls();
    
    // Initialize location button
    this.initializeLocationButton();
    
    // Initialize theme toggle
    this.initializeThemeToggle();
  }

  initializeSidebarToggle() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
      });
    }
  }

  initializeLayerControls() {
    const layerButtons = {
      'layer-standard': 'standard',
      'layer-satellite': 'satellite', 
      'layer-terrain': 'terrain'
    };

    Object.entries(layerButtons).forEach(([buttonId, style]) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.addEventListener('click', () => {
          this.services.map.setStyle(style);
          this.updateLayerButtonState(buttonId);
        });
      }
    });
  }

  updateLayerButtonState(activeButtonId) {
    const buttons = ['layer-standard', 'layer-satellite', 'layer-terrain'];
    buttons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (button) {
        if (buttonId === activeButtonId) {
          button.classList.add('bg-primary-50', 'dark:bg-primary-900');
        } else {
          button.classList.remove('bg-primary-50', 'dark:bg-primary-900');
        }
      }
    });
  }

  initializeLocationButton() {
    const locationBtn = document.getElementById('location-btn');
    if (locationBtn) {
      locationBtn.addEventListener('click', async () => {
        try {
          locationBtn.disabled = true;
          locationBtn.innerHTML = `
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          `;
          
          const position = await this.services.geolocation.getCurrentPosition();
          this.services.map.flyTo([position.longitude, position.latitude], 16);
          
          // Add current location marker
          this.services.map.addMarker(
            [position.longitude, position.latitude],
            '現在地',
            'current-location'
          );
          
        } catch (error) {
          Logger.error('Failed to get location', error, 'geolocation');
          this.showError('現在地を取得できませんでした。');
        } finally {
          locationBtn.disabled = false;
          locationBtn.innerHTML = `
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          `;
        }
      });
    }
  }

  initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.services.theme.toggle();
      });
    }
  }

  initializeVersionDisplay() {
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
      versionElement.textContent = `v${this.version}`;
      versionElement.title = `Kiro OSS Map バージョン ${this.version}`;
    }
  }

  setupEventListeners() {
    // Search events
    EventBus.on('search:query', (data) => {
      this.handleSearch(data.query);
    });

    EventBus.on('search:select', (data) => {
      this.handleSearchSelect(data.result);
    });

    // Route events
    EventBus.on('route:calculate', (data) => {
      this.handleRouteCalculation(data);
    });

    // Share events
    EventBus.on('share:create', (data) => {
      this.handleShare(data);
    });

    // Map events
    EventBus.on('map:click', (data) => {
      this.handleMapClick(data);
    });

    // Handle URL parameters on load
    this.handleUrlParameters();
  }

  async handleSearch(query) {
    if (!query.trim()) return;

    try {
      const results = await this.services.search.search(query);
      this.displaySearchResults(results);
    } catch (error) {
      Logger.error('Search failed', error, 'search');
      this.showError('検索に失敗しました。');
    }
  }

  handleSearchSelect(result) {
    // Clear previous search markers
    this.services.map.clearMarkers('search-result');
    
    // Fly to selected location
    this.services.map.flyTo([result.longitude, result.latitude], 16);
    
    // Add enhanced marker with popup
    this.services.map.addMarker(
      [result.longitude, result.latitude],
      result.name,
      `search-result-${result.id || Date.now()}`,
      {
        className: 'marker-search-result',
        type: 'search-result',
        data: {
          id: result.id || Date.now(),
          name: result.name,
          address: result.address || result.displayName,
          category: result.category,
          latitude: result.latitude,
          longitude: result.longitude,
          importance: result.importance
        }
      }
    );

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.add('-translate-x-full');
      }
    }
  }

  async handleRouteCalculation(data) {
    try {
      const route = await this.services.route.calculateRoute(
        data.origin,
        data.destination,
        data.profile || 'driving'
      );
      
      // Display route on map
      this.services.map.displayRoute(route);
      
      // Show route panel
      EventBus.emit('route:display', { route });
      
    } catch (error) {
      Logger.error('Route calculation failed', error, 'routing');
      this.showError('経路計算に失敗しました。');
    }
  }

  async handleShare(data) {
    try {
      const shareUrl = await this.services.share.createShareUrl(data);
      
      // Show share dialog
      EventBus.emit('share:show', { url: shareUrl });
      
    } catch (error) {
      Logger.error('Share creation failed', error, 'sharing');
      this.showError('共有URLの作成に失敗しました。');
    }
  }

  handleMapClick(data) {
    // Add context menu or marker on map click
    Logger.debug('Map clicked at:', data.lngLat);
  }

  displaySearchResults(results) {
    const container = document.getElementById('search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <p class="text-gray-500 dark:text-gray-400 text-center">
          検索結果が見つかりませんでした
        </p>
      `;
      return;
    }

    container.innerHTML = results.map((result, index) => {
      // Add unique ID if not present
      if (!result.id) {
        result.id = `search-${Date.now()}-${index}`;
      }
      
      return `
        <div class="search-result-item p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" data-result='${JSON.stringify(result)}'>
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 dark:text-white truncate">${result.name}</h3>
              ${result.address ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">${result.address}</p>` : ''}
              <div class="flex items-center justify-between mt-2">
                ${result.category ? `<span class="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">${result.category}</span>` : '<div></div>'}
                <div class="flex space-x-1">
                  <button class="route-from-btn text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300" 
                          data-result='${JSON.stringify(result)}' title="ここから">
                    出発
                  </button>
                  <span class="text-gray-300 dark:text-gray-600">|</span>
                  <button class="route-to-btn text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" 
                          data-result='${JSON.stringify(result)}' title="ここへ">
                    到着
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add click listeners to results
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on route buttons
        if (e.target.classList.contains('route-from-btn') || e.target.classList.contains('route-to-btn')) {
          return;
        }
        
        const result = JSON.parse(item.dataset.result);
        EventBus.emit('search:select', { result });
      });
    });

    // Add route button listeners
    container.querySelectorAll('.route-from-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = JSON.parse(btn.dataset.result);
        EventBus.emit('route:set-origin', { 
          coordinates: [result.longitude, result.latitude], 
          name: result.name 
        });
      });
    });

    container.querySelectorAll('.route-to-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = JSON.parse(btn.dataset.result);
        EventBus.emit('route:set-destination', { 
          coordinates: [result.longitude, result.latitude], 
          name: result.name 
        });
      });
    });
  }

  handleUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    
    // Handle shared location
    const shareId = params.get('share');
    if (shareId) {
      this.loadSharedContent(shareId);
    }

    // Handle direct coordinates
    const lat = params.get('lat');
    const lng = params.get('lng');
    const zoom = params.get('zoom');
    
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const zoomLevel = zoom ? parseInt(zoom) : 15;
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        this.services.map.flyTo([longitude, latitude], zoomLevel);
        this.services.map.addMarker([longitude, latitude], '指定地点', 'url-marker');
      }
    }
  }

  async loadSharedContent(shareId) {
    try {
      const sharedData = await this.services.share.getSharedData(shareId);
      
      if (sharedData.type === 'location') {
        this.services.map.flyTo(sharedData.data.center, sharedData.data.zoom);
        
        if (sharedData.data.markers) {
          sharedData.data.markers.forEach(marker => {
            this.services.map.addMarker(
              marker.location,
              marker.name,
              'shared-marker'
            );
          });
        }
      } else if (sharedData.type === 'route') {
        this.services.map.displayRoute(sharedData.data.route);
        EventBus.emit('route:display', { route: sharedData.data.route });
      }
      
    } catch (error) {
      Logger.error('Failed to load shared content', error, 'shared-content');
      this.showError('共有コンテンツの読み込みに失敗しました。');
    }
  }

  showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }
  }

  hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }

  showError(message) {
    // Hide loading screen
    this.hideLoading();
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed inset-0 bg-red-50 dark:bg-red-900 flex items-center justify-center z-50';
    errorDiv.innerHTML = `
      <div class="text-center p-8">
        <div class="text-red-500 dark:text-red-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-red-800 dark:text-red-200 mb-2">エラーが発生しました</h2>
        <p class="text-red-700 dark:text-red-300 mb-4">${message}</p>
        <button onclick="window.location.reload()" 
                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
          再読み込み
        </button>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Also log to console
    console.error('Application Error:', message);
  }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new App();
  });
} else {
  new App();
}

// Export for debugging
window.KiroOSSMap = App;