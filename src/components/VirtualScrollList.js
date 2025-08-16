/**
 * VirtualScrollList - 仮想スクロールリストコンポーネント
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class VirtualScrollList extends HTMLElement {
  constructor() {
    super();
    this.items = [];
    this.itemHeight = 60;
    this.containerHeight = 400;
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.scrollTop = 0;
    this.renderBuffer = 5;
    this.isScrolling = false;
    this.scrollTimeout = null;
    
    this.setupEventListeners();
  }

  connectedCallback() {
    this.render();
    this.setupScrollListener();
    this.calculateVisibleItems();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  setupEventListeners() {
    EventBus.on('virtualScroll:setItems', (data) => {
      this.setItems(data.items);
    });

    EventBus.on('virtualScroll:updateItem', (data) => {
      this.updateItem(data.index, data.item);
    });

    EventBus.on('virtualScroll:scrollToIndex', (data) => {
      this.scrollToIndex(data.index);
    });
  }

  render() {
    this.className = 'virtual-scroll-list relative overflow-hidden';
    this.style.height = `${this.containerHeight}px`;
    
    this.innerHTML = `
      <div class="virtual-scroll-viewport absolute inset-0 overflow-auto">
        <div class="virtual-scroll-spacer" style="height: ${this.getTotalHeight()}px;">
          <div class="virtual-scroll-content" style="transform: translateY(${this.getOffsetY()}px);">
            <!-- Visible items will be rendered here -->
          </div>
        </div>
      </div>
    `;
  }

  setupScrollListener() {
    const viewport = this.querySelector('.virtual-scroll-viewport');
    if (!viewport) return;

    viewport.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    resizeObserver.observe(this);
    this.resizeObserver = resizeObserver;
  }

  handleScroll(event) {
    const viewport = event.target;
    this.scrollTop = viewport.scrollTop;
    
    this.isScrolling = true;
    
    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Throttle scroll updates
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.updateVisibleItems();
    }, 16); // ~60fps
    
    // Immediate update for smooth scrolling
    this.updateVisibleItems();
  }

  handleResize() {
    const rect = this.getBoundingClientRect();
    this.containerHeight = rect.height;
    this.calculateVisibleItems();
    this.updateVisibleItems();
  }

  setItems(items) {
    this.items = items || [];
    this.calculateVisibleItems();
    this.updateSpacer();
    this.updateVisibleItems();
    
    Logger.debug('Virtual scroll items set', { count: this.items.length });
  }

  updateItem(index, item) {
    if (index >= 0 && index < this.items.length) {
      this.items[index] = item;
      
      // Re-render if item is currently visible
      if (index >= this.visibleStart && index <= this.visibleEnd) {
        this.updateVisibleItems();
      }
    }
  }

  calculateVisibleItems() {
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    
    this.visibleStart = Math.max(0, startIndex - this.renderBuffer);
    this.visibleEnd = Math.min(
      this.items.length - 1,
      startIndex + visibleCount + this.renderBuffer
    );
  }

  updateVisibleItems() {
    this.calculateVisibleItems();
    
    const content = this.querySelector('.virtual-scroll-content');
    if (!content) return;

    // Update transform
    content.style.transform = `translateY(${this.getOffsetY()}px)`;
    
    // Render visible items
    const visibleItems = this.items.slice(this.visibleStart, this.visibleEnd + 1);
    content.innerHTML = visibleItems.map((item, index) => {
      const actualIndex = this.visibleStart + index;
      return this.renderItem(item, actualIndex);
    }).join('');
    
    // Setup item event listeners
    this.setupItemEventListeners();
    
    // Emit scroll event
    EventBus.emit('virtualScroll:scrolled', {
      scrollTop: this.scrollTop,
      visibleStart: this.visibleStart,
      visibleEnd: this.visibleEnd,
      isScrolling: this.isScrolling
    });
  }

  renderItem(item, index) {
    // This method should be overridden by subclasses or set via attribute
    const template = this.getAttribute('item-template') || 'default';
    
    switch (template) {
      case 'bookmark':
        return this.renderBookmarkItem(item, index);
      case 'search-result':
        return this.renderSearchResultItem(item, index);
      case 'measurement':
        return this.renderMeasurementItem(item, index);
      default:
        return this.renderDefaultItem(item, index);
    }
  }

  renderDefaultItem(item, index) {
    return `
      <div class="virtual-scroll-item flex items-center p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
           style="height: ${this.itemHeight}px;" 
           data-index="${index}">
        <div class="flex-1">
          <div class="font-medium text-gray-900 dark:text-gray-100">
            ${item.name || item.title || `Item ${index + 1}`}
          </div>
          ${item.description ? `
            <div class="text-sm text-gray-600 dark:text-gray-400 truncate">
              ${item.description}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderBookmarkItem(item, index) {
    const category = item.category || { name: 'Unknown', color: '#6b7280' };
    
    return `
      <div class="virtual-scroll-item bookmark-item flex items-center p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer" 
           style="height: ${this.itemHeight}px;" 
           data-index="${index}"
           data-bookmark-id="${item.id}">
        <div class="flex items-center space-x-3 flex-1">
          <div class="w-3 h-3 rounded-full" style="background-color: ${category.color}"></div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
              ${item.name}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 truncate">
              ${category.name} • ${new Date(item.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div class="flex space-x-1">
            <button class="view-btn text-blue-500 hover:text-blue-600 p-1" data-action="view" data-index="${index}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
            <button class="edit-btn text-gray-500 hover:text-gray-600 p-1" data-action="edit" data-index="${index}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderSearchResultItem(item, index) {
    return `
      <div class="virtual-scroll-item search-result-item flex items-center p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer" 
           style="height: ${this.itemHeight}px;" 
           data-index="${index}"
           data-result-id="${item.id}">
        <div class="flex-1">
          <div class="font-medium text-gray-900 dark:text-gray-100">
            ${item.name}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 truncate">
            ${item.address || item.description || ''}
            ${item.distance ? ` • ${item.distance.toFixed(1)}km` : ''}
          </div>
        </div>
        ${item.relevanceScore ? `
          <div class="text-xs text-gray-500 dark:text-gray-400">
            ${Math.round(item.relevanceScore)}%
          </div>
        ` : ''}
      </div>
    `;
  }

  renderMeasurementItem(item, index) {
    return `
      <div class="virtual-scroll-item measurement-item flex items-center p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
           style="height: ${this.itemHeight}px;" 
           data-index="${index}"
           data-measurement-id="${item.id}">
        <div class="flex items-center space-x-3 flex-1">
          <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${item.type === 'area' ? 
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>' :
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>'
              }
            </svg>
          </div>
          <div class="flex-1">
            <div class="font-medium text-gray-900 dark:text-gray-100">
              ${item.type === 'area' ? 'Area' : 'Distance'} Measurement
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              ${item.result?.formatted || 'No result'} • ${new Date(item.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div class="flex space-x-1">
            <button class="view-btn text-blue-500 hover:text-blue-600 p-1" data-action="view" data-index="${index}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setupItemEventListeners() {
    const items = this.querySelectorAll('.virtual-scroll-item');
    
    items.forEach(item => {
      // Click handler
      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // Skip if clicking button
        
        const index = parseInt(item.dataset.index);
        const itemData = this.items[index];
        
        EventBus.emit('virtualScroll:itemClick', {
          index,
          item: itemData,
          element: item
        });
      });

      // Button handlers
      const buttons = item.querySelectorAll('button[data-action]');
      buttons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          
          const action = button.dataset.action;
          const index = parseInt(button.dataset.index);
          const itemData = this.items[index];
          
          EventBus.emit('virtualScroll:itemAction', {
            action,
            index,
            item: itemData,
            element: item
          });
        });
      });
    });
  }

  scrollToIndex(index) {
    if (index < 0 || index >= this.items.length) return;
    
    const viewport = this.querySelector('.virtual-scroll-viewport');
    if (!viewport) return;
    
    const targetScrollTop = index * this.itemHeight;
    viewport.scrollTop = targetScrollTop;
    
    Logger.debug('Scrolled to index', { index, scrollTop: targetScrollTop });
  }

  scrollToTop() {
    this.scrollToIndex(0);
  }

  scrollToBottom() {
    this.scrollToIndex(this.items.length - 1);
  }

  getTotalHeight() {
    return this.items.length * this.itemHeight;
  }

  getOffsetY() {
    return this.visibleStart * this.itemHeight;
  }

  updateSpacer() {
    const spacer = this.querySelector('.virtual-scroll-spacer');
    if (spacer) {
      spacer.style.height = `${this.getTotalHeight()}px`;
    }
  }

  // Configuration methods
  setItemHeight(height) {
    this.itemHeight = height;
    this.calculateVisibleItems();
    this.updateSpacer();
    this.updateVisibleItems();
  }

  setContainerHeight(height) {
    this.containerHeight = height;
    this.style.height = `${height}px`;
    this.calculateVisibleItems();
    this.updateVisibleItems();
  }

  setRenderBuffer(buffer) {
    this.renderBuffer = buffer;
    this.calculateVisibleItems();
    this.updateVisibleItems();
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      totalItems: this.items.length,
      visibleItems: this.visibleEnd - this.visibleStart + 1,
      renderedItems: this.querySelectorAll('.virtual-scroll-item').length,
      scrollTop: this.scrollTop,
      containerHeight: this.containerHeight,
      itemHeight: this.itemHeight,
      renderBuffer: this.renderBuffer
    };
  }

  cleanup() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

// Register the custom element
customElements.define('virtual-scroll-list', VirtualScrollList);