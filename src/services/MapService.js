import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

/**
 * Map service using MapLibre GL JS
 */
export class MapService {
  constructor() {
    this.map = null;
    this.markers = new Map();
    this.currentStyle = 'standard';
    this.isInitialized = false;
  }

  async initialize(containerId) {
    try {
      // Check if MapLibre GL is available
      if (typeof maplibregl === 'undefined') {
        throw new Error('MapLibre GL JS is not loaded');
      }

      // Default center: Tokyo Station
      const defaultCenter = [139.7671, 35.6812];
      const defaultZoom = 10;

      console.log('Initializing map with MapLibre GL version:', maplibregl.version);

      // Map styles configuration
      const styles = {
        standard: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
              maxzoom: 19
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        },
        satellite: {
          version: 8,
          sources: {
            'satellite': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              attribution: '© Esri, Maxar, Earthstar Geographics'
            }
          },
          layers: [
            {
              id: 'satellite',
              type: 'raster',
              source: 'satellite'
            }
          ]
        },
        terrain: {
          version: 8,
          sources: {
            'terrain': {
              type: 'raster',
              tiles: [
                'https://tile.opentopomap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenTopoMap (CC-BY-SA)'
            }
          },
          layers: [
            {
              id: 'terrain',
              type: 'raster',
              source: 'terrain'
            }
          ]
        }
      };

      console.log('Creating MapLibre GL map...');
      
      // Initialize MapLibre GL map
      this.map = new maplibregl.Map({
        container: containerId,
        style: styles.standard,
        center: defaultCenter,
        zoom: defaultZoom,
        attributionControl: true,
        logoPosition: 'bottom-left'
      });

      console.log('Map instance created, waiting for load event...');

      // Store styles for switching
      this.styles = styles;

      // Wait for map to load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Map load timeout after 10 seconds'));
        }, 10000);

        this.map.on('load', () => {
          clearTimeout(timeout);
          console.log('Map loaded successfully');
          resolve();
        });

        this.map.on('error', (e) => {
          clearTimeout(timeout);
          console.error('Map error:', e);
          reject(new Error(`Map error: ${e.error?.message || 'Unknown error'}`));
        });
      });

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      Logger.info('Map initialized successfully');

    } catch (error) {
      Logger.error('Failed to initialize map', error, 'map-initialization');
      throw error;
    }
  }

  setupEventListeners() {
    // Map click events
    this.map.on('click', (e) => {
      EventBus.emit('map:click', {
        lngLat: e.lngLat,
        point: e.point
      });
    });

    // Map move events
    this.map.on('moveend', () => {
      EventBus.emit('map:move', {
        center: this.map.getCenter(),
        zoom: this.map.getZoom(),
        bounds: this.map.getBounds()
      });
    });

    // Map zoom events
    this.map.on('zoomend', () => {
      EventBus.emit('map:zoom', {
        zoom: this.map.getZoom()
      });
    });

    // Keyboard navigation
    this.setupKeyboardNavigation();
  }

  setupKeyboardNavigation() {
    let mapFocused = false;

    // Make map container focusable
    const mapContainer = this.map.getContainer();
    mapContainer.setAttribute('tabindex', '0');
    mapContainer.setAttribute('role', 'application');
    mapContainer.setAttribute('aria-label', '地図 - 矢印キーで移動、+/-キーでズーム');

    // Focus events
    mapContainer.addEventListener('focus', () => {
      mapFocused = true;
      mapContainer.style.outline = '2px solid #3b82f6';
      mapContainer.style.outlineOffset = '2px';
    });

    mapContainer.addEventListener('blur', () => {
      mapFocused = false;
      mapContainer.style.outline = 'none';
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (!mapFocused || !this.isInitialized) return;

      const panDistance = 50; // pixels
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      let handled = false;

      switch (e.key) {
        case 'ArrowUp':
          this.map.panBy([0, -panDistance]);
          handled = true;
          break;
        case 'ArrowDown':
          this.map.panBy([0, panDistance]);
          handled = true;
          break;
        case 'ArrowLeft':
          this.map.panBy([-panDistance, 0]);
          handled = true;
          break;
        case 'ArrowRight':
          this.map.panBy([panDistance, 0]);
          handled = true;
          break;
        case '+':
        case '=':
          this.map.zoomIn();
          handled = true;
          break;
        case '-':
          this.map.zoomOut();
          handled = true;
          break;
        case 'Home':
          // Reset to default view
          this.flyTo([139.7671, 35.6812], 10);
          handled = true;
          break;
        case 'Enter':
        case ' ':
          // Add marker at center
          this.addMarker([center.lng, center.lat], 'キーボードで追加', null, {
            className: 'keyboard-marker'
          });
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Add keyboard navigation help
    this.addKeyboardHelp();
  }

  addKeyboardHelp() {
    const helpButton = document.createElement('button');
    helpButton.className = 'keyboard-help-btn fixed bottom-4 left-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 z-30';
    helpButton.title = 'キーボード操作ヘルプ';
    helpButton.innerHTML = `
      <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
      </svg>
    `;

    helpButton.addEventListener('click', () => {
      this.showKeyboardHelp();
    });

    document.body.appendChild(helpButton);
  }

  showKeyboardHelp() {
    const helpDialog = document.createElement('div');
    helpDialog.className = 'keyboard-help-dialog fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    helpDialog.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">キーボード操作</h3>
          <button class="close-help text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">矢印キー</span>
            <span class="text-gray-900 dark:text-white">地図を移動</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">+ / -</span>
            <span class="text-gray-900 dark:text-white">ズームイン/アウト</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Home</span>
            <span class="text-gray-900 dark:text-white">初期位置に戻る</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Enter / Space</span>
            <span class="text-gray-900 dark:text-white">中央にマーカー追加</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Tab</span>
            <span class="text-gray-900 dark:text-white">地図にフォーカス</span>
          </div>
        </div>
        
        <div class="mt-6 text-center">
          <button class="close-help bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
            閉じる
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(helpDialog);

    // Close dialog
    helpDialog.querySelectorAll('.close-help').forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.removeChild(helpDialog);
      });
    });

    helpDialog.addEventListener('click', (e) => {
      if (e.target === helpDialog) {
        document.body.removeChild(helpDialog);
      }
    });
  }

  setStyle(styleName) {
    if (!this.isInitialized || !this.styles[styleName]) {
      Logger.warn(`Style ${styleName} not available`);
      return;
    }

    this.map.setStyle(this.styles[styleName]);
    this.currentStyle = styleName;

    // Re-add markers after style change
    this.map.on('styledata', () => {
      this.readdMarkers();
    });

    EventBus.emit('map:style-change', { style: styleName });
  }

  flyTo(coordinates, zoom = 15, options = {}) {
    if (!this.isInitialized) return;

    this.map.flyTo({
      center: coordinates,
      zoom: zoom,
      duration: 2000,
      ...options
    });
  }

  addMarker(coordinates, title = '', id = null, options = {}) {
    if (!this.isInitialized) return null;

    const markerId = id || `marker-${Date.now()}-${Math.random()}`;

    // Create marker element
    const markerElement = document.createElement('div');
    markerElement.className = `marker ${options.className || ''}`;
    markerElement.title = title;

    // Create marker
    const marker = new maplibregl.Marker(markerElement)
      .setLngLat(coordinates)
      .addTo(this.map);

    // Add popup with enhanced content
    if (title || options.data) {
      const popup = new maplibregl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '350px'
      });
      
      // Set initial content
      popup.setHTML(this.createPopupContent(title, options.data));
      marker.setPopup(popup);

      // Load additional data when popup opens
      popup.on('open', () => {
        if (options.data) {
          this.loadPopupEnhancements(popup, options.data);
        }
      });
    }

    // Store marker reference
    this.markers.set(markerId, {
      marker,
      coordinates,
      title,
      options
    });

    return markerId;
  }

  createPopupContent(title, data = null) {
    if (!data) {
      return `<div class="font-medium">${title}</div>`;
    }

    return `
      <div class="location-popup">
        <div class="popup-header">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${data.name}</h3>
          ${data.category ? `<span class="inline-block px-2 py-1 text-xs bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded-full mb-2">${data.category}</span>` : ''}
        </div>
        
        <div class="popup-image mb-3">
          <div id="image-container-${data.id}" class="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <div class="animate-pulse text-gray-400 dark:text-gray-500">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="popup-content">
          ${data.address ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">${data.address}</p>` : ''}
          
          <div class="popup-coordinates text-xs text-gray-500 dark:text-gray-500 mb-3">
            ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}
          </div>
          
          <div class="popup-actions flex space-x-2">
            <button class="route-from-btn flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors" 
                    data-coordinates="${data.longitude},${data.latitude}" data-name="${data.name}">
              ここから
            </button>
            <button class="route-to-btn flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    data-coordinates="${data.longitude},${data.latitude}" data-name="${data.name}">
              ここへ
            </button>
            <button class="share-btn px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
                    data-coordinates="${data.longitude},${data.latitude}" data-name="${data.name}">
              共有
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async loadPopupEnhancements(popup, data) {
    try {
      // Import ImageService dynamically to avoid circular dependencies
      const { ImageService } = await import('./ImageService.js');
      const imageService = new ImageService();
      
      // Get location image
      const imageData = await imageService.getLocationImage(data);
      
      if (imageData) {
        const imageContainer = document.getElementById(`image-container-${data.id}`);
        if (imageContainer) {
          imageContainer.innerHTML = `
            <img src="${imageData.url}" 
                 alt="${data.name}" 
                 class="w-full h-32 object-cover rounded-lg"
                 onerror="this.parentElement.innerHTML='<div class=\\'text-gray-400 dark:text-gray-500 text-sm\\'>画像を読み込めませんでした</div>'"
            >
            <div class="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
              ${imageData.source}
            </div>
          `;
          imageContainer.classList.add('relative');
        }
      }

      // Add click handlers to action buttons
      this.addPopupActionHandlers(popup.getElement());

    } catch (error) {
      Logger.error('Failed to load popup enhancements', error, 'popup-enhancement');
    }
  }

  addPopupActionHandlers(popupElement) {
    // Route from button
    const routeFromBtn = popupElement.querySelector('.route-from-btn');
    if (routeFromBtn) {
      routeFromBtn.addEventListener('click', (e) => {
        const coordinates = e.target.dataset.coordinates.split(',').map(Number);
        const name = e.target.dataset.name;
        EventBus.emit('route:set-origin', { coordinates, name });
      });
    }

    // Route to button
    const routeToBtn = popupElement.querySelector('.route-to-btn');
    if (routeToBtn) {
      routeToBtn.addEventListener('click', (e) => {
        const coordinates = e.target.dataset.coordinates.split(',').map(Number);
        const name = e.target.dataset.name;
        EventBus.emit('route:set-destination', { coordinates, name });
      });
    }

    // Share button
    const shareBtn = popupElement.querySelector('.share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        const coordinates = e.target.dataset.coordinates.split(',').map(Number);
        const name = e.target.dataset.name;
        EventBus.emit('share:location', { 
          center: coordinates, 
          zoom: this.map.getZoom(),
          marker: { title: name }
        });
      });
    }
  }

  removeMarker(markerId) {
    if (!this.markers.has(markerId)) return;

    const markerData = this.markers.get(markerId);
    markerData.marker.remove();
    this.markers.delete(markerId);
  }

  clearMarkers(type = null) {
    if (type) {
      // Remove markers of specific type
      for (const [id, data] of this.markers.entries()) {
        if (data.options.type === type) {
          this.removeMarker(id);
        }
      }
    } else {
      // Remove all markers
      for (const [id] of this.markers.entries()) {
        this.removeMarker(id);
      }
    }
  }

  readdMarkers() {
    // Re-add all markers after style change
    const markersToReadd = Array.from(this.markers.entries());
    
    // Clear current markers
    this.markers.clear();
    
    // Re-add markers
    markersToReadd.forEach(([id, data]) => {
      this.addMarker(data.coordinates, data.title, id, data.options);
    });
  }

  displayRoute(route) {
    if (!this.isInitialized || !route) return;

    // Remove existing route
    this.clearRoute();

    // Add route source
    this.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    // Add route layers
    this.map.addLayer({
      id: 'route-outline',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 6
      }
    });

    this.map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4
      }
    });

    // Fit map to route bounds
    const coordinates = route.geometry.coordinates;
    const bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

    this.map.fitBounds(bounds, {
      padding: 50
    });

    // Add origin and destination markers
    if (route.legs && route.legs.length > 0) {
      const firstLeg = route.legs[0];
      const lastLeg = route.legs[route.legs.length - 1];
      
      if (firstLeg.steps && firstLeg.steps.length > 0) {
        const origin = firstLeg.steps[0].maneuver.location;
        this.addMarker(origin, '出発地', 'route-origin', { 
          className: 'marker-origin',
          type: 'route'
        });
      }
      
      if (lastLeg.steps && lastLeg.steps.length > 0) {
        const destination = lastLeg.steps[lastLeg.steps.length - 1].maneuver.location;
        this.addMarker(destination, '目的地', 'route-destination', { 
          className: 'marker-destination',
          type: 'route'
        });
      }
    }
  }

  clearRoute() {
    if (!this.isInitialized) return;

    // Remove route layers
    if (this.map.getLayer('route')) {
      this.map.removeLayer('route');
    }
    if (this.map.getLayer('route-outline')) {
      this.map.removeLayer('route-outline');
    }

    // Remove route source
    if (this.map.getSource('route')) {
      this.map.removeSource('route');
    }

    // Remove route markers
    this.clearMarkers('route');
  }

  getCenter() {
    return this.isInitialized ? this.map.getCenter() : null;
  }

  getZoom() {
    return this.isInitialized ? this.map.getZoom() : null;
  }

  getZoom() {
    return this.isInitialized ? this.map.getZoom() : null;
  }

  getBounds() {
    return this.isInitialized ? this.map.getBounds() : null;
  }

  resize() {
    if (this.isInitialized) {
      this.map.resize();
    }
  }

  destroy() {
    if (this.isInitialized && this.map) {
      this.map.remove();
      this.map = null;
      this.markers.clear();
      this.isInitialized = false;
    }
  }
}