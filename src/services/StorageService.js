/**
 * Storage service for managing local data with encryption support
 */
export class StorageService {
  constructor() {
    this.prefix = 'kiro-oss-map-';
    this.isSupported = this.checkSupport();
    this.encryptionEnabled = true;
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  checkSupport() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Encryption methods
  getOrCreateEncryptionKey() {
    let key = localStorage.getItem('kiro-encryption-key');
    if (!key) {
      // Generate a simple key based on browser fingerprint
      const fingerprint = this.generateBrowserFingerprint();
      key = this.simpleHash(fingerprint);
      localStorage.setItem('kiro-encryption-key', key);
    }
    return key;
  }

  generateBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    return [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  generateSalt() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    for (let i = 0; i < 16; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
  }

  deriveKey(baseKey, salt) {
    // Simple key derivation function
    let derivedKey = baseKey + salt;
    for (let i = 0; i < 1000; i++) {
      derivedKey = this.simpleHash(derivedKey);
    }
    return derivedKey;
  }

  simpleDecrypt(encryptedText) {
    // Fallback for old simple encryption
    try {
      const encrypted = atob(encryptedText);
      let decrypted = '';
      const key = this.encryptionKey;
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      
      return decrypted;
    } catch (error) {
      console.warn('Simple decryption failed, returning as is:', error);
      return encryptedText;
    }
  }

  encrypt(text) {
    if (!this.encryptionEnabled || !text) return text;
    
    try {
      // Enhanced encryption with salt and multiple rounds
      const salt = this.generateSalt();
      const key = this.deriveKey(this.encryptionKey, salt);
      
      // Multiple rounds of XOR encryption
      let encrypted = text;
      for (let round = 0; round < 3; round++) {
        let roundEncrypted = '';
        for (let i = 0; i < encrypted.length; i++) {
          const keyChar = key.charCodeAt((i + round) % key.length);
          const textChar = encrypted.charCodeAt(i);
          roundEncrypted += String.fromCharCode(textChar ^ keyChar ^ (round + 1));
        }
        encrypted = roundEncrypted;
      }
      
      // Combine salt and encrypted data
      const combined = salt + '|' + encrypted;
      
      // Base64 encode to make it safe for storage
      return btoa(combined);
    } catch (error) {
      console.warn('Encryption failed, storing as plain text:', error);
      return text;
    }
  }

  decrypt(encryptedText) {
    if (!this.encryptionEnabled || !encryptedText) return encryptedText;
    
    try {
      // Base64 decode first
      const combined = atob(encryptedText);
      
      // Split salt and encrypted data
      const parts = combined.split('|');
      if (parts.length !== 2) {
        // Fallback to old simple decryption
        return this.simpleDecrypt(encryptedText);
      }
      
      const salt = parts[0];
      let encrypted = parts[1];
      const key = this.deriveKey(this.encryptionKey, salt);
      
      // Multiple rounds of XOR decryption (reverse order)
      for (let round = 2; round >= 0; round--) {
        let roundDecrypted = '';
        for (let i = 0; i < encrypted.length; i++) {
          const keyChar = key.charCodeAt((i + round) % key.length);
          const encryptedChar = encrypted.charCodeAt(i);
          roundDecrypted += String.fromCharCode(encryptedChar ^ keyChar ^ (round + 1));
        }
        encrypted = roundDecrypted;
      }
      
      return encrypted;
    } catch (error) {
      console.warn('Decryption failed, trying fallback:', error);
      return this.simpleDecrypt(encryptedText);
    }
  }

  set(key, value, expiry = null, encrypt = true) {
    if (!this.isSupported) return false;

    try {
      const data = {
        value,
        timestamp: Date.now(),
        expiry: expiry ? Date.now() + expiry : null,
        encrypted: encrypt && this.encryptionEnabled
      };

      let serializedData = JSON.stringify(data);
      
      // Encrypt sensitive data
      if (encrypt && this.encryptionEnabled && this.isSensitiveData(key)) {
        serializedData = this.encrypt(serializedData);
      }

      localStorage.setItem(this.prefix + key, serializedData);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  get(key, defaultValue = null) {
    if (!this.isSupported) return defaultValue;

    try {
      let item = localStorage.getItem(this.prefix + key);
      if (!item) return defaultValue;

      // Try to decrypt if it's sensitive data
      if (this.encryptionEnabled && this.isSensitiveData(key)) {
        try {
          item = this.decrypt(item);
        } catch (decryptError) {
          console.warn('Failed to decrypt data, trying as plain text:', decryptError);
        }
      }

      const data = JSON.parse(item);
      
      // Check if expired
      if (data.expiry && Date.now() > data.expiry) {
        this.remove(key);
        return defaultValue;
      }

      return data.value;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  isSensitiveData(key) {
    const sensitiveKeys = [
      'bookmarks',
      'bookmark_categories', 
      'bookmark-categories',
      'search-history',
      'user-preferences',
      'measurement-history',
      'route-history',
      'share-history'
    ];
    return sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));
  }

  remove(key) {
    if (!this.isSupported) return false;

    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  clear() {
    if (!this.isSupported) return false;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }

  has(key) {
    if (!this.isSupported) return false;
    return localStorage.getItem(this.prefix + key) !== null;
  }

  keys() {
    if (!this.isSupported) return [];

    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.substring(this.prefix.length));
    } catch (error) {
      console.error('Failed to get keys from localStorage:', error);
      return [];
    }
  }

  size() {
    return this.keys().length;
  }

  // Specific methods for common data types

  setSearchHistory(history) {
    return this.set('search-history', history, 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  getSearchHistory() {
    return this.get('search-history', []);
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
    
    return this.setSearchHistory(trimmed);
  }

  setBookmarks(bookmarks) {
    return this.set('bookmarks', bookmarks);
  }

  getBookmarks() {
    return this.get('bookmarks', []);
  }

  addBookmark(bookmark) {
    const bookmarks = this.getBookmarks();
    
    // Check if already exists
    const exists = bookmarks.some(b => 
      Math.abs(b.latitude - bookmark.latitude) < 0.0001 &&
      Math.abs(b.longitude - bookmark.longitude) < 0.0001
    );

    if (!exists) {
      bookmarks.push({
        ...bookmark,
        id: Date.now().toString(),
        timestamp: Date.now()
      });
      
      return this.setBookmarks(bookmarks);
    }

    return false;
  }

  removeBookmark(id) {
    const bookmarks = this.getBookmarks();
    const filtered = bookmarks.filter(b => b.id !== id);
    return this.setBookmarks(filtered);
  }

  setUserPreferences(preferences) {
    return this.set('user-preferences', preferences);
  }

  getUserPreferences() {
    return this.get('user-preferences', {
      units: 'metric',
      language: 'ja',
      defaultZoom: 10,
      defaultCenter: [139.7671, 35.6812], // Tokyo
      routeProfile: 'driving'
    });
  }

  updateUserPreference(key, value) {
    const preferences = this.getUserPreferences();
    preferences[key] = value;
    return this.setUserPreferences(preferences);
  }

  // Cache management for API responses
  setCache(key, data, ttl = 5 * 60 * 1000) { // 5 minutes default
    return this.set(`cache-${key}`, data, ttl);
  }

  getCache(key) {
    return this.get(`cache-${key}`);
  }

  clearCache() {
    const keys = this.keys();
    keys.forEach(key => {
      if (key.startsWith('cache-')) {
        this.remove(key);
      }
    });
  }

  // Offline data management
  setOfflineData(key, data) {
    return this.set(`offline-${key}`, data);
  }

  getOfflineData(key) {
    return this.get(`offline-${key}`);
  }

  // Storage usage information
  getStorageUsage() {
    if (!this.isSupported) return { used: 0, available: 0 };

    try {
      let used = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          used += localStorage.getItem(key).length;
        }
      });

      // Estimate available space (localStorage typically has 5-10MB limit)
      const estimated = 5 * 1024 * 1024; // 5MB
      
      return {
        used: used,
        available: Math.max(0, estimated - used),
        percentage: (used / estimated) * 100
      };
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  // Cleanup old data
  cleanup() {
    const keys = this.keys();
    let cleaned = 0;

    keys.forEach(key => {
      try {
        const item = localStorage.getItem(this.prefix + key);
        if (item) {
          const data = JSON.parse(item);
          
          // Remove expired items
          if (data.expiry && Date.now() > data.expiry) {
            this.remove(key);
            cleaned++;
          }
        }
      } catch (error) {
        // Remove corrupted items
        this.remove(key);
        cleaned++;
      }
    });

    return cleaned;
  }
}