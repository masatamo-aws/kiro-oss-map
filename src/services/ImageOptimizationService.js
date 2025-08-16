/**
 * Image Optimization Service
 * Handles image loading, optimization, and caching
 * Version: 1.3.0
 */

class ImageOptimizationService {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.observer = null;
    this.supportedFormats = this.detectSupportedFormats();
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.preloadCriticalImages();
  }

  // Detect supported image formats
  detectSupportedFormats() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    
    return {
      webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
      avif: canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0,
      jpeg2000: canvas.toDataURL('image/jp2').indexOf('data:image/jp2') === 0
    };
  }

  // Setup intersection observer for lazy loading
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });
    }
  }

  // Optimize image URL based on device and format support
  optimizeImageUrl(originalUrl, options = {}) {
    const {
      width = null,
      height = null,
      quality = 80,
      format = 'auto',
      dpr = window.devicePixelRatio || 1
    } = options;

    // If it's a data URL or blob, return as-is
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
      return originalUrl;
    }

    // For external URLs, apply optimization parameters
    const url = new URL(originalUrl);
    
    // Determine optimal format
    let targetFormat = format;
    if (format === 'auto') {
      if (this.supportedFormats.avif) {
        targetFormat = 'avif';
      } else if (this.supportedFormats.webp) {
        targetFormat = 'webp';
      } else {
        targetFormat = 'jpeg';
      }
    }

    // Calculate optimal dimensions
    if (width || height) {
      const optimalWidth = width ? Math.ceil(width * dpr) : null;
      const optimalHeight = height ? Math.ceil(height * dpr) : null;
      
      if (optimalWidth) url.searchParams.set('w', optimalWidth);
      if (optimalHeight) url.searchParams.set('h', optimalHeight);
    }

    // Set quality and format
    url.searchParams.set('q', quality);
    url.searchParams.set('f', targetFormat);

    return url.toString();
  }

  // Load image with optimization and caching
  async loadOptimizedImage(src, options = {}) {
    const optimizedUrl = this.optimizeImageUrl(src, options);
    const cacheKey = `${optimizedUrl}_${JSON.stringify(options)}`;

    // Return cached image if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this.createImageLoadPromise(optimizedUrl, src, options);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  // Create image loading promise with fallbacks
  createImageLoadPromise(optimizedUrl, originalUrl, options) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set crossOrigin if needed
      if (this.isCrossOrigin(optimizedUrl)) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        resolve({
          element: img,
          url: optimizedUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: this.getImageFormat(optimizedUrl)
        });
      };

      img.onerror = () => {
        // Fallback to original URL
        if (optimizedUrl !== originalUrl) {
          const fallbackImg = new Image();
          if (this.isCrossOrigin(originalUrl)) {
            fallbackImg.crossOrigin = 'anonymous';
          }
          
          fallbackImg.onload = () => {
            resolve({
              element: fallbackImg,
              url: originalUrl,
              width: fallbackImg.naturalWidth,
              height: fallbackImg.naturalHeight,
              format: this.getImageFormat(originalUrl),
              fallback: true
            });
          };
          
          fallbackImg.onerror = () => reject(new Error('Failed to load image'));
          fallbackImg.src = originalUrl;
        } else {
          reject(new Error('Failed to load image'));
        }
      };

      img.src = optimizedUrl;
    });
  }

  // Check if URL is cross-origin
  isCrossOrigin(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  // Get image format from URL
  getImageFormat(url) {
    const extension = url.split('.').pop().toLowerCase().split('?')[0];
    return extension || 'unknown';
  }

  // Lazy load image element
  lazyLoad(imgElement, src, options = {}) {
    if (!imgElement) return;

    imgElement.dataset.src = src;
    imgElement.dataset.options = JSON.stringify(options);

    if (this.observer) {
      this.observer.observe(imgElement);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(imgElement);
    }
  }

  // Load image for element
  async loadImage(imgElement) {
    const src = imgElement.dataset.src;
    const options = JSON.parse(imgElement.dataset.options || '{}');

    if (!src) return;

    try {
      // Add loading class
      imgElement.classList.add('loading');

      const result = await this.loadOptimizedImage(src, options);
      
      // Update image element
      imgElement.src = result.url;
      imgElement.classList.remove('loading');
      imgElement.classList.add('loaded');

      // Dispatch load event
      imgElement.dispatchEvent(new CustomEvent('imageLoaded', {
        detail: result
      }));

    } catch (error) {
      imgElement.classList.remove('loading');
      imgElement.classList.add('error');
      
      // Dispatch error event
      imgElement.dispatchEvent(new CustomEvent('imageError', {
        detail: { error, src }
      }));
    }
  }

  // Preload critical images
  preloadCriticalImages() {
    const criticalImages = document.querySelectorAll('img[data-critical="true"]');
    criticalImages.forEach(img => {
      const src = img.dataset.src || img.src;
      if (src) {
        this.loadOptimizedImage(src, { quality: 90 });
      }
    });
  }

  // Compress image client-side
  async compressImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'image/jpeg'
    } = options;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, format, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      loadingPromises: this.loadingPromises.size,
      supportedFormats: this.supportedFormats
    };
  }
}

// Export singleton instance
export default new ImageOptimizationService();