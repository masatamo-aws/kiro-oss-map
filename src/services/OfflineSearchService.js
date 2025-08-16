/**
 * Offline Search Service
 * Provides search functionality when offline using cached data
 * Version: 1.3.0
 */

class OfflineSearchService {
  constructor() {
    this.dbName = 'KiroOSSMapOffline';
    this.dbVersion = 1;
    this.db = null;
    this.searchIndex = new Map();
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      await this.initDatabase();
      await this.loadSearchIndex();
      this.isInitialized = true;
      console.log('[OfflineSearch] Service initialized');
    } catch (error) {
      console.error('[OfflineSearch] Initialization failed:', error);
    }
  }

  // Initialize IndexedDB
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create search data store
        if (!db.objectStoreNames.contains('searchData')) {
          const searchStore = db.createObjectStore('searchData', { keyPath: 'id' });
          searchStore.createIndex('name', 'name', { unique: false });
          searchStore.createIndex('category', 'category', { unique: false });
          searchStore.createIndex('location', ['lat', 'lng'], { unique: false });
        }
        
        // Create search index store
        if (!db.objectStoreNames.contains('searchIndex')) {
          db.createObjectStore('searchIndex', { keyPath: 'term' });
        }
      };
    });
  }

  // Cache search results for offline use
  async cacheSearchResults(query, results) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['searchData', 'searchIndex'], 'readwrite');
      const searchStore = transaction.objectStore('searchData');
      const indexStore = transaction.objectStore('searchIndex');
      
      // Store search results
      for (const result of results) {
        const searchData = {
          id: result.id || this.generateId(result),
          name: result.name,
          address: result.address,
          category: result.category,
          lat: result.lat || result.latitude,
          lng: result.lng || result.longitude,
          importance: result.importance,
          cached: Date.now()
        };
        
        await this.putData(searchStore, searchData);
        
        // Update search index
        this.updateSearchIndex(searchData);
      }
      
      // Store query index
      const queryIndex = {
        term: query.toLowerCase(),
        results: results.map(r => r.id || this.generateId(r)),
        cached: Date.now()
      };
      
      await this.putData(indexStore, queryIndex);
      
      console.log(`[OfflineSearch] Cached ${results.length} results for query: ${query}`);
    } catch (error) {
      console.error('[OfflineSearch] Failed to cache results:', error);
    }
  }

  // Search offline cached data
  async searchOffline(query, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    const {
      limit = 10,
      category = null,
      bounds = null
    } = options;
    
    try {
      // First try exact query match
      const exactResults = await this.getExactQueryResults(query);
      if (exactResults.length > 0) {
        return this.filterAndLimitResults(exactResults, { limit, category, bounds });
      }
      
      // Fuzzy search in cached data
      const fuzzyResults = await this.fuzzySearch(query);
      return this.filterAndLimitResults(fuzzyResults, { limit, category, bounds });
      
    } catch (error) {
      console.error('[OfflineSearch] Search failed:', error);
      return [];
    }
  }

  // Get exact query results from cache
  async getExactQueryResults(query) {
    const transaction = this.db.transaction(['searchIndex', 'searchData'], 'readonly');
    const indexStore = transaction.objectStore('searchIndex');
    const searchStore = transaction.objectStore('searchData');
    
    const queryIndex = await this.getData(indexStore, query.toLowerCase());
    if (!queryIndex) return [];
    
    const results = [];
    for (const resultId of queryIndex.results) {
      const data = await this.getData(searchStore, resultId);
      if (data) results.push(data);
    }
    
    return results;
  }

  // Fuzzy search in cached data
  async fuzzySearch(query) {
    const transaction = this.db.transaction(['searchData'], 'readonly');
    const store = transaction.objectStore('searchData');
    
    const allData = await this.getAllData(store);
    const queryLower = query.toLowerCase();
    
    return allData.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(queryLower);
      const addressMatch = item.address && item.address.toLowerCase().includes(queryLower);
      return nameMatch || addressMatch;
    }).sort((a, b) => {
      // Sort by relevance (name match first, then importance)
      const aNameMatch = a.name.toLowerCase().includes(queryLower);
      const bNameMatch = b.name.toLowerCase().includes(queryLower);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      return (b.importance || 0) - (a.importance || 0);
    });
  }

  // Filter and limit results
  filterAndLimitResults(results, options) {
    let filtered = results;
    
    // Filter by category
    if (options.category) {
      filtered = filtered.filter(r => r.category === options.category);
    }
    
    // Filter by bounds
    if (options.bounds) {
      filtered = filtered.filter(r => {
        return r.lat >= options.bounds.south &&
               r.lat <= options.bounds.north &&
               r.lng >= options.bounds.west &&
               r.lng <= options.bounds.east;
      });
    }
    
    // Limit results
    return filtered.slice(0, options.limit);
  }

  // Update search index for autocomplete
  updateSearchIndex(searchData) {
    const words = this.extractSearchTerms(searchData.name);
    if (searchData.address) {
      words.push(...this.extractSearchTerms(searchData.address));
    }
    
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word).add(searchData.id);
    });
  }

  // Extract search terms from text
  extractSearchTerms(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);
  }

  // Get autocomplete suggestions
  getAutocompleteSuggestions(query, limit = 10) {
    const queryLower = query.toLowerCase();
    const suggestions = [];
    
    for (const [term, ids] of this.searchIndex) {
      if (term.startsWith(queryLower) && term !== queryLower) {
        suggestions.push({
          term,
          count: ids.size
        });
      }
    }
    
    return suggestions
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(s => s.term);
  }

  // Load search index from database
  async loadSearchIndex() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['searchData'], 'readonly');
      const store = transaction.objectStore('searchData');
      const allData = await this.getAllData(store);
      
      allData.forEach(data => this.updateSearchIndex(data));
      
      console.log(`[OfflineSearch] Loaded ${allData.length} items into search index`);
    } catch (error) {
      console.error('[OfflineSearch] Failed to load search index:', error);
    }
  }

  // Clear old cached data
  async clearOldCache(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    if (!this.db) return;
    
    try {
      const cutoff = Date.now() - maxAge;
      const transaction = this.db.transaction(['searchData', 'searchIndex'], 'readwrite');
      const searchStore = transaction.objectStore('searchData');
      const indexStore = transaction.objectStore('searchIndex');
      
      const allData = await this.getAllData(searchStore);
      let deletedCount = 0;
      
      for (const data of allData) {
        if (data.cached < cutoff) {
          await this.deleteData(searchStore, data.id);
          deletedCount++;
        }
      }
      
      // Clear old query indexes
      const allIndexes = await this.getAllData(indexStore);
      for (const index of allIndexes) {
        if (index.cached < cutoff) {
          await this.deleteData(indexStore, index.term);
        }
      }
      
      console.log(`[OfflineSearch] Cleared ${deletedCount} old cache entries`);
    } catch (error) {
      console.error('[OfflineSearch] Failed to clear old cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    if (!this.db) return null;
    
    try {
      const transaction = this.db.transaction(['searchData', 'searchIndex'], 'readonly');
      const searchStore = transaction.objectStore('searchData');
      const indexStore = transaction.objectStore('searchIndex');
      
      const searchData = await this.getAllData(searchStore);
      const indexData = await this.getAllData(indexStore);
      
      return {
        totalItems: searchData.length,
        totalQueries: indexData.length,
        indexSize: this.searchIndex.size,
        oldestEntry: Math.min(...searchData.map(d => d.cached)),
        newestEntry: Math.max(...searchData.map(d => d.cached))
      };
    } catch (error) {
      console.error('[OfflineSearch] Failed to get cache stats:', error);
      return null;
    }
  }

  // Helper methods for IndexedDB operations
  async putData(store, data) {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getData(store, key) {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllData(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteData(store, key) {
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generate ID for search results
  generateId(result) {
    const str = `${result.name}_${result.lat}_${result.lng}`;
    return btoa(str).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }
}

// Export singleton instance
export default new OfflineSearchService();