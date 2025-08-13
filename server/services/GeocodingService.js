import fetch from 'node-fetch';

/**
 * Geocoding service using Nominatim API
 */
export class GeocodingService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'Kiro OSS Map/1.0';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async search(query, options = {}) {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: options.limit || 10,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        'accept-language': 'ja,en'
      });

      if (options.bbox) {
        params.append('viewbox', options.bbox.join(','));
        params.append('bounded', '1');
      }

      if (options.countrycodes) {
        params.append('countrycodes', options.countrycodes.join(','));
      }

      const url = `${this.baseUrl}/search?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      
      const results = data.map(item => ({
        id: item.place_id,
        name: item.display_name.split(',')[0],
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        address: this.parseAddress(item.address),
        category: this.parseCategory(item),
        importance: parseFloat(item.importance) || 0,
        boundingBox: item.boundingbox ? {
          north: parseFloat(item.boundingbox[1]),
          south: parseFloat(item.boundingbox[0]),
          east: parseFloat(item.boundingbox[3]),
          west: parseFloat(item.boundingbox[2])
        } : null,
        type: item.type,
        class: item.class
      }));

      // Cache results
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      console.error('Geocoding search failed:', error);
      throw error;
    }
  }

  async reverseGeocode(latitude, longitude, options = {}) {
    const cacheKey = `reverse:${latitude}:${longitude}:${options.zoom || 18}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
        zoom: options.zoom || 18,
        'accept-language': 'ja,en'
      });

      const url = `${this.baseUrl}/reverse?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      
      const result = {
        name: data.display_name.split(',')[0],
        displayName: data.display_name,
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        address: this.parseAddress(data.address),
        category: this.parseCategory(data),
        type: data.type,
        class: data.class
      };

      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw error;
    }
  }

  async searchPOI(query, options = {}) {
    // For POI search, we can use the regular search with category filtering
    // In a real implementation, you might use Overpass API for more detailed POI data
    
    let searchQuery = query;
    if (options.category) {
      searchQuery += ` ${options.category}`;
    }

    const searchOptions = {
      ...options,
      limit: options.limit || 20
    };

    return this.search(searchQuery, searchOptions);
  }

  parseAddress(address) {
    if (!address) return '';
    
    const parts = [];
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    if (address.suburb) parts.push(address.suburb);
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
  }

  parseCategory(item) {
    const categoryMap = {
      amenity: {
        restaurant: 'レストラン',
        cafe: 'カフェ',
        hospital: '病院',
        school: '学校',
        bank: '銀行',
        atm: 'ATM',
        fuel: 'ガソリンスタンド',
        pharmacy: '薬局',
        post_office: '郵便局',
        police: '警察署',
        fire_station: '消防署'
      },
      shop: {
        supermarket: 'スーパーマーケット',
        convenience: 'コンビニ',
        clothes: '衣料品店',
        bakery: 'パン屋',
        butcher: '肉屋',
        car: '自動車販売店'
      },
      tourism: {
        hotel: 'ホテル',
        attraction: '観光地',
        museum: '博物館',
        viewpoint: '展望台'
      },
      leisure: {
        park: '公園',
        playground: '遊び場',
        sports_centre: 'スポーツセンター'
      }
    };

    if (item.class && item.type) {
      return categoryMap[item.class]?.[item.type] || item.type;
    }
    
    return item.category || '';
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