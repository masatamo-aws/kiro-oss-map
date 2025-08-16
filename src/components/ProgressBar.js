/**
 * ProgressBar - プログレスバーコンポーネント
 */

import { EventBus } from '../utils/EventBus.js';

export class ProgressBar extends HTMLElement {
  constructor() {
    super();
    this.progress = 0;
    this.isVisible = false;
    this.isIndeterminate = false;
    this.label = '';
    this.color = 'blue';
    
    this.setupEventListeners();
  }

  connectedCallback() {
    this.render();
  }

  setupEventListeners() {
    EventBus.on('progress:show', (data) => {
      this.show(data.label, data.color);
    });

    EventBus.on('progress:hide', () => {
      this.hide();
    });

    EventBus.on('progress:update', (data) => {
      this.updateProgress(data.progress, data.label);
    });

    EventBus.on('progress:indeterminate', (data) => {
      this.setIndeterminate(data.indeterminate);
    });
  }

  render() {
    this.className = 'progress-bar-container fixed top-0 left-0 right-0 z-50 hidden';
    this.innerHTML = `
      <div class="progress-wrapper bg-white dark:bg-gray-800 shadow-lg">
        <div class="progress-content p-4">
          <div class="progress-label text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${this.label}
          </div>
          <div class="progress-track bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div class="progress-fill bg-${this.color}-500 h-full rounded-full transition-all duration-300 ease-out" style="width: ${this.progress}%">
              <div class="progress-shine absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 transform -skew-x-12 animate-pulse"></div>
            </div>
          </div>
          <div class="progress-percentage text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
            ${this.isIndeterminate ? '' : `${Math.round(this.progress)}%`}
          </div>
        </div>
      </div>
    `;
  }

  show(label = '', color = 'blue') {
    this.label = label;
    this.color = color;
    this.isVisible = true;
    this.progress = 0;
    
    this.render();
    this.classList.remove('hidden');
    
    // Add entrance animation
    requestAnimationFrame(() => {
      this.style.transform = 'translateY(-100%)';
      this.style.transition = 'transform 0.3s ease-out';
      
      requestAnimationFrame(() => {
        this.style.transform = 'translateY(0)';
      });
    });
  }

  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    
    // Add exit animation
    this.style.transition = 'transform 0.3s ease-out';
    this.style.transform = 'translateY(-100%)';
    
    setTimeout(() => {
      this.classList.add('hidden');
      this.style.transform = '';
      this.style.transition = '';
    }, 300);
  }

  updateProgress(progress, label) {
    this.progress = Math.max(0, Math.min(100, progress));
    
    if (label !== undefined) {
      this.label = label;
    }
    
    const fillElement = this.querySelector('.progress-fill');
    const labelElement = this.querySelector('.progress-label');
    const percentageElement = this.querySelector('.progress-percentage');
    
    if (fillElement) {
      fillElement.style.width = `${this.progress}%`;
    }
    
    if (labelElement && label !== undefined) {
      labelElement.textContent = this.label;
    }
    
    if (percentageElement && !this.isIndeterminate) {
      percentageElement.textContent = `${Math.round(this.progress)}%`;
    }
  }

  setIndeterminate(indeterminate = true) {
    this.isIndeterminate = indeterminate;
    
    const fillElement = this.querySelector('.progress-fill');
    const percentageElement = this.querySelector('.progress-percentage');
    
    if (fillElement) {
      if (indeterminate) {
        fillElement.style.width = '100%';
        fillElement.style.animation = 'indeterminate 2s infinite linear';
        fillElement.style.background = `linear-gradient(90deg, transparent, var(--tw-${this.color}-500), transparent)`;
      } else {
        fillElement.style.animation = '';
        fillElement.style.background = '';
        fillElement.className = `progress-fill bg-${this.color}-500 h-full rounded-full transition-all duration-300 ease-out`;
      }
    }
    
    if (percentageElement) {
      percentageElement.textContent = indeterminate ? '' : `${Math.round(this.progress)}%`;
    }
  }

  // Static utility methods
  static show(label, color) {
    EventBus.emit('progress:show', { label, color });
  }

  static hide() {
    EventBus.emit('progress:hide');
  }

  static update(progress, label) {
    EventBus.emit('progress:update', { progress, label });
  }

  static setIndeterminate(indeterminate) {
    EventBus.emit('progress:indeterminate', { indeterminate });
  }
}

// Add indeterminate animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes indeterminate {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// Register the custom element
customElements.define('progress-bar', ProgressBar);