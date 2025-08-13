import { EventBus } from '../utils/EventBus.js';

/**
 * Route panel web component
 */
class RoutePanel extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.currentRoute = null;
    this.origin = null;
    this.destination = null;
    this.profile = 'driving';
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.innerHTML = `
      <div id="route-panel" class="route-panel">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">経路案内</h3>
          <button id="close-route" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Route Input Form -->
        <div id="route-form" class="space-y-4">
          <!-- Transportation Mode -->
          <div class="flex space-x-2">
            <button id="mode-driving" class="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                                           bg-primary-50 dark:bg-primary-800 text-primary-700 dark:text-primary-300 
                                           border-primary-300 dark:border-primary-600">
              <svg class="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0"></path>
              </svg>
              車
            </button>
            <button id="mode-walking" class="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                                            text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <svg class="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              徒歩
            </button>
          </div>

          <!-- Origin Input -->
          <div class="relative">
            <div class="absolute left-3 top-3 w-3 h-3 bg-green-500 rounded-full"></div>
            <input
              type="text"
              id="origin-input"
              class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="出発地を入力"
            >
            <button id="use-current-location" class="absolute right-2 top-2 p-1 text-gray-400 hover:text-primary-500" title="現在地を使用">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
          </div>

          <!-- Destination Input -->
          <div class="relative">
            <div class="absolute left-3 top-3 w-3 h-3 bg-red-500 rounded-full"></div>
            <input
              type="text"
              id="destination-input"
              class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="目的地を入力"
            >
          </div>

          <!-- Calculate Button -->
          <button id="calculate-route" class="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg 
                                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            経路を検索
          </button>
        </div>

        <!-- Route Results -->
        <div id="route-results" class="hidden">
          <!-- Route Summary -->
          <div id="route-summary" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
              <div>
                <div id="route-distance" class="text-lg font-semibold text-gray-900 dark:text-white"></div>
                <div id="route-duration" class="text-sm text-gray-600 dark:text-gray-400"></div>
              </div>
              <div class="flex space-x-2">
                <button id="share-route" class="p-2 text-gray-400 hover:text-primary-500" title="ルートを共有">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                  </svg>
                </button>
                <button id="print-route" class="p-2 text-gray-400 hover:text-primary-500" title="印刷">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Turn-by-turn Directions -->
          <div id="route-directions" class="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            <!-- Directions will be populated here -->
          </div>
        </div>

        <!-- Loading State -->
        <div id="route-loading" class="hidden text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <div class="text-sm text-gray-600 dark:text-gray-400">経路を計算中...</div>
        </div>

        <!-- Error State -->
        <div id="route-error" class="hidden text-center py-8">
          <div class="text-red-500 dark:text-red-400 mb-2">
            <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div id="error-message" class="text-sm text-gray-600 dark:text-gray-400"></div>
          <button id="retry-route" class="mt-4 text-primary-600 hover:text-primary-700 text-sm">再試行</button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Close button
    this.querySelector('#close-route').addEventListener('click', () => {
      this.close();
    });

    // Transportation mode buttons
    this.querySelector('#mode-driving').addEventListener('click', () => {
      this.setProfile('driving');
    });

    this.querySelector('#mode-walking').addEventListener('click', () => {
      this.setProfile('walking');
    });

    // Current location button
    this.querySelector('#use-current-location').addEventListener('click', () => {
      this.useCurrentLocation();
    });

    // Calculate route button
    this.querySelector('#calculate-route').addEventListener('click', () => {
      this.calculateRoute();
    });

    // Share route button
    this.querySelector('#share-route').addEventListener('click', () => {
      this.shareRoute();
    });

    // Print route button
    this.querySelector('#print-route').addEventListener('click', () => {
      this.printRoute();
    });

    // Retry button
    this.querySelector('#retry-route').addEventListener('click', () => {
      this.calculateRoute();
    });

    // Input validation
    const originInput = this.querySelector('#origin-input');
    const destinationInput = this.querySelector('#destination-input');
    const calculateBtn = this.querySelector('#calculate-route');

    const validateInputs = () => {
      const hasOrigin = originInput.value.trim().length > 0;
      const hasDestination = destinationInput.value.trim().length > 0;
      calculateBtn.disabled = !(hasOrigin && hasDestination);
    };

    originInput.addEventListener('input', validateInputs);
    destinationInput.addEventListener('input', validateInputs);

    // Listen for route events
    EventBus.on('route:display', (data) => {
      this.displayRoute(data.route);
    });

    EventBus.on('route:error', (data) => {
      this.showError(data.message);
    });

    // Listen for map clicks to set origin/destination
    EventBus.on('map:click', (data) => {
      if (this.isOpen) {
        this.handleMapClick(data.lngLat);
      }
    });
  }

  setProfile(profile) {
    this.profile = profile;
    
    // Update button states
    const drivingBtn = this.querySelector('#mode-driving');
    const walkingBtn = this.querySelector('#mode-walking');
    
    if (profile === 'driving') {
      drivingBtn.classList.add('bg-primary-50', 'dark:bg-primary-800', 'text-primary-700', 'dark:text-primary-300', 'border-primary-300', 'dark:border-primary-600');
      drivingBtn.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
      
      walkingBtn.classList.remove('bg-primary-50', 'dark:bg-primary-800', 'text-primary-700', 'dark:text-primary-300', 'border-primary-300', 'dark:border-primary-600');
      walkingBtn.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
    } else {
      walkingBtn.classList.add('bg-primary-50', 'dark:bg-primary-800', 'text-primary-700', 'dark:text-primary-300', 'border-primary-300', 'dark:border-primary-600');
      walkingBtn.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
      
      drivingBtn.classList.remove('bg-primary-50', 'dark:bg-primary-800', 'text-primary-700', 'dark:text-primary-300', 'border-primary-300', 'dark:border-primary-600');
      drivingBtn.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
    }
  }

  async useCurrentLocation() {
    const button = this.querySelector('#use-current-location');
    const originInput = this.querySelector('#origin-input');
    
    try {
      button.disabled = true;
      button.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
      `;

      // Get current position
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      this.origin = [position.coords.longitude, position.coords.latitude];
      originInput.value = '現在地';
      
      // Validate inputs
      this.querySelector('#calculate-route').disabled = !this.querySelector('#destination-input').value.trim();

    } catch (error) {
      console.error('Failed to get current location:', error);
      alert('現在地を取得できませんでした。');
    } finally {
      button.disabled = false;
      button.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      `;
    }
  }

  async calculateRoute() {
    const originInput = this.querySelector('#origin-input');
    const destinationInput = this.querySelector('#destination-input');

    if (!originInput.value.trim() || !destinationInput.value.trim()) {
      return;
    }

    try {
      this.showLoading();

      // If origin is not coordinates, geocode it
      if (!this.origin) {
        // For now, assume it's a search query and emit search event
        // In a real implementation, you'd geocode the address
        alert('出発地の座標を設定してください');
        return;
      }

      // If destination is not coordinates, geocode it
      if (!this.destination) {
        alert('目的地の座標を設定してください');
        return;
      }

      // Emit route calculation event
      EventBus.emit('route:calculate', {
        origin: this.origin,
        destination: this.destination,
        profile: this.profile
      });

    } catch (error) {
      console.error('Route calculation failed:', error);
      this.showError('経路計算に失敗しました');
    }
  }

  displayRoute(route) {
    this.currentRoute = route;
    
    // Hide loading and form, show results
    this.querySelector('#route-loading').classList.add('hidden');
    this.querySelector('#route-error').classList.add('hidden');
    this.querySelector('#route-form').classList.add('hidden');
    this.querySelector('#route-results').classList.remove('hidden');

    // Update summary
    const distanceEl = this.querySelector('#route-distance');
    const durationEl = this.querySelector('#route-duration');
    
    distanceEl.textContent = this.formatDistance(route.distance);
    durationEl.textContent = this.formatDuration(route.duration);

    // Update directions
    this.displayDirections(route);
  }

  displayDirections(route) {
    const directionsEl = this.querySelector('#route-directions');
    
    if (!route.legs || route.legs.length === 0) {
      directionsEl.innerHTML = '<div class="text-gray-500 dark:text-gray-400">経路情報がありません</div>';
      return;
    }

    const steps = route.legs.flatMap(leg => leg.steps || []);
    
    directionsEl.innerHTML = steps.map((step, index) => `
      <div class="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
        <div class="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400 
                    rounded-full flex items-center justify-center text-xs font-medium">
          ${index + 1}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-gray-900 dark:text-white">${step.instruction}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ${this.formatDistance(step.distance)} • ${this.formatDuration(step.duration)}
          </div>
        </div>
      </div>
    `).join('');
  }

  showLoading() {
    this.querySelector('#route-form').classList.add('hidden');
    this.querySelector('#route-results').classList.add('hidden');
    this.querySelector('#route-error').classList.add('hidden');
    this.querySelector('#route-loading').classList.remove('hidden');
  }

  showError(message) {
    this.querySelector('#route-loading').classList.add('hidden');
    this.querySelector('#route-results').classList.add('hidden');
    this.querySelector('#error-message').textContent = message;
    this.querySelector('#route-error').classList.remove('hidden');
  }

  async shareRoute() {
    if (!this.currentRoute || !this.origin || !this.destination) return;

    try {
      const result = await EventBus.emit('share:create', {
        type: 'route',
        origin: this.origin,
        destination: this.destination,
        profile: this.profile
      });

      if (result && result.success) {
        alert(result.message || 'ルートを共有しました');
      }
    } catch (error) {
      console.error('Failed to share route:', error);
      alert('共有に失敗しました');
    }
  }

  printRoute() {
    if (!this.currentRoute) return;

    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>経路案内 - Kiro OSS Map</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
            .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
            .step { margin-bottom: 10px; padding: 10px; border-left: 3px solid #3b82f6; }
            .step-number { font-weight: bold; color: #3b82f6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>経路案内</h1>
            <p>Generated by Kiro OSS Map</p>
          </div>
          <div class="summary">
            <h2>経路概要</h2>
            <p><strong>距離:</strong> ${this.formatDistance(this.currentRoute.distance)}</p>
            <p><strong>所要時間:</strong> ${this.formatDuration(this.currentRoute.duration)}</p>
            <p><strong>交通手段:</strong> ${this.profile === 'driving' ? '車' : '徒歩'}</p>
          </div>
          <div class="directions">
            <h2>詳細案内</h2>
            ${this.currentRoute.legs.flatMap(leg => leg.steps || []).map((step, index) => `
              <div class="step">
                <span class="step-number">${index + 1}.</span>
                ${step.instruction}
                <br><small>${this.formatDistance(step.distance)} • ${this.formatDuration(step.duration)}</small>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  handleMapClick(lngLat) {
    // Allow setting origin/destination by clicking on map
    const originInput = this.querySelector('#origin-input');
    const destinationInput = this.querySelector('#destination-input');

    if (!originInput.value.trim()) {
      this.origin = [lngLat.lng, lngLat.lat];
      originInput.value = `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;
    } else if (!destinationInput.value.trim()) {
      this.destination = [lngLat.lng, lngLat.lat];
      destinationInput.value = `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;
    }

    // Validate inputs
    this.querySelector('#calculate-route').disabled = !(originInput.value.trim() && destinationInput.value.trim());
  }

  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  }

  // Public API
  open() {
    this.isOpen = true;
    this.querySelector('#route-panel').classList.add('open');
  }

  close() {
    this.isOpen = false;
    this.querySelector('#route-panel').classList.remove('open');
    
    // Clear route from map
    EventBus.emit('route:clear');
  }

  setOrigin(coordinates, name = '') {
    this.origin = coordinates;
    this.querySelector('#origin-input').value = name || `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
  }

  setDestination(coordinates, name = '') {
    this.destination = coordinates;
    this.querySelector('#destination-input').value = name || `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
  }
}

customElements.define('route-panel', RoutePanel);