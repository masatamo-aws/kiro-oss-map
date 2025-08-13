/**
 * Share service for creating and managing shared URLs
 */
export class ShareService {
  constructor() {
    this.baseUrl = window.location.origin;
    this.apiBaseUrl = '/api/v1';
  }

  async createShareUrl(data) {
    try {
      // For now, use URL parameters for sharing
      // In production, this would use a backend service
      return this.createParameterUrl(data);
    } catch (error) {
      console.error('Failed to create share URL:', error);
      throw error;
    }
  }

  createParameterUrl(data) {
    const params = new URLSearchParams();

    if (data.type === 'location') {
      params.set('lat', data.center[1]);
      params.set('lng', data.center[0]);
      params.set('zoom', data.zoom || 15);
      
      if (data.marker) {
        params.set('marker', '1');
        params.set('title', data.marker.title || '');
      }
    } else if (data.type === 'route') {
      params.set('route', '1');
      params.set('origin', `${data.origin[1]},${data.origin[0]}`);
      params.set('destination', `${data.destination[1]},${data.destination[0]}`);
      params.set('profile', data.profile || 'driving');
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  async createShortUrl(longUrl) {
    try {
      // This would typically use a URL shortening service
      // For now, return the original URL
      return longUrl;
    } catch (error) {
      console.error('Failed to create short URL:', error);
      return longUrl;
    }
  }

  async getSharedData(shareId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/share/${shareId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get shared data: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get shared data:', error);
      throw error;
    }
  }

  parseUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const data = {};

    // Check for location sharing
    const lat = params.get('lat');
    const lng = params.get('lng');
    const zoom = params.get('zoom');

    if (lat && lng) {
      data.type = 'location';
      data.center = [parseFloat(lng), parseFloat(lat)];
      data.zoom = zoom ? parseInt(zoom) : 15;
      
      if (params.get('marker')) {
        data.marker = {
          title: params.get('title') || '共有地点'
        };
      }
    }

    // Check for route sharing
    const route = params.get('route');
    const origin = params.get('origin');
    const destination = params.get('destination');
    const profile = params.get('profile');

    if (route && origin && destination) {
      const [originLat, originLng] = origin.split(',').map(parseFloat);
      const [destLat, destLng] = destination.split(',').map(parseFloat);
      
      data.type = 'route';
      data.origin = [originLng, originLat];
      data.destination = [destLng, destLat];
      data.profile = profile || 'driving';
    }

    return Object.keys(data).length > 0 ? data : null;
  }

  async shareLocation(center, zoom, marker = null) {
    const data = {
      type: 'location',
      center,
      zoom,
      marker
    };

    const url = await this.createShareUrl(data);
    return this.shareUrl(url, '地点を共有');
  }

  async shareRoute(origin, destination, profile = 'driving') {
    const data = {
      type: 'route',
      origin,
      destination,
      profile
    };

    const url = await this.createShareUrl(data);
    return this.shareUrl(url, 'ルートを共有');
  }

  async shareUrl(url, title = 'Kiro OSS Map') {
    // Try native Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url
        });
        return { success: true, method: 'native' };
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Native share failed:', error);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      return { 
        success: true, 
        method: 'clipboard',
        url,
        message: 'URLをクリップボードにコピーしました'
      };
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }

    // Final fallback - return URL for manual sharing
    return {
      success: true,
      method: 'manual',
      url,
      message: 'URLをコピーして共有してください'
    };
  }

  generateEmbedCode(data, options = {}) {
    const width = options.width || 400;
    const height = options.height || 300;
    const url = this.createParameterUrl(data);
    
    return `<iframe src="${url}&embed=1" width="${width}" height="${height}" frameborder="0" style="border:0;" allowfullscreen="" aria-hidden="false" tabindex="0"></iframe>`;
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  }

  getShareableUrl() {
    return window.location.href;
  }

  updateUrl(data, replaceState = true) {
    const url = this.createParameterUrl(data);
    
    if (replaceState) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  }
}