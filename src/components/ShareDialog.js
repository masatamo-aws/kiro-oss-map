import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

/**
 * Share dialog web component
 */
class ShareDialog extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.shareService = null;
    this.currentShareData = null;
    this.qrCodeGenerator = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    
    // Wait for app initialization before accessing services
    if (window.app && window.app.isInitialized) {
      this.initializeServices();
    } else {
      EventBus.on('app:ready', () => {
        this.initializeServices();
      });
    }
  }

  render() {
    this.className = 'share-dialog fixed inset-0 bg-black bg-opacity-50 z-50 hidden';
    this.innerHTML = `
      <div class="share-dialog-content bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md mx-auto mt-20 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">地図を共有</h3>
          <button id="close-share-dialog" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- URL Share Section -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              共有URL
            </label>
            <div class="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <input type="text" id="share-url-input" readonly 
                     class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none">
              <button id="copy-url-btn" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </button>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              このURLで現在の地図位置を共有できます
            </p>
          </div>

          <!-- QR Code Section -->
          <div class="text-center">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              QRコード
            </label>
            <div id="qr-code-container" class="inline-block p-4 bg-white rounded-lg border border-gray-200 dark:border-gray-600">
              <div id="qr-code" class="w-32 h-32 flex items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
              QRコードをスキャンしてアクセス
            </p>
          </div>

          <!-- Social Media Share -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              SNSで共有
            </label>
            <div class="grid grid-cols-3 gap-3">
              <button id="share-twitter" class="flex flex-col items-center justify-center px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                <svg class="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <span class="text-xs">Twitter</span>
              </button>
              
              <button id="share-facebook" class="flex flex-col items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <svg class="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span class="text-xs">Facebook</span>
              </button>
              
              <button id="share-line" class="flex flex-col items-center justify-center px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                <svg class="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771z"/>
                </svg>
                <span class="text-xs">LINE</span>
              </button>
            </div>
          </div>

          <!-- Embed Code Section -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              埋め込みコード
            </label>
            <div class="relative">
              <textarea id="embed-code" readonly rows="4" 
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-mono bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none"></textarea>
              <button id="copy-embed-btn" class="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </button>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Webサイトやブログにiframeとして埋め込み可能
            </p>
          </div>

          <!-- Native Share Button (Mobile) -->
          <div id="native-share-section" class="hidden">
            <button id="native-share-btn" class="w-full flex items-center justify-center px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
              </svg>
              共有
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button id="cancel-share" class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            キャンセル
          </button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Close dialog
    this.querySelector('#close-share-dialog').addEventListener('click', () => {
      this.hide();
    });

    this.querySelector('#cancel-share').addEventListener('click', () => {
      this.hide();
    });

    // Click outside to close
    this.addEventListener('click', (e) => {
      if (e.target === this) {
        this.hide();
      }
    });

    // Copy URL button
    this.querySelector('#copy-url-btn').addEventListener('click', () => {
      this.copyUrl();
    });

    // Copy embed code button
    this.querySelector('#copy-embed-btn').addEventListener('click', () => {
      this.copyEmbedCode();
    });

    // Social media share buttons
    this.querySelector('#share-twitter').addEventListener('click', () => {
      this.shareToSocialMedia('twitter');
    });

    this.querySelector('#share-facebook').addEventListener('click', () => {
      this.shareToSocialMedia('facebook');
    });

    this.querySelector('#share-line').addEventListener('click', () => {
      this.shareToSocialMedia('line');
    });

    // Native share button
    this.querySelector('#native-share-btn').addEventListener('click', () => {
      this.shareNative();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.hide();
      }
    });

    // EventBus listeners
    EventBus.on('share:open', (data) => {
      this.show(data.shareData);
    });
  }

  initializeServices() {
    // Get share service from global app
    this.shareService = window.app?.services?.share;
    
    if (!this.shareService) {
      Logger.warn('ShareService not available, retrying in 1 second...');
      // Retry after a short delay
      setTimeout(() => {
        this.shareService = window.app?.services?.share;
        if (this.shareService) {
          this.completeServiceInitialization();
        } else {
          Logger.error('ShareService still not available after retry');
        }
      }, 1000);
      return;
    }

    this.completeServiceInitialization();
  }

  completeServiceInitialization() {
    // Show native share button on mobile devices
    if (this.shareService && this.shareService.canUseNativeShare()) {
      const nativeSection = this.querySelector('#native-share-section');
      if (nativeSection) {
        nativeSection.classList.remove('hidden');
      }
    }

    // Initialize QR code generator
    this.initializeQRCode();
  }

  async initializeQRCode() {
    try {
      // Use a simple QR code generation approach
      // In a real implementation, you might want to use a library like qrcode.js
      this.qrCodeGenerator = {
        generate: (text) => {
          // For now, show a placeholder
          // In production, integrate with a QR code library
          return `https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(text)}`;
        }
      };
    } catch (error) {
      Logger.error('Failed to initialize QR code generator', error);
    }
  }

  async show(shareData = null) {
    try {
      // Check if ShareService is available
      if (!this.shareService) {
        Logger.error('ShareService not available for sharing');
        EventBus.emit('notification:show', {
          type: 'error',
          message: '共有機能が利用できません。しばらく待ってから再試行してください。'
        });
        return;
      }

      // Get current map state if no share data provided
      if (!shareData) {
        shareData = this.shareService.getCurrentMapState();
      }

      this.currentShareData = shareData;

      // Generate share URL
      const shareUrl = await this.shareService.createShareUrl(shareData);
      
      // Update URL input
      this.querySelector('#share-url-input').value = shareUrl;

      // Generate and display QR code
      await this.updateQRCode(shareUrl);

      // Generate embed code
      const embedCode = await this.shareService.generateEmbedCode(shareData);
      this.querySelector('#embed-code').value = embedCode;

      // Show dialog
      this.classList.remove('hidden');
      this.isOpen = true;

      // Focus management
      this.querySelector('#share-url-input').focus();

      Logger.info('Share dialog opened', { shareData });

    } catch (error) {
      Logger.error('Failed to show share dialog', error);
      EventBus.emit('notification:show', {
        type: 'error',
        message: '共有ダイアログの表示に失敗しました',
        duration: 3000
      });
    }
  }

  hide() {
    this.classList.add('hidden');
    this.isOpen = false;
    this.currentShareData = null;

    Logger.info('Share dialog closed');
  }

  async updateQRCode(url) {
    try {
      const qrContainer = this.querySelector('#qr-code');
      
      if (this.qrCodeGenerator) {
        const qrImageUrl = this.qrCodeGenerator.generate(url);
        qrContainer.innerHTML = `<img src="${qrImageUrl}" alt="QR Code" class="w-32 h-32">`;
      } else {
        // Fallback: show URL as text
        qrContainer.innerHTML = `
          <div class="w-32 h-32 flex items-center justify-center text-xs text-gray-500 text-center p-2">
            QRコード生成中...
          </div>
        `;
      }
    } catch (error) {
      Logger.error('Failed to update QR code', error);
      const qrContainer = this.querySelector('#qr-code');
      qrContainer.innerHTML = `
        <div class="w-32 h-32 flex items-center justify-center text-xs text-gray-500 text-center p-2">
          QRコード生成に失敗しました
        </div>
      `;
    }
  }

  async copyUrl() {
    try {
      const urlInput = this.querySelector('#share-url-input');
      const url = urlInput.value;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback
        urlInput.select();
        document.execCommand('copy');
      }

      // Visual feedback
      const button = this.querySelector('#copy-url-btn');
      const originalHTML = button.innerHTML;
      button.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      `;

      setTimeout(() => {
        button.innerHTML = originalHTML;
      }, 2000);

      EventBus.emit('notification:show', {
        type: 'success',
        message: 'URLをコピーしました',
        duration: 2000
      });

      Logger.info('Share URL copied', { url });

    } catch (error) {
      Logger.error('Failed to copy URL', error);
      EventBus.emit('notification:show', {
        type: 'error',
        message: 'URLのコピーに失敗しました',
        duration: 3000
      });
    }
  }

  async copyEmbedCode() {
    try {
      const embedTextarea = this.querySelector('#embed-code');
      const embedCode = embedTextarea.value;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(embedCode);
      } else {
        // Fallback
        embedTextarea.select();
        document.execCommand('copy');
      }

      // Visual feedback
      const button = this.querySelector('#copy-embed-btn');
      const originalHTML = button.innerHTML;
      button.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      `;

      setTimeout(() => {
        button.innerHTML = originalHTML;
      }, 2000);

      EventBus.emit('notification:show', {
        type: 'success',
        message: '埋め込みコードをコピーしました',
        duration: 2000
      });

      Logger.info('Embed code copied');

    } catch (error) {
      Logger.error('Failed to copy embed code', error);
      EventBus.emit('notification:show', {
        type: 'error',
        message: '埋め込みコードのコピーに失敗しました',
        duration: 3000
      });
    }
  }

  async shareToSocialMedia(platform) {
    try {
      if (!this.shareService) {
        throw new Error('ShareService not available');
      }

      if (!this.currentShareData) {
        throw new Error('No share data available');
      }

      await this.shareService.shareToSocialMedia(platform, this.currentShareData);
      
      Logger.info('Social media share initiated', { platform });

    } catch (error) {
      Logger.error('Social media share failed', error);
      EventBus.emit('notification:show', {
        type: 'error',
        message: `${platform}での共有に失敗しました`,
        duration: 3000
      });
    }
  }

  async shareNative() {
    try {
      if (!this.shareService) {
        throw new Error('ShareService not available');
      }

      if (!this.currentShareData) {
        throw new Error('No share data available');
      }

      const success = await this.shareService.shareNative(this.currentShareData);
      
      if (success) {
        this.hide();
      }

    } catch (error) {
      Logger.error('Native share failed', error);
      EventBus.emit('notification:show', {
        type: 'error',
        message: '共有に失敗しました',
        duration: 3000
      });
    }
  }

  // Public API
  toggle(shareData = null) {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show(shareData);
    }
  }
}

// Register the custom element
customElements.define('share-dialog', ShareDialog);

export { ShareDialog };