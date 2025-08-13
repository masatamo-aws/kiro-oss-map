import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

/**
 * Search box web component
 */
class SearchBox extends HTMLElement {
  constructor() {
    super();
    this.debounceTimeout = null;
    this.isOpen = false;
    this.selectedIndex = -1;
    this.suggestions = [];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.innerHTML = `
      <div class="relative">
        <div class="relative">
          <input
            type="text"
            id="search-input"
            class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400
                   focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                   transition-colors"
            placeholder="場所を検索..."
            autocomplete="off"
            spellcheck="false"
          >
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <button
            id="clear-search"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hidden"
            title="クリア"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Search Suggestions -->
        <div id="search-suggestions" class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 
                                           border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 hidden">
          <div id="suggestions-list" class="max-h-64 overflow-y-auto scrollbar-thin"></div>
          <div id="search-history" class="border-t border-gray-200 dark:border-gray-700 p-2 hidden">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">検索履歴</div>
            <div id="history-list"></div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const input = this.querySelector('#search-input');
    const clearBtn = this.querySelector('#clear-search');

    // Input events
    input.addEventListener('input', (e) => {
      this.handleInput(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    input.addEventListener('focus', () => {
      this.showSuggestions();
    });

    input.addEventListener('blur', () => {
      // Delay hiding to allow clicking on suggestions
      setTimeout(() => {
        if (!this.contains(document.activeElement)) {
          this.hideSuggestions();
        }
      }, 150);
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
      this.clearSearch();
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) {
        this.hideSuggestions();
      }
    });

    // Listen for search history updates
    EventBus.on('search:history-updated', () => {
      this.updateSearchHistory();
    });
  }

  handleInput(value) {
    const clearBtn = this.querySelector('#clear-search');
    
    if (value.trim()) {
      clearBtn.classList.remove('hidden');
      this.debouncedSearch(value);
    } else {
      clearBtn.classList.add('hidden');
      this.showSearchHistory();
    }
  }

  debouncedSearch(query) {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  async performSearch(query) {
    if (!query.trim()) return;

    try {
      // Show loading state
      this.showLoading();

      // Emit search event
      EventBus.emit('search:query', { query });

      // Add to search history
      this.addToSearchHistory(query);

    } catch (error) {
      Logger.error('Search failed', error, 'search-box');
      this.showError('検索に失敗しました');
    }
  }

  handleKeydown(e) {
    const suggestions = this.querySelectorAll('.suggestion-item');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, suggestions.length - 1);
        this.updateSelection();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && suggestions[this.selectedIndex]) {
          this.selectSuggestion(suggestions[this.selectedIndex]);
        } else {
          this.performSearch(e.target.value);
        }
        break;
        
      case 'Escape':
        this.hideSuggestions();
        e.target.blur();
        break;
    }
  }

  updateSelection() {
    const suggestions = this.querySelectorAll('.suggestion-item');
    
    suggestions.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('bg-primary-50', 'dark:bg-primary-800');
      } else {
        item.classList.remove('bg-primary-50', 'dark:bg-primary-800');
      }
    });
  }

  selectSuggestion(suggestionElement) {
    const data = JSON.parse(suggestionElement.dataset.suggestion);
    const input = this.querySelector('#search-input');
    
    input.value = data.name;
    this.hideSuggestions();
    
    EventBus.emit('search:select', { result: data });
  }

  showSuggestions() {
    const suggestions = this.querySelector('#search-suggestions');
    const input = this.querySelector('#search-input');
    
    if (!input.value.trim()) {
      this.showSearchHistory();
    }
    
    suggestions.classList.remove('hidden');
    this.isOpen = true;
  }

  hideSuggestions() {
    const suggestions = this.querySelector('#search-suggestions');
    suggestions.classList.add('hidden');
    this.isOpen = false;
    this.selectedIndex = -1;
  }

  showSearchHistory() {
    const historySection = this.querySelector('#search-history');
    const suggestionsList = this.querySelector('#suggestions-list');
    
    suggestionsList.innerHTML = '';
    
    // Get search history from storage
    const history = this.getSearchHistory();
    
    if (history.length > 0) {
      const historyList = this.querySelector('#history-list');
      historyList.innerHTML = history.slice(0, 5).map(item => `
        <div class="suggestion-item history-item flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded"
             data-query="${item.query}">
          <div class="flex items-center">
            <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm text-gray-700 dark:text-gray-300">${item.query}</span>
          </div>
          <button class="remove-history text-gray-400 hover:text-red-500 p-1" data-query="${item.query}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `).join('');
      
      historySection.classList.remove('hidden');
      
      // Add event listeners to history items
      historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.closest('.remove-history')) {
            const query = item.dataset.query;
            this.querySelector('#search-input').value = query;
            this.performSearch(query);
          }
        });
      });
      
      // Add event listeners to remove buttons
      historyList.querySelectorAll('.remove-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeFromSearchHistory(btn.dataset.query);
        });
      });
    } else {
      historySection.classList.add('hidden');
    }
  }

  displaySuggestions(results) {
    const suggestionsList = this.querySelector('#suggestions-list');
    const historySection = this.querySelector('#search-history');
    
    historySection.classList.add('hidden');
    
    if (results.length === 0) {
      suggestionsList.innerHTML = `
        <div class="p-4 text-center text-gray-500 dark:text-gray-400">
          検索結果が見つかりませんでした
        </div>
      `;
      return;
    }

    suggestionsList.innerHTML = results.map(result => `
      <div class="suggestion-item p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
           data-suggestion='${JSON.stringify(result)}'>
        <div class="font-medium text-gray-900 dark:text-white">${result.name}</div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">${result.address || result.displayName}</div>
        ${result.category ? `<div class="text-xs text-primary-600 dark:text-primary-400 mt-1">${result.category}</div>` : ''}
      </div>
    `).join('');

    // Add click listeners
    suggestionsList.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectSuggestion(item);
      });
    });

    this.selectedIndex = -1;
  }

  showLoading() {
    const suggestionsList = this.querySelector('#suggestions-list');
    suggestionsList.innerHTML = `
      <div class="p-4 text-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
        <div class="text-sm text-gray-500 dark:text-gray-400 mt-2">検索中...</div>
      </div>
    `;
  }

  showError(message) {
    const suggestionsList = this.querySelector('#suggestions-list');
    suggestionsList.innerHTML = `
      <div class="p-4 text-center text-red-500 dark:text-red-400">
        ${message}
      </div>
    `;
  }

  clearSearch() {
    const input = this.querySelector('#search-input');
    const clearBtn = this.querySelector('#clear-search');
    
    input.value = '';
    clearBtn.classList.add('hidden');
    this.showSearchHistory();
    input.focus();
  }

  getSearchHistory() {
    try {
      return JSON.parse(localStorage.getItem('kiro-oss-map-search-history') || '[]');
    } catch {
      return [];
    }
  }

  addToSearchHistory(query) {
    const history = this.getSearchHistory();
    
    // Remove if already exists
    const filtered = history.filter(item => item.query !== query);
    
    // Add to beginning
    filtered.unshift({
      query,
      timestamp: Date.now()
    });

    // Keep only last 20 items
    const trimmed = filtered.slice(0, 20);
    
    localStorage.setItem('kiro-oss-map-search-history', JSON.stringify(trimmed));
    EventBus.emit('search:history-updated');
  }

  removeFromSearchHistory(query) {
    const history = this.getSearchHistory();
    const filtered = history.filter(item => item.query !== query);
    
    localStorage.setItem('kiro-oss-map-search-history', JSON.stringify(filtered));
    this.showSearchHistory();
    EventBus.emit('search:history-updated');
  }

  updateSearchHistory() {
    if (this.isOpen && !this.querySelector('#search-input').value.trim()) {
      this.showSearchHistory();
    }
  }

  // Public API
  setValue(value) {
    const input = this.querySelector('#search-input');
    input.value = value;
    
    const clearBtn = this.querySelector('#clear-search');
    if (value.trim()) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }

  getValue() {
    return this.querySelector('#search-input').value;
  }

  focus() {
    this.querySelector('#search-input').focus();
  }
}

// Listen for search results from the main app
EventBus.on('search:results', (data) => {
  const searchBox = document.querySelector('search-box');
  if (searchBox) {
    searchBox.displaySuggestions(data.results);
  }
});

customElements.define('search-box', SearchBox);