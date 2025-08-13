import { Logger } from '../utils/Logger.js';

/**
 * Image service for fetching location images
 */
export class ImageService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
  }

  async getLocationImage(location) {
    const cacheKey = `image:${location.name}:${location.latitude}:${location.longitude}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      // Try multiple image sources
      const imageUrl = await this.searchLocationImage(location);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: imageUrl,
        timestamp: Date.now()
      });

      return imageUrl;
    } catch (error) {
      Logger.error('Failed to get location image', error, 'image-service');
      return null;
    }
  }

  async searchLocationImage(location) {
    // Try Wikipedia/Wikimedia Commons first
    const wikiImage = await this.getWikipediaImage(location);
    if (wikiImage) return wikiImage;

    // Try Mapillary street view images
    const mapillaryImage = await this.getMapillaryImage(location);
    if (mapillaryImage) return mapillaryImage;

    // Fallback to generated image
    return this.generatePlaceholderImage(location);
  }

  async getWikipediaImage(location) {
    try {
      // Search Wikipedia for the location
      const searchQuery = encodeURIComponent(location.name);
      const searchUrl = `https://ja.wikipedia.org/api/rest_v1/page/summary/${searchQuery}`;
      
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.thumbnail && data.thumbnail.source) {
          return {
            url: data.thumbnail.source,
            source: 'Wikipedia',
            attribution: 'Wikipedia',
            description: data.extract || ''
          };
        }
      }
    } catch (error) {
      Logger.debug('Wikipedia image search failed', error);
    }
    
    return null;
  }

  async getMapillaryImage(location) {
    try {
      // Note: This would require Mapillary API key in a real implementation
      // For now, we'll return null
      return null;
    } catch (error) {
      Logger.debug('Mapillary image search failed', error);
      return null;
    }
  }

  generatePlaceholderImage(location) {
    // Generate a placeholder image using a service like Unsplash or Picsum
    const category = this.getCategoryKeyword(location.category);
    const unsplashUrl = `https://source.unsplash.com/400x300/?${category},japan,landmark`;
    
    return {
      url: unsplashUrl,
      source: 'Unsplash',
      attribution: 'Unsplash',
      description: `${location.name}の画像`
    };
  }

  getCategoryKeyword(category) {
    const categoryMap = {
      'レストラン': 'restaurant',
      'カフェ': 'cafe',
      '病院': 'hospital',
      '学校': 'school',
      '銀行': 'bank',
      'ATM': 'atm',
      'ガソリンスタンド': 'gas-station',
      'ホテル': 'hotel',
      '観光地': 'tourist-attraction',
      '博物館': 'museum',
      '公園': 'park',
      '駅': 'train-station',
      '空港': 'airport'
    };

    return categoryMap[category] || 'landmark';
  }

  async getStreetViewImage(latitude, longitude, options = {}) {
    // Generate a street view-like image URL
    // This could use Google Street View Static API (requires API key)
    // or Mapillary API for open street view images
    
    const size = options.size || '400x300';
    const heading = options.heading || 0;
    const pitch = options.pitch || 0;
    
    // For demo purposes, return a placeholder
    return {
      url: `https://via.placeholder.com/${size}/3b82f6/ffffff?text=Street+View`,
      source: 'Placeholder',
      attribution: 'Demo',
      description: 'ストリートビュー画像（デモ）'
    };
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}