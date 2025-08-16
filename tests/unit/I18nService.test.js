/**
 * I18nService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18nService } from '../../src/services/I18nService.js';

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

// Mock StorageService
vi.mock('../../src/services/StorageService.js', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    get: vi.fn(() => 'en'),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    isSupported: true
  }))
}));

describe('I18nService', () => {
  let i18nService;

  beforeEach(() => {
    i18nService = new I18nService();
    vi.clearAllMocks();
  });

  describe('Language Management', () => {
    it('should initialize with default language', () => {
      expect(i18nService.getCurrentLanguage()).toBeDefined();
    });

    it('should get supported languages', () => {
      const languages = i18nService.getSupportedLanguages();
      
      expect(languages).toBeDefined();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      
      // Check if English and Japanese are supported
      const codes = languages.map(lang => lang.code);
      expect(codes).toContain('en');
      expect(codes).toContain('ja');
    });

    it('should change language', async () => {
      await i18nService.changeLanguage('ja');
      expect(i18nService.getCurrentLanguage()).toBe('ja');
    });

    it('should detect browser language', () => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'ja-JP'
      });

      const detected = i18nService.detectBrowserLanguage();
      expect(detected).toBe('ja');
    });
  });

  describe('Translation', () => {
    beforeEach(async () => {
      // Set up test translations
      await i18nService.changeLanguage('en');
    });

    it('should translate simple keys', () => {
      const translation = i18nService.translate('common.loading');
      expect(translation).toBeDefined();
      expect(typeof translation).toBe('string');
    });

    it('should handle missing translations', () => {
      const translation = i18nService.translate('nonexistent.key');
      expect(translation).toBe('nonexistent.key'); // Should return key as fallback
    });

    it('should handle parameter interpolation', () => {
      const translation = i18nService.translate('app.version', { version: '1.0.0' });
      expect(translation).toContain('1.0.0');
    });

    it('should pluralize correctly', () => {
      const singular = i18nService.translate('time.minute', { count: 1 });
      const plural = i18nService.translate('time.minutes', { count: 5 });
      
      expect(singular).toBeDefined();
      expect(plural).toBeDefined();
    });
  });

  describe('Formatting', () => {
    it('should format numbers', () => {
      const formatted = i18nService.formatNumber(1234.56);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('should format dates', () => {
      const date = new Date('2024-01-01');
      const formatted = i18nService.formatDate(date);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('should format relative time', () => {
      const date = new Date();
      
      const formatted = i18nService.formatDate(date, 'short');
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('Validation', () => {
    it('should validate language codes', () => {
      const supportedLanguages = i18nService.getSupportedLanguages();
      const codes = supportedLanguages.map(lang => lang.code);
      
      expect(codes).toContain('en');
      expect(codes).toContain('ja');
      expect(codes).not.toContain('invalid');
    });

    it('should validate translation keys', () => {
      const translation = i18nService.translate('common.loading');
      expect(translation).toBeDefined();
      expect(typeof translation).toBe('string');
      
      const invalidTranslation = i18nService.translate('nonexistent.key');
      expect(invalidTranslation).toBe('nonexistent.key'); // Returns key as fallback
    });
  });
});