/**
 * UIAnimationService - UI アニメーション管理サービス
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class UIAnimationService {
  constructor() {
    this.animationQueue = [];
    this.isAnimating = false;
    this.reducedMotion = this.checkReducedMotion();
    
    this.setupEventListeners();
    this.setupIntersectionObserver();
  }

  setupEventListeners() {
    // Listen for reduced motion preference changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', () => {
        this.reducedMotion = mediaQuery.matches;
        Logger.info('Reduced motion preference changed', { reducedMotion: this.reducedMotion });
      });
    }

    // Listen for animation requests
    EventBus.on('ui:animate', (data) => {
      this.animate(data.element, data.animation, data.options);
    });

    EventBus.on('ui:animateIn', (data) => {
      this.animateIn(data.element, data.animation);
    });

    EventBus.on('ui:animateOut', (data) => {
      this.animateOut(data.element, data.animation);
    });

    EventBus.on('ui:showToast', (data) => {
      this.showToast(data.message, data.type, data.options);
    });

    EventBus.on('ui:showModal', (data) => {
      this.showModal(data.element);
    });

    EventBus.on('ui:hideModal', (data) => {
      this.hideModal(data.element);
    });
  }

  setupIntersectionObserver() {
    // Animate elements when they come into view
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const animation = element.dataset.animateIn || 'fadeInUp';
          this.animateIn(element, animation);
          this.observer.unobserve(element);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
  }

  checkReducedMotion() {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  // Core animation method
  animate(element, animationName, options = {}) {
    if (!element || this.reducedMotion) {
      if (options.onComplete) options.onComplete();
      return Promise.resolve();
    }

    const {
      duration = 300,
      easing = 'ease-out',
      delay = 0,
      onComplete = null,
      onStart = null
    } = options;

    return new Promise((resolve) => {
      if (onStart) onStart();

      // Remove any existing animation classes
      element.classList.remove(...this.getAnimationClasses());
      
      // Add animation class
      element.classList.add(animationName);
      
      // Set custom properties if provided
      if (duration !== 300) {
        element.style.animationDuration = `${duration}ms`;
      }
      if (easing !== 'ease-out') {
        element.style.animationTimingFunction = easing;
      }
      if (delay > 0) {
        element.style.animationDelay = `${delay}ms`;
      }

      const handleAnimationEnd = () => {
        element.removeEventListener('animationend', handleAnimationEnd);
        element.classList.remove(animationName);
        
        // Reset custom properties
        element.style.animationDuration = '';
        element.style.animationTimingFunction = '';
        element.style.animationDelay = '';
        
        if (onComplete) onComplete();
        resolve();
      };

      element.addEventListener('animationend', handleAnimationEnd);
    });
  }

  // Animate element in
  animateIn(element, animation = 'fadeInUp') {
    if (!element) return;

    element.style.opacity = '0';
    element.style.visibility = 'visible';

    return this.animate(element, animation, {
      onComplete: () => {
        element.style.opacity = '';
      }
    });
  }

  // Animate element out
  animateOut(element, animation = 'fadeOut') {
    if (!element) return Promise.resolve();

    return this.animate(element, animation, {
      onComplete: () => {
        element.style.visibility = 'hidden';
      }
    });
  }

  // Show modal with animation
  showModal(element) {
    if (!element) return;

    element.classList.remove('hidden');
    element.style.display = 'flex';

    const backdrop = element.querySelector('.modal-backdrop') || element;
    const content = element.querySelector('.modal-content') || element.firstElementChild;

    // Animate backdrop
    this.animate(backdrop, 'modal-backdrop');
    
    // Animate content
    if (content && content !== backdrop) {
      this.animate(content, 'modal-enter');
    }
  }

  // Hide modal with animation
  hideModal(element) {
    if (!element) return Promise.resolve();

    const backdrop = element.querySelector('.modal-backdrop') || element;
    const content = element.querySelector('.modal-content') || element.firstElementChild;

    const promises = [];

    // Animate out content
    if (content && content !== backdrop) {
      promises.push(this.animateOut(content, 'fadeOut'));
    }

    // Animate out backdrop
    promises.push(this.animateOut(backdrop, 'fadeOut'));

    return Promise.all(promises).then(() => {
      element.classList.add('hidden');
      element.style.display = 'none';
    });
  }

  // Show toast notification
  showToast(message, type = 'info', options = {}) {
    const {
      duration = 3000,
      position = 'top-center',
      closable = true
    } = options;

    const toast = this.createToastElement(message, type, closable);
    this.positionToast(toast, position);
    
    document.body.appendChild(toast);

    // Animate in
    this.animateIn(toast, 'slideInFromBottom').then(() => {
      // Auto-hide after duration
      if (duration > 0) {
        setTimeout(() => {
          this.hideToast(toast);
        }, duration);
      }
    });

    return toast;
  }

  createToastElement(message, type, closable) {
    const toast = document.createElement('div');
    toast.className = `toast ${type} fixed z-50 px-4 py-3 rounded-lg shadow-lg text-white max-w-sm`;
    
    const iconMap = {
      success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>`,
      error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>`,
      warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>`,
      info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`
    };

    toast.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          ${iconMap[type] || iconMap.info}
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
        ${closable ? `
          <button class="toast-close flex-shrink-0 text-white hover:text-gray-200 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        ` : ''}
      </div>
    `;

    if (closable) {
      toast.querySelector('.toast-close').addEventListener('click', () => {
        this.hideToast(toast);
      });
    }

    return toast;
  }

  positionToast(toast, position) {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
      'bottom-right': 'bottom-4 right-4'
    };

    toast.className += ` ${positions[position] || positions['top-center']}`;
  }

  hideToast(toast) {
    this.animateOut(toast, 'slideInFromBottom').then(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  // Stagger animations for multiple elements
  staggerAnimation(elements, animation, options = {}) {
    const { delay = 100, ...animationOptions } = options;
    
    const promises = Array.from(elements).map((element, index) => {
      return new Promise(resolve => {
        setTimeout(() => {
          this.animate(element, animation, {
            ...animationOptions,
            onComplete: resolve
          });
        }, index * delay);
      });
    });

    return Promise.all(promises);
  }

  // Observe element for scroll-triggered animations
  observeElement(element, animation = 'fadeInUp') {
    if (!element) return;
    
    element.dataset.animateIn = animation;
    element.style.opacity = '0';
    this.observer.observe(element);
  }

  // Unobserve element
  unobserveElement(element) {
    if (element) {
      this.observer.unobserve(element);
    }
  }

  // Ripple effect
  createRipple(element, event) {
    if (this.reducedMotion) return;

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('div');
    ripple.className = 'absolute rounded-full bg-white bg-opacity-30 pointer-events-none';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.transform = 'scale(0)';
    ripple.style.transition = 'transform 0.6s ease-out, opacity 0.6s ease-out';

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    // Trigger animation
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1)';
      ripple.style.opacity = '0';
    });

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  // Add ripple effect to element
  addRippleEffect(element) {
    if (!element) return;

    element.addEventListener('click', (event) => {
      this.createRipple(element, event);
    });
  }

  // Get all animation class names
  getAnimationClasses() {
    return [
      'fadeIn', 'fadeOut', 'fadeInUp', 'fadeInDown', 'fadeInLeft', 'fadeInRight',
      'slideInFromRight', 'slideInFromLeft', 'slideInFromBottom', 'slideInFromTop',
      'bounceIn', 'bounceOut', 'pulse', 'shake', 'modal-enter', 'modal-backdrop',
      'panel-enter', 'panel-exit', 'sidebar-enter', 'sidebar-exit'
    ];
  }

  // Cleanup
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}