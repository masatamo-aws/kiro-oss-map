import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

/**
 * Share service for creating and managing shared content
 */
export class ShareService {
  constructor() {
    this.baseUrl = window.location.origin;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Create a shareable URL for the current map state
   * @param {Object} shareData - Map state data to share
   * @returns {Promise<string>} - Generated share URL
   */
  async createShareUrl(shareData) {
    try {
      // Use Web Workers for large data processing
      if (this.isLargeDataset(shareData)) {
        return await this.createShareUrlWithWorker(shareData);
      }

      const params = new URLSearchParams();
      
      // Basic map parameters
      if (shareData.center) {
        params.set('lat', shareData.center[1].toFixed(6));
        params.set('lng', shareData.center[0].toFixed(6));
      }
      
      if (shareData.zoom) {
        params.set('zoom', shareData.zoom.toString());
      }
      
      if (shareData.style) {
        params.set('style', shareData.style);
      }
      
      if (shareData.theme) {
        params.set('theme', shareData.theme);
      }
      
      // Optimized markers processing
      if (shareData.markers && shareData.markers.length > 0) {
        const markersData = this.optimizeMarkersData(shareData.markers);
        if (markersData.length > 0) {
          params.set('markers', this.compressData(JSON.stringify(markersData)));
        }
      }
      
      // Route information
      if (shareData.route) {
        const routeData = {
          origin: shareData.route.origin,
          destination: shareData.route.destination,
          profile: shareData.route.profile || 'driving'
        };
        params.set('route', JSON.stringify(routeData));
      }
      
      // Optimized measurement data
      if (shareData.measurements && shareData.measurements.length > 0) {
        const optimizedMeasurements = this.optimizeMeasurementsData(shareData.measurements);
        params.set('measurements', this.compressData(JSON.stringify(optimizedMeasurements)));
      }
      
      // Add timestamp for cache busting
      params.set('t', Date.now().toString());
      
      const shareUrl = `${this.baseUrl}?${params.toString()}`;
      
      // Cache the generated URL with TTL
      this.cacheWithTTL(shareUrl, shareData);
      
      Logger.info('Share URL created', { url: shareUrl, dataSize: this.getDataSize(shareData) });
      return shareUrl;
      
    } catch (error) {
      Logger.error('Failed to create share URL', error, 'share-service');
      throw new Error('共有URLの作成に失敗しました');
    }
  }

  /**
   * Check if dataset is large and needs optimization
   */
  isLargeDataset(shareData) {
    const markerCount = shareData.markers ? shareData.markers.length : 0;
    const measurementCount = shareData.measurements ? shareData.measurements.length : 0;
    return markerCount > 20 || measurementCount > 10;
  }

  /**
   * Create share URL using Web Worker for large datasets
   */
  async createShareUrlWithWorker(shareData) {
    return new Promise((resolve, reject) => {
      // Create inline worker for data processing
      const workerCode = `
        self.onmessage = function(e) {
          const { shareData } = e.data;
          
          try {
            // Optimize markers
            const optimizedMarkers = shareData.markers ? shareData.markers.slice(0, 50).map(marker => ({
              lat: parseFloat(marker.coordinates[1].toFixed(4)),
              lng: parseFloat(marker.coordinates[0].toFixed(4)),
              name: marker.name ? marker.name.substring(0, 50) : '',
              type: marker.type || 'default'
            })) : [];
            
            // Optimize measurements
            const optimizedMeasurements = shareData.measurements ? shareData.measurements.slice(0, 20) : [];
            
            const result = {
              ...shareData,
              markers: optimizedMarkers,
              measurements: optimizedMeasurements
            };
            
            self.postMessage({ success: true, data: result });
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timeout'));
      }, 3000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(blob);

        if (e.data.success) {
          // Continue with optimized data
          this.createShareUrl(e.data.data).then(resolve).catch(reject);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(blob);
        reject(error);
      };

      worker.postMessage({ shareData });
    });
  }

  /**
   * Optimize markers data for sharing
   */
  optimizeMarkersData(markers) {
    // Limit number of markers and reduce precision
    return markers.slice(0, 50).map(marker => ({
      lat: parseFloat(marker.coordinates[1].toFixed(4)),
      lng: parseFloat(marker.coordinates[0].toFixed(4)),
      name: marker.name ? marker.name.substring(0, 50) : '',
      type: marker.type || 'default'
    }));
  }

  /**
   * Optimize measurements data for sharing
   */
  optimizeMeasurementsData(measurements) {
    return measurements.slice(0, 20).map(measurement => ({
      type: measurement.type,
      value: parseFloat(measurement.value.toFixed(2)),
      unit: measurement.unit,
      coordinates: measurement.coordinates ? measurement.coordinates.map(coord => 
        coord.map(c => parseFloat(c.toFixed(4)))
      ) : null
    }));
  }

  /**
   * Simple data compression using base64 encoding
   */
  compressData(data) {
    try {
      return btoa(encodeURIComponent(data));
    } catch (error) {
      Logger.warn('Data compression failed, using original data', error);
      return data;
    }
  }

  /**
   * Decompress data
   */
  decompressData(compressedData) {
    try {
      return decodeURIComponent(atob(compressedData));
    } catch (error) {
      Logger.warn('Data decompression failed, using as is', error);
      return compressedData;
    }
  }

  /**
   * Cache with TTL
   */
  cacheWithTTL(key, data) {
    // Clean old cache entries
    this.cleanCache();
    
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get data size estimation
   */
  getDataSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Parse URL parameters and restore map state
   * @param {string} url - URL to parse (optional, uses current URL if not provided)
   * @returns {Object|null} - Parsed share data or null if no share data found
   */
  parseShareUrl(url = window.location.href) {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      const shareData = {};
      
      // Parse basic map parameters
      const lat = params.get('lat');
      const lng = params.get('lng');
      const zoom = params.get('zoom');
      
      if (lat && lng) {
        shareData.center = [parseFloat(lng), parseFloat(lat)];
      }
      
      if (zoom) {
        shareData.zoom = parseInt(zoom);
      }
      
      if (params.get('style')) {
        shareData.style = params.get('style');
      }
      
      if (params.get('theme')) {
        shareData.theme = params.get('theme');
      }
      
      // Parse markers
      const markersParam = params.get('markers');
      if (markersParam) {
        try {
          const markersData = JSON.parse(markersParam);
          shareData.markers = markersData.map(marker => ({
            coordinates: [marker.lng, marker.lat],
            name: marker.name,
            type: marker.type
          }));
        } catch (e) {
          Logger.warn('Failed to parse markers from URL', e);
        }
      }
      
      // Parse route
      const routeParam = params.get('route');
      if (routeParam) {
        try {
          shareData.route = JSON.parse(routeParam);
        } catch (e) {
          Logger.warn('Failed to parse route from URL', e);
        }
      }
      
      // Parse measurements
      const measurementsParam = params.get('measurements');
      if (measurementsParam) {
        try {
          shareData.measurements = JSON.parse(measurementsParam);
        } catch (e) {
          Logger.warn('Failed to parse measurements from URL', e);
        }
      }
      
      // Return null if no share data found
      if (Object.keys(shareData).length === 0) {
        return null;
      }
      
      Logger.info('Share URL parsed', { data: shareData });
      return shareData;
      
    } catch (error) {
      Logger.error('Failed to parse share URL', error, 'share-service');
      return null;
    }
  }

  /**
   * Create a short URL using a URL shortening service
   * @param {string} longUrl - Long URL to shorten
   * @returns {Promise<string>} - Shortened URL
   */
  async createShortUrl(longUrl) {
    try {
      // For now, return the original URL
      // In the future, integrate with a URL shortening service
      Logger.info('Short URL requested', { originalUrl: longUrl });
      return longUrl;
      
    } catch (error) {
      Logger.error('Failed to create short URL', error, 'share-service');
      return longUrl; // Fallback to original URL
    }
  }

  /**
   * Share using native Web Share API or fallback to clipboard
   * @param {Object} shareData - Data to share
   * @returns {Promise<boolean>} - Success status
   */
  async shareNative(shareData) {
    try {
      const shareUrl = await this.createShareUrl(shareData);
      
      const sharePayload = {
        title: 'Kiro OSS Map - 地図を共有',
        text: shareData.description || '地図の場所を共有します',
        url: shareUrl
      };
      
      // Try native share API first
      if (navigator.share && this.canUseNativeShare()) {
        await navigator.share(sharePayload);
        Logger.info('Native share completed', sharePayload);
        return true;
      }
      
      // Fallback to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        Logger.info('URL copied to clipboard', { url: shareUrl });
        
        // Show success notification
        EventBus.emit('notification:show', {
          type: 'success',
          message: 'URLをクリップボードにコピーしました',
          duration: 3000
        });
        
        return true;
      }
      
      // Last resort: select and copy
      this.fallbackCopyToClipboard(shareUrl);
      return true;
      
    } catch (error) {
      Logger.error('Native share failed', error, 'share-service');
      
      EventBus.emit('notification:show', {
        type: 'error',
        message: '共有に失敗しました',
        duration: 3000
      });
      
      return false;
    }
  }

  /**
   * Check if native share API can be used
   * @returns {boolean} - Whether native share is available
   */
  canUseNativeShare() {
    return navigator.share && 
           (navigator.userAgent.includes('Mobile') || 
            navigator.userAgent.includes('Android') ||
            navigator.userAgent.includes('iPhone'));
  }

  /**
   * Fallback method to copy text to clipboard
   * @param {string} text - Text to copy
   */
  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      EventBus.emit('notification:show', {
        type: 'success',
        message: 'URLをクリップボードにコピーしました',
        duration: 3000
      });
    } catch (err) {
      Logger.error('Fallback copy failed', err);
      EventBus.emit('notification:show', {
        type: 'error',
        message: 'コピーに失敗しました',
        duration: 3000
      });
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Generate embed code for iframe integration
   * @param {Object} shareData - Map state data
   * @param {Object} options - Embed options (width, height, etc.)
   * @returns {Promise<string>} - Generated embed code
   */
  async generateEmbedCode(shareData, options = {}) {
    try {
      const shareUrl = await this.createShareUrl(shareData);
      const width = options.width || 600;
      const height = options.height || 400;
      const title = options.title || 'Kiro OSS Map';
      
      const embedCode = `<iframe 
  src="${shareUrl}&embed=true" 
  width="${width}" 
  height="${height}" 
  frameborder="0" 
  style="border:0;" 
  allowfullscreen="" 
  aria-hidden="false" 
  tabindex="0"
  title="${title}">
</iframe>`;
      
      Logger.info('Embed code generated', { shareUrl, options });
      return embedCode;
      
    } catch (error) {
      Logger.error('Failed to generate embed code', error, 'share-service');
      throw new Error('埋め込みコードの生成に失敗しました');
    }
  }

  /**
   * Share to specific social media platforms
   * @param {string} platform - Platform name (twitter, facebook, line)
   * @param {Object} shareData - Data to share
   * @returns {Promise<void>}
   */
  async shareToSocialMedia(platform, shareData) {
    try {
      const shareUrl = await this.createShareUrl(shareData);
      const text = shareData.description || '地図を共有します';
      
      let socialUrl;
      
      switch (platform.toLowerCase()) {
        case 'twitter':
          socialUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
          break;
          
        case 'facebook':
          socialUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
          break;
          
        case 'line':
          socialUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
          break;
          
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      // Open in new window
      const popup = window.open(
        socialUrl,
        `share-${platform}`,
        'width=600,height=400,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        throw new Error('Popup blocked');
      }
      
      Logger.info('Social media share opened', { platform, url: socialUrl });
      
    } catch (error) {
      Logger.error('Social media share failed', error, 'share-service');
      throw new Error(`${platform}での共有に失敗しました`);
    }
  }

  /**
   * Get current map state for sharing
   * @returns {Object} - Current map state
   */
  getCurrentMapState() {
    try {
      // Get map service from global app
      const mapService = window.app?.services?.map;
      if (!mapService || !mapService.isInitialized) {
        throw new Error('Map service not available');
      }
      
      const center = mapService.getCenter();
      const zoom = mapService.getZoom();
      const style = mapService.currentStyle;
      
      // Get theme from theme service
      const themeService = window.app?.services?.theme;
      const theme = themeService?.getCurrentTheme() || 'light';
      
      // Get active markers
      const markers = Array.from(mapService.markers.values()).map(markerData => ({
        coordinates: markerData.coordinates,
        name: markerData.title,
        type: markerData.options.type || 'default'
      }));
      
      // Get current route if any
      let route = null;
      const routePanel = document.querySelector('route-panel');
      if (routePanel && routePanel.currentRoute) {
        route = {
          origin: routePanel.origin?.location,
          destination: routePanel.destination?.location,
          profile: routePanel.profile
        };
      }
      
      // Get measurements if any
      let measurements = [];
      const measurementService = window.app?.services?.measurement;
      if (measurementService) {
        measurements = measurementService.getMeasurements();
      }
      
      return {
        center: [center.lng, center.lat],
        zoom,
        style,
        theme,
        markers: markers.length > 0 ? markers : undefined,
        route: route,
        measurements: measurements.length > 0 ? measurements : undefined,
        timestamp: Date.now()
      };
      
    } catch (error) {
      Logger.error('Failed to get current map state', error, 'share-service');
      throw new Error('現在の地図状態の取得に失敗しました');
    }
  }

  /**
   * Clear share cache
   */
  clearCache() {
    this.cache.clear();
    Logger.info('Share cache cleared');
  }
}