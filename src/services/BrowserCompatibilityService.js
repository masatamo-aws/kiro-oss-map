/**
 * Browser Compatibility Service
 * Handles browser detection, polyfills, and compatibility warnings
 * Version: 1.3.0
 */

class BrowserCompatibilityService {
  constructor() {
    this.browserInfo = this.detectBrowser();
    this.features = this.detectFeatures();
    this.polyfillsLoaded = new Set();
    this.init();
  }

  init() {
    this.checkCompatibility();
    this.loadRequiredPolyfills();
    this.setupCompatibilityWarnings();
  }

  // Detect browser information
  detectBrowser() {
    const ua = navigator.userAgent;
    const browsers = {
      chrome: /Chrome\/(\d+)/.exec(ua),
      firefox: /Firefox\/(\d+)/.exec(ua),
      safari: /Version\/(\d+).*Safari/.exec(ua),
      edge: /Edg\/(\d+)/.exec(ua),
      ie: /MSIE (\d+)|Trident.*rv:(\d+)/.exec(ua)
    };

    for (const [name, match] of Object.entries(browsers)) {
      if (match) {
        return {
          name,
          version: parseInt(match[1] || match[2]),
          userAgent: ua,
          mobile: /Mobile|Android|iPhone|iPad/.test(ua)
        };
      }
    }

    return {
      name: 'unknown',
      version: 0,
      userAgent: ua,
      mobile: /Mobile|Android|iPhone|iPad/.test(ua)
    };
  }

  // Detect feature support
  detectFeatures() {
    return {
      // Web APIs
      geolocation: 'geolocation' in navigator,
      webgl: this.hasWebGL(),
      webgl2: this.hasWebGL2(),
      webWorkers: typeof Worker !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      
      // ES6+ Features
      es6Modules: this.hasES6Modules(),
      es6Classes: this.hasES6Classes(),
      es6Arrow: this.hasArrowFunctions(),
      es6Destructuring: this.hasDestructuring(),
      es6Spread: this.hasSpreadOperator(),
      
      // CSS Features
      cssGrid: this.hasCSSGrid(),
      cssFlexbox: this.hasCSSFlexbox(),
      cssCustomProperties: this.hasCSSCustomProperties(),
      cssContainerQueries: this.hasCSSContainerQueries(),
      
      // Web Components
      customElements: 'customElements' in window,
      shadowDOM: 'attachShadow' in Element.prototype,
      htmlTemplates: 'content' in document.createElement('template'),
      
      // Storage
      localStorage: this.hasLocalStorage(),
      sessionStorage: this.hasSessionStorage(),
      indexedDB: 'indexedDB' in window,
      
      // Network
      fetch: 'fetch' in window,
      webSockets: 'WebSocket' in window,
      
      // Media
      webp: this.hasWebPSupport(),
      avif: this.hasAVIFSupport()
    };
  }

  // WebGL detection
  hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  hasWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  // ES6+ feature detection
  hasES6Modules() {
    try {
      return typeof Symbol !== 'undefined' && 
             typeof Symbol.iterator !== 'undefined';
    } catch {
      return false;
    }
  }

  hasES6Classes() {
    try {
      eval('class Test {}');
      return true;
    } catch {
      return false;
    }
  }

  hasArrowFunctions() {
    try {
      eval('() => {}');
      return true;
    } catch {
      return false;
    }
  }

  hasDestructuring() {
    try {
      eval('const {a} = {a: 1}');
      return true;
    } catch {
      return false;
    }
  }

  hasSpreadOperator() {
    try {
      eval('const a = [...[1, 2, 3]]');
      return true;
    } catch {
      return false;
    }
  }

  // CSS feature detection
  hasCSSGrid() {
    return CSS.supports('display', 'grid');
  }

  hasCSSFlexbox() {
    return CSS.supports('display', 'flex');
  }

  hasCSSCustomProperties() {
    return CSS.supports('--custom', 'property');
  }

  hasCSSContainerQueries() {
    return CSS.supports('container-type', 'inline-size');
  }

  // Storage detection
  hasLocalStorage() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  hasSessionStorage() {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Image format detection
  hasWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  hasAVIFSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }

  // Check overall compatibility
  checkCompatibility() {
    const requirements = {
      es6Classes: true,
      fetch: true,
      webgl: true,
      localStorage: true,
      customElements: true
    };

    const issues = [];
    for (const [feature, required] of Object.entries(requirements)) {
      if (required && !this.features[feature]) {
        issues.push(feature);
      }
    }

    this.compatibilityIssues = issues;
    return issues.length === 0;
  }

  // Load required polyfills
  async loadRequiredPolyfills() {
    const polyfills = [];

    // Web Components polyfill
    if (!this.features.customElements) {
      polyfills.push(this.loadPolyfill('webcomponents', 
        'https://unpkg.com/@webcomponents/webcomponentsjs@2.8.0/webcomponents-bundle.js'));
    }

    // Intersection Observer polyfill
    if (!this.features.intersectionObserver) {
      polyfills.push(this.loadPolyfill('intersectionObserver',
        'https://unpkg.com/intersection-observer@0.12.2/intersection-observer.js'));
    }

    // Resize Observer polyfill
    if (!this.features.resizeObserver) {
      polyfills.push(this.loadPolyfill('resizeObserver',
        'https://unpkg.com/resize-observer-polyfill@1.5.1/dist/ResizeObserver.js'));
    }

    // Fetch polyfill
    if (!this.features.fetch) {
      polyfills.push(this.loadPolyfill('fetch',
        'https://unpkg.com/whatwg-fetch@3.6.2/dist/fetch.umd.js'));
    }

    await Promise.all(polyfills);
  }

  // Load individual polyfill
  loadPolyfill(name, url) {
    if (this.polyfillsLoaded.has(name)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        this.polyfillsLoaded.add(name);
        console.log(`[Compatibility] Loaded polyfill: ${name}`);
        resolve();
      };
      script.onerror = () => {
        console.error(`[Compatibility] Failed to load polyfill: ${name}`);
        reject(new Error(`Failed to load polyfill: ${name}`));
      };
      document.head.appendChild(script);
    });
  }

  // Setup compatibility warnings
  setupCompatibilityWarnings() {
    if (this.compatibilityIssues.length > 0) {
      this.showCompatibilityWarning();
    }

    // Warn about unsupported browsers
    if (this.browserInfo.name === 'ie') {
      this.showUnsupportedBrowserWarning();
    }

    // Warn about old browser versions
    if (this.isOldBrowser()) {
      this.showOldBrowserWarning();
    }
  }

  // Check if browser is old
  isOldBrowser() {
    const minVersions = {
      chrome: 80,
      firefox: 75,
      safari: 13,
      edge: 80
    };

    const minVersion = minVersions[this.browserInfo.name];
    return minVersion && this.browserInfo.version < minVersion;
  }

  // Show compatibility warning
  showCompatibilityWarning() {
    const warning = document.createElement('div');
    warning.className = 'compatibility-warning';
    warning.innerHTML = `
      <div class="warning-content">
        <h3>⚠️ Compatibility Issues Detected</h3>
        <p>Your browser may not support all features of this application.</p>
        <p>Missing features: ${this.compatibilityIssues.join(', ')}</p>
        <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
      </div>
    `;
    
    this.addWarningStyles();
    document.body.appendChild(warning);
  }

  // Show unsupported browser warning
  showUnsupportedBrowserWarning() {
    const warning = document.createElement('div');
    warning.className = 'browser-warning unsupported';
    warning.innerHTML = `
      <div class="warning-content">
        <h3>🚫 Unsupported Browser</h3>
        <p>Internet Explorer is not supported. Please use a modern browser:</p>
        <ul>
          <li><a href="https://www.google.com/chrome/">Google Chrome</a></li>
          <li><a href="https://www.mozilla.org/firefox/">Mozilla Firefox</a></li>
          <li><a href="https://www.microsoft.com/edge/">Microsoft Edge</a></li>
          <li><a href="https://www.apple.com/safari/">Safari</a></li>
        </ul>
      </div>
    `;
    
    this.addWarningStyles();
    document.body.appendChild(warning);
  }

  // Show old browser warning
  showOldBrowserWarning() {
    const warning = document.createElement('div');
    warning.className = 'browser-warning old';
    warning.innerHTML = `
      <div class="warning-content">
        <h3>📅 Outdated Browser</h3>
        <p>You're using an outdated version of ${this.browserInfo.name}.</p>
        <p>Please update to the latest version for the best experience.</p>
        <button onclick="this.parentElement.parentElement.remove()">Continue Anyway</button>
      </div>
    `;
    
    this.addWarningStyles();
    document.body.appendChild(warning);
  }

  // Add warning styles
  addWarningStyles() {
    if (document.getElementById('compatibility-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'compatibility-styles';
    styles.textContent = `
      .compatibility-warning, .browser-warning {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff6b6b;
        color: white;
        z-index: 10000;
        padding: 1rem;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }
      
      .browser-warning.unsupported {
        background: #e74c3c;
      }
      
      .browser-warning.old {
        background: #f39c12;
      }
      
      .warning-content h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.2rem;
      }
      
      .warning-content p {
        margin: 0.5rem 0;
      }
      
      .warning-content ul {
        list-style: none;
        padding: 0;
        margin: 0.5rem 0;
      }
      
      .warning-content li {
        display: inline-block;
        margin: 0 1rem;
      }
      
      .warning-content a {
        color: white;
        text-decoration: underline;
      }
      
      .warning-content button {
        background: rgba(255,255,255,0.2);
        border: 1px solid white;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 0.5rem;
      }
      
      .warning-content button:hover {
        background: rgba(255,255,255,0.3);
      }
    `;
    
    document.head.appendChild(styles);
  }

  // Get compatibility report
  getCompatibilityReport() {
    return {
      browser: this.browserInfo,
      features: this.features,
      issues: this.compatibilityIssues,
      polyfillsLoaded: Array.from(this.polyfillsLoaded),
      isCompatible: this.compatibilityIssues.length === 0,
      isOldBrowser: this.isOldBrowser()
    };
  }
}

// Export singleton instance
export default new BrowserCompatibilityService();