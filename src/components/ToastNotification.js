/**
 * ToastNotification - トースト通知コンポーネント
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class ToastNotification extends HTMLElement {
  constructor() {
    super();
    this.toasts = new Map();
    this.maxToasts = 5;
    this.defaultDuration = 3000;
    
    this.setupEventListeners();
  }

  connectedCallback() {
    this.render();
  }

  setupEventListeners() {
    EventBus.on('toast:show', (data) => {
      this.show(data.message, data.type, data.options);
    });

    EventBus.on('toast:hide', (data) => {
      this.hide(data.id);
    });

    EventBus.on('toast:clear', () => {
      this.clearAll();
    });
  }

  render() {
    this.className = 'toast-container fixed top-4 right-4 z-50 space-y-2';
    this.innerHTML = '';
  }

  show(message, type = 'info', options = {}) {
    const {
      duration = this.defaultDuration,
      closable = true,
      persistent = false,
      actions = []
    } = options;

    // Limit number of toasts
    if (this.toasts.size >= this.maxToasts) {
      const oldestToast = this.toasts.values().next().value;
      this.hide(oldestToast.id);
    }

    const toast = this.createToast(message, type, closable, actions);
    this.toasts.set(toast.id, toast);
    
    this.appendChild(toast.element);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.element.classList.add('toast-enter');
    });

    // Auto-hide if not persistent
    if (!persistent && duration > 0) {
      toast.timeout = setTimeout(() => {
        this.hide(toast.id);
      }, duration);
    }

    Logger.info('Toast shown', { id: toast.id, type, message });
    return toast.id;
  }

  createToast(message, type, closable, actions) {
    const id = this.generateId();
    const element = document.createElement('div');
    
    element.className = `toast toast-${type} bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm transform translate-x-full transition-transform duration-300 ease-out`;
    
    const iconMap = {
      success: {
        color: 'text-green-500',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>`
      },
      error: {
        color: 'text-red-500',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>`
      },
      warning: {
        color: 'text-yellow-500',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>`
      },
      info: {
        color: 'text-blue-500',
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`
      }
    };

    const config = iconMap[type] || iconMap.info;

    element.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 ${config.color}">
          ${config.icon}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
            ${message}
          </p>
          ${actions.length > 0 ? `
            <div class="mt-2 flex space-x-2">
              ${actions.map(action => `
                <button class="toast-action text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors" data-action="${action.id}">
                  ${action.label}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        ${closable ? `
          <button class="toast-close flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        ` : ''}
      </div>
    `;

    // Add event listeners
    if (closable) {
      element.querySelector('.toast-close').addEventListener('click', () => {
        this.hide(id);
      });
    }

    // Add action listeners
    actions.forEach(action => {
      const button = element.querySelector(`[data-action="${action.id}"]`);
      if (button) {
        button.addEventListener('click', () => {
          if (action.handler) {
            action.handler();
          }
          if (action.closeOnClick !== false) {
            this.hide(id);
          }
        });
      }
    });

    return {
      id,
      element,
      type,
      message,
      timeout: null
    };
  }

  hide(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    // Clear timeout
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }

    // Animate out
    toast.element.classList.add('toast-exit');
    toast.element.classList.remove('toast-enter');

    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.toasts.delete(id);
    }, 300);

    Logger.info('Toast hidden', { id });
  }

  clearAll() {
    this.toasts.forEach((toast, id) => {
      this.hide(id);
    });
  }

  generateId() {
    return 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  // Utility methods for common toast types
  static success(message, options = {}) {
    EventBus.emit('toast:show', {
      message,
      type: 'success',
      options
    });
  }

  static error(message, options = {}) {
    EventBus.emit('toast:show', {
      message,
      type: 'error',
      options: {
        duration: 5000, // Longer duration for errors
        ...options
      }
    });
  }

  static warning(message, options = {}) {
    EventBus.emit('toast:show', {
      message,
      type: 'warning',
      options
    });
  }

  static info(message, options = {}) {
    EventBus.emit('toast:show', {
      message,
      type: 'info',
      options
    });
  }
}

// Register the custom element
customElements.define('toast-notification', ToastNotification);