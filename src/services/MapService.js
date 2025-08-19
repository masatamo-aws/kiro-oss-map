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
          // 少し遅延させてDOMが確実に準備されるようにする
          setTimeout(() => {
            this.loadPopupEnhancements(popup, options.data);
          }, 100);
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
          ${data.address ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">${typeof data.address === 'string' ? data.address : JSON.stringify(data.address)}</p>` : ''}
          
          <div class="popup-coordinates text-xs text-gray-500 dark:text-gray-500 mb-3">
            ${typeof data.latitude === 'number' ? data.latitude.toFixed(6) : data.latitude}, ${typeof data.longitude === 'number' ? data.longitude.toFixed(6) : data.longitude}
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
      // Get location image directly without external API dependencies
      const imageData = await this.getLocationImage(data);
      
      if (imageData) {
        const imageContainer = document.getElementById(`image-container-${data.id}`);
        
        if (imageContainer) {
          imageContainer.innerHTML = `
            <img src="${imageData.url}" 
                 alt="${data.name || data.displayName}" 
                 class="w-full h-32 object-cover rounded-lg"
                 loading="lazy"
                 onload="this.style.opacity='1'; this.nextElementSibling.style.display='block';"
                 onerror="console.warn('Image failed to load:', this.src); this.parentElement.innerHTML='<div class=\\'text-gray-400 dark:text-gray-500 text-sm flex items-center justify-center h-32\\'>画像を読み込めませんでした<br><small>${imageData.source}</small></div>'"
                 style="opacity: 0; transition: opacity 0.3s ease;"
            >
            <div class="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded" style="display: none;">
              ${imageData.source}${imageData.title ? ` - ${imageData.title}` : ''}
            </div>
          `;
          imageContainer.classList.add('relative');
        } else {
          // 再試行: より一般的なセレクタで検索
          const fallbackContainer = popup.getElement().querySelector('.popup-image div');
          if (fallbackContainer) {
            fallbackContainer.innerHTML = `
              <img src="${imageData.url}" 
                   alt="${data.name || data.displayName}" 
                   class="w-full h-32 object-cover rounded-lg"
                   loading="lazy"
                   style="opacity: 0; transition: opacity 0.3s ease;"
                   onload="this.style.opacity='1';"
              >
            `;
            fallbackContainer.classList.add('relative');
          }
        }
      }

      // Add click handlers to action buttons
      this.addPopupActionHandlers(popup.getElement());

    } catch (error) {
      Logger.error('Failed to load popup enhancements', error, 'popup-enhancement');
    }
  }

  /**
   * 地点の画像を取得する
   */
  async getLocationImage(location) {
    try {
      // タイムアウト付きで画像を取得
      const timeout = 5000; // 5秒タイムアウト

      // Wikipedia画像を優先的に取得
      try {
        const wikipediaImage = await Promise.race([
          this.getWikipediaImage(location),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
        if (wikipediaImage) {
          return wikipediaImage;
        }
      } catch (e) {
        console.warn('Wikipedia image fetch timed out or failed:', e.message);
      }

      // Unsplash画像をフォールバック
      try {
        const unsplashImage = await Promise.race([
          this.getUnsplashImage(location),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
        if (unsplashImage) {
          return unsplashImage;
        }
      } catch (e) {
        console.warn('Unsplash image fetch timed out or failed:', e.message);
      }

      // デフォルト画像
      return this.getDefaultLocationImage(location);
    } catch (error) {
      Logger.error('Failed to get location image', { location, error: error.message });
      return this.getDefaultLocationImage(location);
    }
  }

  /**
   * Wikipedia画像を取得
   */
  async getWikipediaImage(location) {
    try {
      const searchTerm = location.name || location.displayName;
      if (!searchTerm) return null;

      // 複数の検索方法を試す
      const searchTerms = [
        searchTerm,
        searchTerm.replace(/\s+/g, '_'), // スペースをアンダースコアに
        searchTerm.split(/[,\s]+/)[0], // 最初の単語のみ
      ];

      for (const term of searchTerms) {
        try {
          // Wikipedia REST API (CORS対応)
          const wikipediaUrl = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
          
          const response = await fetch(wikipediaUrl, {
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.thumbnail && data.thumbnail.source) {
              return {
                url: data.thumbnail.source,
                source: 'Wikipedia',
                description: data.description || data.extract || term,
                title: data.title
              };
            }
          }
        } catch (e) {
          console.warn(`Wikipedia search failed for term: ${term}`, e);
          continue;
        }
      }

      // フォールバック: Wikipedia検索API
      try {
        const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&piprop=thumbnail&pithumbsize=300&gsrsearch=${encodeURIComponent(searchTerm)}&gsrlimit=1&origin=*`;
        
        const response = await fetch(searchUrl);
        if (response.ok) {
          const data = await response.json();
          const pages = data.query?.pages;
          
          if (pages) {
            const pageId = Object.keys(pages)[0];
            const page = pages[pageId];
            
            if (page.thumbnail) {
              return {
                url: page.thumbnail.source,
                source: 'Wikipedia',
                description: page.title,
                title: page.title
              };
            }
          }
        }
      } catch (e) {
        console.warn('Wikipedia search API failed:', e);
      }

      return null;
    } catch (error) {
      console.warn('Wikipedia image fetch failed:', error);
      return null;
    }
  }

  /**
   * Unsplash画像を取得
   */
  async getUnsplashImage(location) {
    try {
      const searchTerm = location.name || location.displayName || location.category;
      if (!searchTerm) return null;

      // Unsplash Source API (無料、認証不要)
      const imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(searchTerm)}`;
      
      // 画像が存在するかチェック
      const response = await fetch(imageUrl, { method: 'HEAD' });
      
      if (response.ok) {
        return {
          url: imageUrl,
          source: 'Unsplash',
          description: `${searchTerm}の画像`,
          searchTerm: searchTerm
        };
      }

      // カテゴリベースの検索も試す
      if (location.category && location.category !== searchTerm) {
        const categoryImageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(location.category)}`;
        const categoryResponse = await fetch(categoryImageUrl, { method: 'HEAD' });
        
        if (categoryResponse.ok) {
          return {
            url: categoryImageUrl,
            source: 'Unsplash',
            description: `${location.category}の画像`,
            searchTerm: location.category
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('Unsplash image fetch failed:', error);
      return null;
    }
  }

  /**
   * Google Places Photo APIを取得（オプション）
   */
  async getGooglePlacesImage(location) {
    try {
      // Google Places APIキーが必要
      const apiKey = 'YOUR_GOOGLE_PLACES_API_KEY'; // 実際のキーに置き換える
      if (apiKey === 'YOUR_GOOGLE_PLACES_API_KEY') {
        return null;
      }

      const searchTerm = location.name || location.displayName;
      if (!searchTerm) return null;

      // Places Text Search API
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchTerm)}&key=${apiKey}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) return null;

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const place = data.results[0];
        if (place.photos && place.photos.length > 0) {
          const photoReference = place.photos[0].photo_reference;
          const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;
          
          return {
            url: photoUrl,
            source: 'Google Places',
            description: place.name,
            rating: place.rating
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('Google Places image fetch failed:', error);
      return null;
    }
  }

  /**
   * デフォルト画像を取得
   */
  getDefaultLocationImage(location) {
    const category = location.category || 'default';
    
    // カテゴリ別のアイコン色
    const categoryColors = {
      'レストラン': '#FF6B6B',
      'カフェ': '#4ECDC4', 
      'ホテル': '#45B7D1',
      '病院': '#96CEB4',
      '学校': '#FFEAA7',
      '銀行': '#DDA0DD',
      'コンビニ': '#98D8C8',
      'commercial': '#9B59B6',
      'default': '#6C5CE7'
    };
    
    const color = categoryColors[category] || categoryColors.default;
    
    // SVG画像を生成
    const svg = `<svg width="200" height="128" viewBox="0 0 200 128" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="128" fill="${color}" opacity="0.1"/>
        <circle cx="100" cy="64" r="30" fill="${color}" opacity="0.8"/>
        <text x="100" y="70" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
          ${category.charAt(0)}
        </text>
        <text x="100" y="110" text-anchor="middle" fill="${color}" font-size="10">
          ${category}
        </text>
      </svg>`;
    
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    return {
      url: svgUrl,
      source: 'default',
      description: `${category}の画像`
    };
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