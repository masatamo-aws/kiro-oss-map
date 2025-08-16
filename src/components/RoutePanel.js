import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

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
    this.className = 'route-panel fixed top-20 right-4 w-80 z-40 hidden';
    this.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="route-header bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
              <h2 class="text-xl font-bold">ルート検索</h2>
            </div>
            <button class="close-btn text-white hover:text-gray-200 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="route-content p-4">
          <!-- Transportation Mode -->
          <div class="flex space-x-2 mb-4">
            <button id="mode-driving" class="mode-btn flex-1 p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                                           bg-primary-50 dark:bg-primary-800 text-primary-700 dark:text-primary-300 
                                           border-primary-300 dark:border-primary-600">
              <svg class="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0"></path>
              </svg>
              車
            </button>
            <button id="mode-walking" class="mode-btn flex-1 p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                                            text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <svg class="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              徒歩
            </button>
          </div>

          <!-- Origin Input -->
          <div class="relative mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">出発地</label>
            <input type="text" id="origin-input" 
                   class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                          placeholder-gray-500 dark:placeholder-gray-400
                          focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                   placeholder="出発地を入力">
            <button id="use-current-location" 
                    class="absolute right-2 top-8 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                    title="現在地を使用">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
          </div>

          <!-- Destination Input -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目的地</label>
            <input type="text" id="destination-input" 
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                          placeholder-gray-500 dark:placeholder-gray-400
                          focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                   placeholder="目的地を入力">
          </div>

          <!-- Action Buttons -->
          <div class="flex space-x-2 mb-4">
            <button id="calculate-route" 
                    class="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              ルート検索
            </button>
            <button id="clear-route" 
                    class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                           rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              クリア
            </button>
          </div>

          <!-- Loading State -->
          <div id="route-loading" class="hidden text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
            <div class="text-sm text-gray-600 dark:text-gray-400">ルートを計算中...</div>
          </div>

          <!-- Error State -->
          <div id="route-error" class="hidden bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
            <div class="flex">
              <svg class="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h4 class="text-sm font-medium text-red-800 dark:text-red-200">エラー</h4>
                <div id="route-error-message" class="text-sm text-red-700 dark:text-red-300 mt-1"></div>
              </div>
            </div>
          </div>

          <!-- Route Results -->
          <div id="route-results" class="hidden">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <div class="flex items-center justify-between">
                <div>
                  <div id="route-distance" class="text-lg font-semibold text-gray-900 dark:text-white"></div>
                  <div id="route-duration" class="text-sm text-gray-600 dark:text-gray-400"></div>
                </div>
                <div id="route-profile" class="text-sm text-gray-500 dark:text-gray-400"></div>
              </div>
            </div>

            <!-- Turn-by-turn directions -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ターンバイターン案内</h4>
              <div id="route-steps" class="space-y-2 max-h-64 overflow-y-auto"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Close button
    this.querySelector('.close-btn').addEventListener('click', () => {
      this.hide();
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

    // Clear route button
    this.querySelector('#clear-route').addEventListener('click', () => {
      this.clearRoute();
    });

    // Input events
    this.querySelector('#origin-input').addEventListener('input', () => {
      this.updateCalculateButton();
    });

    this.querySelector('#destination-input').addEventListener('input', () => {
      this.updateCalculateButton();
    });

    // EventBus listeners
    EventBus.on('route:setOrigin', (data) => {
      this.setOrigin(data.location, data.name);
    });

    EventBus.on('route:setDestination', (data) => {
      this.setDestination(data.location, data.name);
    });
  }

  setProfile(profile) {
    this.profile = profile;
    
    // Update button states
    const drivingBtn = this.querySelector('#mode-driving');
    const walkingBtn = this.querySelector('#mode-walking');
    
    // Reset all buttons
    [drivingBtn, walkingBtn].forEach(btn => {
      btn.classList.remove('bg-primary-50', 'dark:bg-primary-800', 'text-primary-700', 'dark:text-primary-300', 'border-primary-300', 'dark:border-primary-600');
      btn.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
    });
    
    // Activate selected button
    const activeBtn = profile === 'driving' ? drivingBtn : walkingBtn;
    activeBtn.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
    activeBtn.classList.add('bg-primary-50', 'dark:bg-primary-800', 'text-primary-700', 'dark:text-primary-300', 'border-primary-300', 'dark:border-primary-600');
  }

  async useCurrentLocation() {
    try {
      const geolocation = window.app?.services?.geolocation;
      if (!geolocation) {
        throw new Error('位置情報サービスが利用できません');
      }

      const position = await geolocation.getCurrentPosition();
      this.setOrigin([position.longitude, position.latitude], '現在地');
    } catch (error) {
      Logger.error('Current location failed', error);
      this.showError('現在地の取得に失敗しました');
    }
  }

  setOrigin(location, name) {
    this.origin = { location, name };
    this.querySelector('#origin-input').value = name || `${location[1].toFixed(6)}, ${location[0].toFixed(6)}`;
    this.updateCalculateButton();
  }

  setDestination(location, name) {
    this.destination = { location, name };
    this.querySelector('#destination-input').value = name || `${location[1].toFixed(6)}, ${location[0].toFixed(6)}`;
    this.updateCalculateButton();
  }

  updateCalculateButton() {
    const calculateBtn = this.querySelector('#calculate-route');
    const hasOrigin = this.origin || this.querySelector('#origin-input').value.trim();
    const hasDestination = this.destination || this.querySelector('#destination-input').value.trim();
    
    calculateBtn.disabled = !hasOrigin || !hasDestination;
  }

  async calculateRoute() {
    try {
      this.showLoading();
      this.hideError();

      // Get route service
      const routeService = window.app?.services?.route;
      if (!routeService) {
        throw new Error('ルートサービスが利用できません');
      }

      // Prepare origin and destination
      let origin = this.origin?.location;
      let destination = this.destination?.location;

      // If no coordinates, try to geocode the input text
      if (!origin) {
        const originText = this.querySelector('#origin-input').value.trim();
        if (originText) {
          const searchService = window.app?.services?.search;
          const results = await searchService.search(originText);
          if (results.length > 0) {
            origin = [results[0].lng, results[0].lat];
          }
        }
      }

      if (!destination) {
        const destinationText = this.querySelector('#destination-input').value.trim();
        if (destinationText) {
          const searchService = window.app?.services?.search;
          const results = await searchService.search(destinationText);
          if (results.length > 0) {
            destination = [results[0].lng, results[0].lat];
          }
        }
      }

      if (!origin || !destination) {
        throw new Error('出発地と目的地を正しく設定してください');
      }

      // Calculate route
      const route = await routeService.calculateRoute(origin, destination, this.profile);
      this.currentRoute = route;

      // Display route on map
      EventBus.emit('map:showRoute', { route });

      // Show results
      this.showResults(route);

    } catch (error) {
      Logger.error('Route calculation failed', error);
      this.showError(error.message || 'ルート計算に失敗しました');
    } finally {
      this.hideLoading();
    }
  }

  showResults(route) {
    const resultsDiv = this.querySelector('#route-results');
    const distanceDiv = this.querySelector('#route-distance');
    const durationDiv = this.querySelector('#route-duration');
    const profileDiv = this.querySelector('#route-profile');
    const stepsDiv = this.querySelector('#route-steps');

    // Update summary
    distanceDiv.textContent = route.summary.totalDistance;
    durationDiv.textContent = route.summary.totalDuration;
    profileDiv.textContent = route.profile === 'driving' ? '車' : '徒歩';

    // Update steps
    stepsDiv.innerHTML = route.steps.map((step, index) => `
      <div class="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">
        <div class="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 
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

    resultsDiv.classList.remove('hidden');
  }

  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}分`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}時間${remainingMinutes}分`;
    }
  }

  clearRoute() {
    this.origin = null;
    this.destination = null;
    this.currentRoute = null;

    this.querySelector('#origin-input').value = '';
    this.querySelector('#destination-input').value = '';
    this.querySelector('#route-results').classList.add('hidden');
    
    this.updateCalculateButton();
    this.hideError();

    // Clear route from map
    EventBus.emit('map:clearRoute');
  }

  showLoading() {
    this.querySelector('#route-loading').classList.remove('hidden');
    this.querySelector('#route-results').classList.add('hidden');
  }

  hideLoading() {
    this.querySelector('#route-loading').classList.add('hidden');
  }

  showError(message) {
    const errorDiv = this.querySelector('#route-error');
    const messageDiv = this.querySelector('#route-error-message');
    
    messageDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  hideError() {
    this.querySelector('#route-error').classList.add('hidden');
  }

  show() {
    this.classList.remove('hidden');
    this.isOpen = true;
  }

  hide() {
    this.classList.add('hidden');
    this.isOpen = false;
  }

  toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Register the custom element
customElements.define('route-panel', RoutePanel);