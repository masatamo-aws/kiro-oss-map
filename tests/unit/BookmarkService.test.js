/**
 * BookmarkService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookmarkService } from '../../src/services/BookmarkService.js';
import { StorageService } from '../../src/services/StorageService.js';

// Mock StorageService
vi.mock('../../src/services/StorageService.js', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    isSupported: true
  }))
}));

// Mock EventBus
vi.mock('../../src/utils/EventBus.js', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

// Mock Logger
vi.mock('../../src/utils/Logger.js', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

describe('BookmarkService', () => {
  let bookmarkService;

  beforeEach(() => {
    // Mock StorageService methods to return appropriate values
    const mockStorageService = {
      get: vi.fn((key, defaultValue) => {
        if (key === 'bookmarks') return [];
        if (key === 'categories') return [];
        return defaultValue;
      }),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      isSupported: true
    };
    
    // Mock the StorageService constructor to return our mock
    vi.mocked(StorageService).mockImplementation(() => mockStorageService);
    
    bookmarkService = new BookmarkService();
    vi.clearAllMocks();
  });

  describe('Bookmark Management', () => {
    it('should create a new bookmark', () => {
      const location = { lat: 35.6762, lng: 139.6503 };
      const name = 'Test Location';
      const categoryId = 'personal';

      const bookmark = bookmarkService.addBookmark(location, name, categoryId);

      expect(bookmark).toBeDefined();
      expect(bookmark.id).toBeDefined();
      expect(bookmark.name).toBe('Test Location');
      expect(bookmark.location.lat).toBe(location.lat);
      expect(bookmark.location.lng).toBe(location.lng);
      expect(bookmark.categoryId).toBe('personal');
      expect(bookmark.createdAt).toBeDefined();
    });

    it('should generate unique IDs for bookmarks', () => {
      const location = { lat: 35.6762, lng: 139.6503 };
      
      const bookmark1 = bookmarkService.addBookmark(location, 'Location 1');
      const bookmark2 = bookmarkService.addBookmark(location, 'Location 2');

      expect(bookmark1.id).not.toBe(bookmark2.id);
    });

    it('should validate bookmark data', () => {
      // Test with invalid location - this will throw an error
      expect(() => {
        bookmarkService.addBookmark(null, 'Test');
      }).toThrow();

      // Test with empty name - should use default name
      const emptyNameBookmark = bookmarkService.addBookmark({ lat: 35.6762, lng: 139.6503 }, '');
      expect(emptyNameBookmark).toBeDefined();
      expect(emptyNameBookmark.name).toContain('ブックマーク');
    });
  });

  describe('Category Management', () => {
    it('should create default categories', () => {
      const categories = bookmarkService.getAllCategories();
      
      expect(categories).toBeDefined();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.find(cat => cat.id === 'personal')).toBeDefined();
    });

    it('should create a new category', () => {
      const name = 'Test Category';
      const color = '#ff0000';
      const icon = 'test-icon';

      const category = bookmarkService.createCategory(name, color, icon);

      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe('Test Category');
      expect(category.color).toBe('#ff0000');
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      // Add some test bookmarks
      bookmarkService.addBookmark(
        { lat: 35.6812, lng: 139.7671 },
        'Tokyo Station',
        'travel'
      );

      bookmarkService.addBookmark(
        { lat: 35.6598, lng: 139.7006 },
        'Shibuya Crossing',
        'personal'
      );
    });

    it('should search bookmarks by name', () => {
      const results = bookmarkService.searchBookmarks('Tokyo');
      
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Tokyo Station');
    });

    it('should filter bookmarks by category', () => {
      const results = bookmarkService.getBookmarksByCategory('travel');
      
      expect(results.length).toBe(1);
      expect(results[0].categoryId).toBe('travel');
    });
  });

  describe('Import/Export', () => {
    it('should export bookmarks to JSON', () => {
      bookmarkService.addBookmark(
        { lat: 35.6762, lng: 139.6503 },
        'Test Location'
      );

      const exported = bookmarkService.exportBookmarks('json');
      
      expect(exported).toBeDefined();
      expect(exported.content).toBeDefined();
      expect(typeof exported.content).toBe('string');
      
      const data = JSON.parse(exported.content);
      expect(data.bookmarks).toBeDefined();
      expect(data.categories).toBeDefined();
      expect(data.version).toBeDefined();
    });

    it('should validate import data', () => {
      const invalidData = '{"invalid": "data"}';
      
      // This should not throw but return 0 imported items
      const result = bookmarkService.importBookmarks(invalidData);
      expect(result).toBeDefined();
      expect(result.count).toBe(0);
      expect(result.success).toBe(true);
    });
  });
});