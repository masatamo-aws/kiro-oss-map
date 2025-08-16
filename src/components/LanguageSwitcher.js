/**
 * LanguageSwitcher - 言語切り替えコンポーネント
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class LanguageSwitcher extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.currentLanguage = 'ja';
    this.supportedLanguages = [];
    
    this.setupEventListeners();
  }

  connectedCallback() {
    this.render();
    this.setupUIEventListeners();
    
    // Request language data with a slight delay to ensure services are ready
    setTimeout(() => {
      this.requestLanguageData();
    }, 200);
  }

  setupEventListeners() {
    EventBus.on('i18n:languageChanged', (data) => {
      this.currentLanguage = data.language;
      this.updateCurrentLanguageDisplay();
    });

    EventBus.on('i18n:supportedLanguages', (data) => {
      console.log('Received supported languages:', data.languages);
      this.supportedLanguages = data.languages;
      this.updateLanguageOptions();
    });
  }

  setupUIEventListeners() {
    // Toggle dropdown
    this.querySelector('.language-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) {
        this.close();
      }
    });

    // Handle keyboard navigation
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.classList.contains('language-toggle')) {
          e.preventDefault();
          this.toggle();
        }
      }
    });
  }

  render() {
    this.className = 'language-switcher relative';
    this.innerHTML = `
      <button class="language-toggle flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              aria-haspopup="true" 
              aria-expanded="false"
              title="言語を選択">
        <span class="current-language-flag text-lg">🇯🇵</span>
        <span class="current-language-name text-sm font-medium text-gray-700 dark:text-gray-300">日本語</span>
        <svg class="dropdown-arrow w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      
      <div class="language-dropdown absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 hidden">
        <div class="py-2">
          <!-- Language options will be populated here -->
        </div>
      </div>
    `;
  }

  requestLanguageData() {
    // Request current language and supported languages
    EventBus.emit('i18n:getCurrentLanguage');
    EventBus.emit('i18n:getSupportedLanguages');
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    const dropdown = this.querySelector('.language-dropdown');
    const toggle = this.querySelector('.language-toggle');
    const arrow = this.querySelector('.dropdown-arrow');
    
    dropdown.classList.remove('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    arrow.style.transform = 'rotate(180deg)';
    
    // Add animation
    dropdown.style.opacity = '0';
    dropdown.style.transform = 'translateY(-10px)';
    
    requestAnimationFrame(() => {
      dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      dropdown.style.opacity = '1';
      dropdown.style.transform = 'translateY(0)';
    });
  }

  close() {
    this.isOpen = false;
    const dropdown = this.querySelector('.language-dropdown');
    const toggle = this.querySelector('.language-toggle');
    const arrow = this.querySelector('.dropdown-arrow');
    
    dropdown.style.opacity = '0';
    dropdown.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      dropdown.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
      arrow.style.transform = '';
    }, 200);
  }

  updateCurrentLanguageDisplay() {
    const currentLang = this.supportedLanguages.find(lang => lang.code === this.currentLanguage);
    if (!currentLang) return;

    const flagElement = this.querySelector('.current-language-flag');
    const nameElement = this.querySelector('.current-language-name');
    
    if (flagElement) flagElement.textContent = currentLang.flag;
    if (nameElement) nameElement.textContent = currentLang.nativeName;
  }

  updateLanguageOptions() {
    const dropdown = this.querySelector('.language-dropdown .py-2');
    if (!dropdown) return;

    console.log('Updating language options:', this.supportedLanguages);

    dropdown.innerHTML = this.supportedLanguages.map(language => `
      <button class="language-option w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        language.code === this.currentLanguage ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
      }" 
              data-language="${language.code}"
              role="menuitem">
        <span class="text-lg">${language.flag}</span>
        <div class="flex-1">
          <div class="font-medium">${language.nativeName}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${language.name}</div>
        </div>
        ${language.code === this.currentLanguage ? `
          <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        ` : ''}
      </button>
    `).join('');

    // Add click listeners to language options
    dropdown.querySelectorAll('.language-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const language = e.currentTarget.dataset.language;
        this.selectLanguage(language);
      });
    });
  }

  selectLanguage(language) {
    if (language === this.currentLanguage) {
      this.close();
      return;
    }

    EventBus.emit('i18n:changeLanguage', { language });
    this.close();
    
    Logger.info('Language selected', { language });
  }

  // Public methods
  setCurrentLanguage(language) {
    this.currentLanguage = language;
    this.updateCurrentLanguageDisplay();
  }

  setSupportedLanguages(languages) {
    this.supportedLanguages = languages;
    this.updateLanguageOptions();
    this.updateCurrentLanguageDisplay();
  }
}

// Register the custom element
customElements.define('language-switcher', LanguageSwitcher);