/**
 * Search service for geocoding and POI search
 * Enhanced with offline capabilities in v1.3.0
 */
import OfflineSearchService from './OfflineSearchService.js';

export class SearchService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.offlineSearch = OfflineSearchService;
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[SearchService] Back online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[SearchService] Gone offline');
    });
  }

  async search(query, options = {}) {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    
    // Check memory cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    // If offline, use offline search
    if (!this.isOnline) {
      console.log('[SearchService] Searching offline');
      return await this.offlineSearch.searchOffline(query, options);
    }

    try {
      // Use Nominatim for geocoding
      const results = await this.searchNominatim(query, options);
      
      // Cache results in memory
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });
      
      // Cache results for offline use (background)
      if (results.length > 0) {
        // Use setTimeout to avoid blocking the main thread
        setTimeout(() => {
          this.offlineSearch.cacheSearchResults(query, results);
        }, 0);
      }

      return results;
    } catch (error) {
      console.error('Online search failed, trying offline:', error);
      
      // Fallback to offline search
      try {
        return await this.offlineSearch.searchOffline(query, options);
      } catch (offlineError) {
        console.error('Offline search also failed:', offlineError);
        throw error; // Throw original error
      }
    }
  }

  async searchNominatim(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: options.limit || 10,
      addressdetails: 1,
      extratags: 1,
      namedetails: 1,
      'accept-language': 'ja,en',
      countrycodes: options.countrycodes || 'jp'
    });

    // Add bounding box if provided
    if (options.bbox) {
      params.append('viewbox', options.bbox.join(','));
      params.append('bounded', '1');
    }

    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Kiro OSS Map/1.1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map(item => ({
        id: item.place_id,
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
        category: item.class,
        address: item.address,
        boundingbox: item.boundingbox,
        importance: item.importance || 0
      }));
    } catch (error) {
      console.error('Nominatim search failed:', error);
      throw new Error('検索サービスに接続できませんでした');
    }

  }



  async searchPOI(query, category = null, bbox = null, options = {}) {
    try {
      // Build Overpass query for POI search
      const overpassQuery = this.buildOverpassQuery(query, category, bbox, options);
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.parseOverpassResults(data);
    } catch (error) {
      console.error('POI search failed:', error);
      // Fallback to regular search
      return this.search(query, options);
    }
  }

  buildOverpassQuery(query, category, bbox, options) {
    const limit = options.limit || 50;
    const timeout = options.timeout || 25;
    
    let bboxStr = '';
    if (bbox) {
      bboxStr = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
    }

    let categoryFilter = '';
    if (category) {
      const categoryMap = {
        restaurant: 'amenity~"restaurant|cafe|fast_food"',
        hospital: 'amenity~"hospital|clinic|pharmacy"',
        atm: 'amenity~"atm|bank"',
        gas_station: 'amenity="fuel"',
        hotel: 'tourism~"hotel|guest_house"',
        shop: 'shop',
        school: 'amenity~"school|university|college"'
      };
      categoryFilter = categoryMap[category] || `amenity="${category}"`;
    }

    const queryFilter = query ? `["name"~"${query}",i]` : '';
    
    return `
      [out:json][timeout:${timeout}];
      (
        node[${categoryFilter}]${queryFilter}${bboxStr};
        way[${categoryFilter}]${queryFilter}${bboxStr};
        relation[${categoryFilter}]${queryFilter}${bboxStr};
      );
      out center ${limit};
    `;
  }

  parseOverpassResults(data) {
    return data.elements.map(element => {
      const lat = element.lat || (element.center && element.center.lat);
      const lon = element.lon || (element.center && element.center.lon);
      
      return {
        id: `osm-${element.type}-${element.id}`,
        name: element.tags.name || element.tags.brand || 'Unknown',
        displayName: this.buildDisplayName(element.tags),
        latitude: lat,
        longitude: lon,
        address: this.buildAddressFromTags(element.tags),
        category: this.getCategoryFromTags(element.tags),
        tags: element.tags,
        type: element.type,
        osmId: element.id
      };
    }).filter(item => item.latitude && item.longitude);
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
        fuel: 'ガソリンスタンド'
      },
      shop: {
        supermarket: 'スーパーマーケット',
        convenience: 'コンビニ',
        clothes: '衣料品店'
      },
      tourism: {
        hotel: 'ホテル',
        attraction: '観光地'
      }
    };

    if (item.class && item.type) {
      return categoryMap[item.class]?.[item.type] || item.type;
    }
    
    return item.category || '';
  }

  buildDisplayName(tags) {
    const parts = [];
    if (tags.name) parts.push(tags.name);
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    
    return parts.join(', ');
  }

  buildAddressFromTags(tags) {
    const parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    
    return parts.join(', ');
  }

  getCategoryFromTags(tags) {
    if (tags.amenity) return tags.amenity;
    if (tags.shop) return tags.shop;
    if (tags.tourism) return tags.tourism;
    if (tags.leisure) return tags.leisure;
    return 'other';
  }

  async getSuggestions(query, options = {}) {
    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = `suggestions:${query}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const results = await this.searchNominatim(query, {
        ...options,
        limit: 5
      });

      // Cache suggestions
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      console.error('Suggestions failed:', error);
      return [];
    }
  }

  clearCache() {
    this.cache.clear();
  }
}