/**
 * BookmarkService - ブックマーク管理機能
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { StorageService } from './StorageService.js';

export class BookmarkService {
  constructor() {
    this.bookmarks = new Map();
    this.categories = new Map();
    this.storageService = new StorageService();
    
    this.setupEventListeners();
    this.initializeDefaultCategories();
    this.loadBookmarks();
    this.loadCategories();
  }

  setupEventListeners() {
    EventBus.on('bookmark:add', (data) => {
      this.addBookmark(data.location, data.name, data.categoryId, data.notes, data.tags);
    });

    EventBus.on('bookmark:update', (data) => {
      this.updateBookmark(data.id, data.updates);
    });

    EventBus.on('bookmark:delete', (data) => {
      this.deleteBookmark(data.id);
    });

    EventBus.on('bookmark:search', (data) => {
      this.searchBookmarks(data.query, data.filters);
    });

    EventBus.on('bookmark:category:create', (data) => {
      this.createCategory(data.name, data.color, data.icon);
    });

    EventBus.on('bookmark:category:update', (data) => {
      this.updateCategory(data.id, data.updates);
    });

    EventBus.on('bookmark:category:delete', (data) => {
      this.deleteCategory(data.id);
    });

    EventBus.on('bookmark:import', (data) => {
      this.importBookmarks(data.data, data.format);
    });

    EventBus.on('bookmark:export', (data) => {
      this.exportBookmarks(data.format, data.categoryId);
    });
  }

  initializeDefaultCategories() {
    const defaultCategories = [
      {
        id: 'work',
        name: '仕事',
        color: '#3b82f6',
        icon: 'briefcase',
        isDefault: true
      },
      {
        id: 'personal',
        name: 'プライベート',
        color: '#10b981',
        icon: 'home',
        isDefault: true
      },
      {
        id: 'travel',
        name: '旅行',
        color: '#f59e0b',
        icon: 'map',
        isDefault: true
      },
      {
        id: 'food',
        name: 'グルメ',
        color: '#ef4444',
        icon: 'utensils',
        isDefault: true
      },
      {
        id: 'shopping',
        name: 'ショッピング',
        color: '#8b5cf6',
        icon: 'shopping-bag',
        isDefault: true
      }
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.id, {
        ...category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // Bookmark Management
  addBookmark(location, name, categoryId = 'personal', notes = '', tags = []) {
    const id = this.generateId();
    const bookmark = {
      id,
      name: name || `ブックマーク ${this.bookmarks.size + 1}`,
      location: {
        lat: location.lat,
        lng: location.lng,
        zoom: location.zoom || 15
      },
      categoryId,
      notes,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visitCount: 0,
      lastVisited: null
    };

    this.bookmarks.set(id, bookmark);
    this.saveBookmarks();

    EventBus.emit('bookmark:added', { bookmark });
    Logger.info('Bookmark added', { id, name, categoryId });

    return bookmark;
  }

  updateBookmark(id, updates) {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) {
      Logger.warn('Bookmark not found for update', { id });
      return null;
    }

    const updatedBookmark = {
      ...bookmark,
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString()
    };

    this.bookmarks.set(id, updatedBookmark);
    this.saveBookmarks();

    EventBus.emit('bookmark:updated', { bookmark: updatedBookmark });
    Logger.info('Bookmark updated', { id });

    return updatedBookmark;
  }

  deleteBookmark(id) {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) {
      Logger.warn('Bookmark not found for deletion', { id });
      return false;
    }

    this.bookmarks.delete(id);
    this.saveBookmarks();

    EventBus.emit('bookmark:deleted', { id, bookmark });
    Logger.info('Bookmark deleted', { id });

    return true;
  }

  getBookmark(id) {
    return this.bookmarks.get(id);
  }

  getAllBookmarks() {
    return Array.from(this.bookmarks.values());
  }

  getBookmarksByCategory(categoryId) {
    return this.getAllBookmarks().filter(bookmark => bookmark.categoryId === categoryId);
  }

  // Category Management
  createCategory(name, color = '#6b7280', icon = 'bookmark') {
    const id = this.generateId();
    const category = {
      id,
      name,
      color,
      icon,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.categories.set(id, category);
    this.saveCategories();

    EventBus.emit('bookmark:category:created', { category });
    Logger.info('Category created', { id, name });

    return category;
  }

  updateCategory(id, updates) {
    const category = this.categories.get(id);
    if (!category) {
      Logger.warn('Category not found for update', { id });
      return null;
    }

    const updatedCategory = {
      ...category,
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString()
    };

    this.categories.set(id, updatedCategory);
    this.saveCategories();

    EventBus.emit('bookmark:category:updated', { category: updatedCategory });
    Logger.info('Category updated', { id });

    return updatedCategory;
  }

  deleteCategory(id) {
    const category = this.categories.get(id);
    if (!category) {
      Logger.warn('Category not found for deletion', { id });
      return false;
    }

    if (category.isDefault) {
      Logger.warn('Cannot delete default category', { id });
      return false;
    }

    // Move bookmarks to default category
    const bookmarksInCategory = this.getBookmarksByCategory(id);
    bookmarksInCategory.forEach(bookmark => {
      this.updateBookmark(bookmark.id, { categoryId: 'personal' });
    });

    this.categories.delete(id);
    this.saveCategories();

    EventBus.emit('bookmark:category:deleted', { id, category });
    Logger.info('Category deleted', { id });

    return true;
  }

  getAllCategories() {
    return Array.from(this.categories.values());
  }

  getCategory(id) {
    return this.categories.get(id);
  }

  // Search and Filter
  searchBookmarks(query, filters = {}) {
    let results = this.getAllBookmarks();

    // Text search
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      results = results.filter(bookmark => 
        bookmark.name.toLowerCase().includes(searchTerm) ||
        bookmark.notes.toLowerCase().includes(searchTerm) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Category filter
    if (filters.categoryId) {
      results = results.filter(bookmark => bookmark.categoryId === filters.categoryId);
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(bookmark => 
        filters.tags.some(tag => bookmark.tags.includes(tag))
      );
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      results = results.filter(bookmark => {
        const bookmarkDate = new Date(bookmark.createdAt);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

        return (!fromDate || bookmarkDate >= fromDate) &&
               (!toDate || bookmarkDate <= toDate);
      });
    }

    // Sort results
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    results.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'lastVisited') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    EventBus.emit('bookmark:search:results', { query, filters, results });
    return results;
  }

  // Visit tracking
  visitBookmark(id) {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) return null;

    const updatedBookmark = {
      ...bookmark,
      visitCount: bookmark.visitCount + 1,
      lastVisited: new Date().toISOString()
    };

    this.bookmarks.set(id, updatedBookmark);
    this.saveBookmarks();

    EventBus.emit('bookmark:visited', { bookmark: updatedBookmark });
    return updatedBookmark;
  }

  // Import/Export
  exportBookmarks(format = 'json', categoryId = null) {
    const bookmarks = categoryId ? 
      this.getBookmarksByCategory(categoryId) : 
      this.getAllBookmarks();

    const categories = this.getAllCategories();

    const exportData = {
      bookmarks,
      categories,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    let content;
    let filename;
    let mimeType;

    switch (format) {
      case 'csv':
        content = this.exportToCSV(bookmarks);
        filename = `bookmarks_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;
      case 'geojson':
        content = this.exportToGeoJSON(bookmarks);
        filename = `bookmarks_${new Date().toISOString().split('T')[0]}.geojson`;
        mimeType = 'application/geo+json';
        break;
      default:
        content = JSON.stringify(exportData, null, 2);
        filename = `bookmarks_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
    }

    EventBus.emit('bookmark:exported', { format, content, filename, mimeType });
    Logger.info('Bookmarks exported', { format, count: bookmarks.length });

    return { content, filename, mimeType };
  }

  exportToCSV(bookmarks) {
    const headers = ['Name', 'Category', 'Latitude', 'Longitude', 'Notes', 'Tags', 'Created', 'Visit Count'];
    const rows = bookmarks.map(bookmark => {
      const category = this.getCategory(bookmark.categoryId);
      return [
        bookmark.name,
        category ? category.name : bookmark.categoryId,
        bookmark.location.lat,
        bookmark.location.lng,
        bookmark.notes,
        bookmark.tags.join(';'),
        bookmark.createdAt,
        bookmark.visitCount
      ];
    });

    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  exportToGeoJSON(bookmarks) {
    const features = bookmarks.map(bookmark => {
      const category = this.getCategory(bookmark.categoryId);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [bookmark.location.lng, bookmark.location.lat]
        },
        properties: {
          id: bookmark.id,
          name: bookmark.name,
          category: category ? category.name : bookmark.categoryId,
          categoryColor: category ? category.color : '#6b7280',
          notes: bookmark.notes,
          tags: bookmark.tags,
          createdAt: bookmark.createdAt,
          visitCount: bookmark.visitCount,
          lastVisited: bookmark.lastVisited
        }
      };
    });

    return JSON.stringify({
      type: 'FeatureCollection',
      features
    }, null, 2);
  }

  importBookmarks(data, format = 'json') {
    try {
      let importedData;

      switch (format) {
        case 'json':
          importedData = typeof data === 'string' ? JSON.parse(data) : data;
          break;
        case 'geojson':
          importedData = this.importFromGeoJSON(data);
          break;
        case 'csv':
          importedData = this.importFromCSV(data);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      let importedCount = 0;

      // Import categories first
      if (importedData.categories) {
        importedData.categories.forEach(category => {
          if (!this.categories.has(category.id) && !category.isDefault) {
            this.categories.set(category.id, {
              ...category,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        });
        this.saveCategories();
      }

      // Import bookmarks
      if (importedData.bookmarks) {
        importedData.bookmarks.forEach(bookmark => {
          if (!this.bookmarks.has(bookmark.id)) {
            this.bookmarks.set(bookmark.id, {
              ...bookmark,
              createdAt: bookmark.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            importedCount++;
          }
        });
        this.saveBookmarks();
      }

      EventBus.emit('bookmark:imported', { format, count: importedCount });
      Logger.info('Bookmarks imported', { format, count: importedCount });

      return { success: true, count: importedCount };
    } catch (error) {
      Logger.error('Failed to import bookmarks', { error: error.message, format });
      EventBus.emit('bookmark:import:error', { error: error.message, format });
      return { success: false, error: error.message };
    }
  }

  importFromGeoJSON(data) {
    const geojson = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (geojson.type !== 'FeatureCollection') {
      throw new Error('Invalid GeoJSON format');
    }

    const bookmarks = geojson.features.map(feature => {
      if (feature.geometry.type !== 'Point') {
        return null;
      }

      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      return {
        id: props.id || this.generateId(),
        name: props.name || 'Imported Bookmark',
        location: { lat, lng, zoom: 15 },
        categoryId: 'personal',
        notes: props.notes || '',
        tags: props.tags || [],
        createdAt: props.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visitCount: props.visitCount || 0,
        lastVisited: props.lastVisited || null
      };
    }).filter(Boolean);

    return { bookmarks, categories: [] };
  }

  importFromCSV(data) {
    const lines = data.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const bookmarks = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const bookmark = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header.toLowerCase()) {
          case 'name':
            bookmark.name = value;
            break;
          case 'latitude':
          case 'lat':
            bookmark.lat = parseFloat(value);
            break;
          case 'longitude':
          case 'lng':
          case 'lon':
            bookmark.lng = parseFloat(value);
            break;
          case 'notes':
            bookmark.notes = value;
            break;
          case 'tags':
            bookmark.tags = value ? value.split(';') : [];
            break;
        }
      });

      if (bookmark.name && !isNaN(bookmark.lat) && !isNaN(bookmark.lng)) {
        return {
          id: this.generateId(),
          name: bookmark.name,
          location: { lat: bookmark.lat, lng: bookmark.lng, zoom: 15 },
          categoryId: 'personal',
          notes: bookmark.notes || '',
          tags: bookmark.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          visitCount: 0,
          lastVisited: null
        };
      }
      return null;
    }).filter(Boolean);

    return { bookmarks, categories: [] };
  }

  // Storage
  saveBookmarks() {
    const bookmarksArray = Array.from(this.bookmarks.values());
    this.storageService.set('bookmarks', bookmarksArray);
  }

  loadBookmarks() {
    const bookmarksArray = this.storageService.get('bookmarks', []);
    this.bookmarks.clear();
    bookmarksArray.forEach(bookmark => {
      this.bookmarks.set(bookmark.id, bookmark);
    });
  }

  saveCategories() {
    const categoriesArray = Array.from(this.categories.values());
    this.storageService.set('bookmark_categories', categoriesArray);
  }

  loadCategories() {
    const categoriesArray = this.storageService.get('bookmark_categories', []);
    if (categoriesArray.length > 0) {
      categoriesArray.forEach(category => {
        this.categories.set(category.id, category);
      });
    }
  }

  // Utility
  generateId() {
    return 'bookmark_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  // Statistics
  getStatistics() {
    const bookmarks = this.getAllBookmarks();
    const categories = this.getAllCategories();

    const categoryStats = categories.map(category => ({
      ...category,
      bookmarkCount: this.getBookmarksByCategory(category.id).length
    }));

    const mostVisited = bookmarks
      .filter(b => b.visitCount > 0)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);

    const recentlyAdded = bookmarks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    return {
      totalBookmarks: bookmarks.length,
      totalCategories: categories.length,
      categoryStats,
      mostVisited,
      recentlyAdded,
      totalVisits: bookmarks.reduce((sum, b) => sum + b.visitCount, 0)
    };
  }
}