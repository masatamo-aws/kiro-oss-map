import { EventBus } from '../utils/EventBus.js';

/**
 * Share dialog web component
 */
class ShareDialog extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.shareData = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.innerHTML = `
      <!-- Modal Backdrop -->
      <div id="share-backdrop" class="fixed inset-0 bg-black bg-opacity-50 z-modal hidden">
        <!-- Modal Dialog -->
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">共有</h3>
              <button id="close-share" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="p-6">
              <!-- Share URL -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  共有URL
                </label>
                <div class="flex">
                  <input
                    type="text"
                    id="share-url"
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg 
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    readonly
                  >
                  <button
                    id="copy-url"
                    class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-r-lg 
                           transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    コピー
                  </button>
                </div>
                <div id="copy-feedback" class="text-sm text-green-600 dark:text-green-400 mt-1 hidden">
                  URLをコピーしました！
                </div>
              </div>

              <!-- Share Options -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  共有方法
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <!-- Native Share -->
                  <button
                    id="native-share"
                    class="flex items-center justify-center p-3 border border-gray-300 dark:border-gray-600 
                           rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg class="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                    </svg>
                    <span class="text-sm text-gray-700 dark:text-gray-300">共有</span>
                  </button>

                  <!-- QR Code -->
                  <button
                    id="show-qr"
                    class="flex items-center justify-center p-3 border border-gray-300 dark:border-gray-600 
                           rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg class="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                    </svg>
                    <span class="text-sm text-gray-700 dark:text-gray-300">QRコード</span>
                  </button>
                </div>
              </div>

              <!-- Embed Code -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  埋め込みコード
                </label>
                <div class="relative">
                  <textarea
                    id="embed-code"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows="3"
                    readonly
                  ></textarea>
                  <button
                    id="copy-embed"
                    class="absolute top-2 right-2 p-1 text-gray-400 hover:text-primary-500"
                    title="埋め込みコードをコピー"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                  </button>
                </div>
                <div id="embed-feedback" class="text-sm text-green-600 dark:text-green-400 mt-1 hidden">
                  埋め込みコードをコピーしました！
                </div>
              </div>

              <!-- QR Code Display -->
              <div id="qr-code-section" class="mb-6 hidden">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  QRコード
                </label>
                <div class="flex justify-center p-4 bg-white rounded-lg border border-gray-200">
                  <div id="qr-code" class="w-32 h-32 bg-gray-100 flex items-center justify-center">
                    <!-- QR code will be generated here -->
                    <span class="text-gray-500 text-sm">QRコード</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                id="cancel-share"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 
                       rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const backdrop = this.querySelector('#share-backdrop');
    const closeBtn = this.querySelector('#close-share');
    const cancelBtn = this.querySelector('#cancel-share');
    const copyUrlBtn = this.querySelector('#copy-url');
    const copyEmbedBtn = this.querySelector('#copy-embed');
    const nativeShareBtn = this.querySelector('#native-share');
    const showQrBtn = this.querySelector('#show-qr');

    // Close dialog
    const closeDialog = () => this.close();
    
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeDialog();
      }
    });

    // Copy URL
    copyUrlBtn.addEventListener('click', async () => {
      const urlInput = this.querySelector('#share-url');
      const feedback = this.querySelector('#copy-feedback');
      
      try {
        await navigator.clipboard.writeText(urlInput.value);
        feedback.classList.remove('hidden');
        setTimeout(() => {
          feedback.classList.add('hidden');
        }, 2000);
      } catch (error) {
        console.error('Failed to copy URL:', error);
        // Fallback for older browsers
        urlInput.select();
        document.execCommand('copy');
        feedback.classList.remove('hidden');
        setTimeout(() => {
          feedback.classList.add('hidden');
        }, 2000);
      }
    });

    // Copy embed code
    copyEmbedBtn.addEventListener('click', async () => {
      const embedTextarea = this.querySelector('#embed-code');
      const feedback = this.querySelector('#embed-feedback');
      
      try {
        await navigator.clipboard.writeText(embedTextarea.value);
        feedback.classList.remove('hidden');
        setTimeout(() => {
          feedback.classList.add('hidden');
        }, 2000);
      } catch (error) {
        console.error('Failed to copy embed code:', error);
        embedTextarea.select();
        document.execCommand('copy');
        feedback.classList.remove('hidden');
        setTimeout(() => {
          feedback.classList.add('hidden');
        }, 2000);
      }
    });

    // Native share
    nativeShareBtn.addEventListener('click', async () => {
      const url = this.querySelector('#share-url').value;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Kiro OSS Map',
            url: url
          });
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Native share failed:', error);
          }
        }
      } else {
        // Fallback - copy to clipboard
        try {
          await navigator.clipboard.writeText(url);
          alert('URLをクリップボードにコピーしました');
        } catch (error) {
          console.error('Clipboard write failed:', error);
        }
      }
    });

    // Show QR code
    showQrBtn.addEventListener('click', () => {
      this.toggleQRCode();
    });

    // Listen for share events
    EventBus.on('share:show', (data) => {
      this.show(data);
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  show(data) {
    this.shareData = data;
    this.isOpen = true;
    
    // Update URL
    const urlInput = this.querySelector('#share-url');
    urlInput.value = data.url;

    // Generate embed code
    const embedCode = this.generateEmbedCode(data.url);
    this.querySelector('#embed-code').value = embedCode;

    // Show dialog
    const backdrop = this.querySelector('#share-backdrop');
    backdrop.classList.remove('hidden');
    
    // Focus on URL input
    setTimeout(() => {
      urlInput.select();
    }, 100);

    // Hide QR code section initially
    this.querySelector('#qr-code-section').classList.add('hidden');
  }

  close() {
    this.isOpen = false;
    this.shareData = null;
    
    const backdrop = this.querySelector('#share-backdrop');
    backdrop.classList.add('hidden');
    
    // Hide feedback messages
    this.querySelector('#copy-feedback').classList.add('hidden');
    this.querySelector('#embed-feedback').classList.add('hidden');
    this.querySelector('#qr-code-section').classList.add('hidden');
  }

  generateEmbedCode(url) {
    const embedUrl = url + (url.includes('?') ? '&' : '?') + 'embed=1';
    return `<iframe src="${embedUrl}" width="400" height="300" frameborder="0" style="border:0;" allowfullscreen="" aria-hidden="false" tabindex="0"></iframe>`;
  }

  toggleQRCode() {
    const qrSection = this.querySelector('#qr-code-section');
    const isVisible = !qrSection.classList.contains('hidden');
    
    if (isVisible) {
      qrSection.classList.add('hidden');
    } else {
      qrSection.classList.remove('hidden');
      this.generateQRCode();
    }
  }

  generateQRCode() {
    const qrContainer = this.querySelector('#qr-code');
    const url = this.querySelector('#share-url').value;
    
    // Simple QR code placeholder
    // In a real implementation, you'd use a QR code library like qrcode.js
    qrContainer.innerHTML = `
      <div class="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 text-center p-2">
        QRコード<br>
        <small class="text-xs">${url.substring(0, 30)}...</small>
      </div>
    `;
    
    // If you want to use a real QR code library, you could do:
    // import QRCode from 'qrcode';
    // QRCode.toCanvas(qrContainer, url, { width: 128 });
  }

  // Public API
  shareLocation(center, zoom, marker = null) {
    const params = new URLSearchParams();
    params.set('lat', center[1]);
    params.set('lng', center[0]);
    params.set('zoom', zoom);
    
    if (marker) {
      params.set('marker', '1');
      params.set('title', marker.title || '');
    }

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    this.show({ url });
  }

  shareRoute(origin, destination, profile = 'driving') {
    const params = new URLSearchParams();
    params.set('route', '1');
    params.set('origin', `${origin[1]},${origin[0]}`);
    params.set('destination', `${destination[1]},${destination[0]}`);
    params.set('profile', profile);

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    this.show({ url });
  }
}

customElements.define('share-dialog', ShareDialog);