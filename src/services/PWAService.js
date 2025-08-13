/**
 * PWA service for managing Progressive Web App features
 */
export class PWAService {
  constructor() {
    this.isInstallable = false;
    this.deferredPrompt = null;
    this.isInstalled = false;
    
    this.init();
  }

  async init() {
    // Check if app is already installed
    this.checkInstallStatus();
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Set up install prompt
    this.setupInstallPrompt();
    
    // Set up app update handling
    this.setupUpdateHandling();
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailable();
              }
            });
          }
        });
        
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Save the event so it can be triggered later
      this.deferredPrompt = e;
      this.isInstallable = true;
      
      // Show install button
      this.showInstallButton();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.isInstalled = true;
      this.hideInstallButton();
      this.deferredPrompt = null;
    });
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`User response to the install prompt: ${outcome}`);
      
      // Clear the deferredPrompt
      this.deferredPrompt = null;
      this.isInstallable = false;
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  showInstallButton() {
    // Create install button if it doesn't exist
    let installButton = document.getElementById('pwa-install-button');
    
    if (!installButton) {
      installButton = document.createElement('button');
      installButton.id = 'pwa-install-button';
      installButton.className = 'fixed bottom-4 right-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      installButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        <span>アプリをインストール</span>
      `;
      
      installButton.addEventListener('click', () => {
        this.promptInstall();
      });
      
      document.body.appendChild(installButton);
    }
    
    installButton.style.display = 'flex';
  }

  hideInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  checkInstallStatus() {
    // Check if app is running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      this.isInstalled = true;
    }
  }

  setupUpdateHandling() {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page when a new service worker takes control
        window.location.reload();
      });
    }
  }

  showUpdateAvailable() {
    // Create update notification
    const updateNotification = document.createElement('div');
    updateNotification.id = 'pwa-update-notification';
    updateNotification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    updateNotification.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">アップデートが利用可能です</p>
          <p class="text-sm opacity-90">新しい機能と修正が含まれています</p>
        </div>
        <button id="pwa-update-button" class="ml-4 bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100">
          更新
        </button>
      </div>
      <button id="pwa-update-dismiss" class="absolute top-1 right-1 text-white hover:text-gray-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;

    // Add event listeners
    updateNotification.querySelector('#pwa-update-button').addEventListener('click', () => {
      this.applyUpdate();
    });

    updateNotification.querySelector('#pwa-update-dismiss').addEventListener('click', () => {
      updateNotification.remove();
    });

    document.body.appendChild(updateNotification);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (updateNotification.parentNode) {
        updateNotification.remove();
      }
    }, 10000);
  }

  async applyUpdate() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        // Tell the waiting service worker to skip waiting and become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  }

  // Utility methods
  isOnline() {
    return navigator.onLine;
  }

  getInstallStatus() {
    return {
      isInstallable: this.isInstallable,
      isInstalled: this.isInstalled,
      canPrompt: !!this.deferredPrompt
    };
  }

  // Cache management
  async clearCache() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  }

  async getCacheSize() {
    if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        available: estimate.quota,
        percentage: (estimate.usage / estimate.quota) * 100
      };
    }
    return null;
  }
}