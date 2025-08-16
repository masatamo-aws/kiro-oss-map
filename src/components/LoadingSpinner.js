/**
 * LoadingSpinner - ローディングスピナーコンポーネント
 */

import { EventBus } from '../utils/EventBus.js';

export class LoadingSpinner extends HTMLElement {
  constructor() {
    super();
    this.isVisible = false;
    this.message = '';
    this.type = 'default';
    
    this.setupEventListeners();
  }

  connectedCallback() {
    this.render();
  }

  setupEventListeners() {
    EventBus.on('loading:show', (data) => {
      this.show(data.message, data.type);
    });

    EventBus.on('loading:hide', () => {
      this.hide();
    });

    EventBus.on('loading:update', (data) => {
      this.updateMessage(data.message);
    });
  }

  render() {
    this.className = 'loading-spinner fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    this.innerHTML = this.getSpinnerHTML();
  }

  getSpinnerHTML() {
    const spinners = {
      default: `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div class="flex items-center space-x-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <div class="loading-message text-gray-700 dark:text-gray-300">
              ${this.message || 'Loading...'}
            </div>
          </div>
        </div>
      `,
      dots: `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div class="flex flex-col items-center space-y-4">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
            <div class="loading-message text-gray-700 dark:text-gray-300 text-center">
              ${this.message || 'Loading...'}
            </div>
          </div>
        </div>
      `,
      pulse: `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div class="flex flex-col items-center space-y-4">
            <div class="w-12 h-12 bg-blue-500 rounded-full animate-pulse"></div>
            <div class="loading-message text-gray-700 dark:text-gray-300 text-center">
              ${this.message || 'Loading...'}
            </div>
          </div>
        </div>
      `,
      bars: `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div class="flex flex-col items-center space-y-4">
            <div class="flex space-x-1">
              <div class="w-1 h-8 bg-blue-500 animate-pulse" style="animation-delay: 0ms"></div>
              <div class="w-1 h-8 bg-blue-500 animate-pulse" style="animation-delay: 100ms"></div>
              <div class="w-1 h-8 bg-blue-500 animate-pulse" style="animation-delay: 200ms"></div>
              <div class="w-1 h-8 bg-blue-500 animate-pulse" style="animation-delay: 300ms"></div>
              <div class="w-1 h-8 bg-blue-500 animate-pulse" style="animation-delay: 400ms"></div>
            </div>
            <div class="loading-message text-gray-700 dark:text-gray-300 text-center">
              ${this.message || 'Loading...'}
            </div>
          </div>
        </div>
      `,
      minimal: `
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      `
    };

    return spinners[this.type] || spinners.default;
  }

  show(message = 'Loading...', type = 'default') {
    this.message = message;
    this.type = type;
    this.isVisible = true;
    
    this.innerHTML = this.getSpinnerHTML();
    this.classList.remove('hidden');
    
    // Add entrance animation
    requestAnimationFrame(() => {
      this.style.opacity = '0';
      this.style.transition = 'opacity 0.3s ease-out';
      
      requestAnimationFrame(() => {
        this.style.opacity = '1';
      });
    });
  }

  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    
    // Add exit animation
    this.style.transition = 'opacity 0.3s ease-out';
    this.style.opacity = '0';
    
    setTimeout(() => {
      this.classList.add('hidden');
      this.style.opacity = '';
      this.style.transition = '';
    }, 300);
  }

  updateMessage(message) {
    this.message = message;
    const messageElement = this.querySelector('.loading-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  // Static utility methods
  static show(message, type) {
    EventBus.emit('loading:show', { message, type });
  }

  static hide() {
    EventBus.emit('loading:hide');
  }

  static update(message) {
    EventBus.emit('loading:update', { message });
  }
}

// Register the custom element
customElements.define('loading-spinner', LoadingSpinner);