/**
 * I18nService - 国際化管理サービス
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { StorageService } from './StorageService.js';

export class I18nService {
  constructor() {
    this.currentLanguage = 'ja';
    this.fallbackLanguage = 'ja';
    this.translations = new Map();
    this.supportedLanguages = new Map([
      ['ja', { name: '日本語', nativeName: '日本語', flag: '🇯🇵' }],
      ['en', { name: 'English', nativeName: 'English', flag: '🇺🇸' }],
      ['zh', { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }],
      ['ko', { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' }]
    ]);
    
    this.storageService = new StorageService();
    this.dateTimeFormats = new Map();
    this.numberFormats = new Map();
    
    this.setupEventListeners();
    this.initializeFormats();
    this.loadSavedLanguage();
  }

  setupEventListeners() {
    EventBus.on('i18n:changeLanguage', (data) => {
      this.changeLanguage(data.language);
    });

    EventBus.on('i18n:translate', (data) => {
      const translation = this.translate(data.key, data.params);
      if (data.callback) {
        data.callback(translation);
      }
    });

    EventBus.on('i18n:formatDate', (data) => {
      const formatted = this.formatDate(data.date, data.options);
      if (data.callback) {
        data.callback(formatted);
      }
    });

    EventBus.on('i18n:formatNumber', (data) => {
      const formatted = this.formatNumber(data.number, data.options);
      if (data.callback) {
        data.callback(formatted);
      }
    });
  }

  initializeFormats() {
    // Date/Time formats for each language
    this.dateTimeFormats.set('ja', {
      short: { year: 'numeric', month: 'numeric', day: 'numeric' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
      time: { hour: '2-digit', minute: '2-digit' },
      datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    });

    this.dateTimeFormats.set('en', {
      short: { year: 'numeric', month: 'numeric', day: 'numeric' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
      time: { hour: '2-digit', minute: '2-digit' },
      datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    });

    // Number formats for each language
    this.numberFormats.set('ja', {
      decimal: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      currency: { style: 'currency', currency: 'JPY' },
      percent: { style: 'percent' }
    });

    this.numberFormats.set('en', {
      decimal: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      currency: { style: 'currency', currency: 'USD' },
      percent: { style: 'percent' }
    });
  }

  async loadSavedLanguage() {
    const savedLanguage = this.storageService.get('language');
    if (savedLanguage && this.supportedLanguages.has(savedLanguage)) {
      await this.changeLanguage(savedLanguage);
    } else {
      // Detect browser language
      const browserLanguage = this.detectBrowserLanguage();
      await this.changeLanguage(browserLanguage);
    }
  }

  detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0];
    
    if (this.supportedLanguages.has(langCode)) {
      return langCode;
    }
    
    return this.fallbackLanguage;
  }

  async changeLanguage(language) {
    if (!this.supportedLanguages.has(language)) {
      Logger.warn('Unsupported language', { language });
      return false;
    }

    const previousLanguage = this.currentLanguage;
    this.currentLanguage = language;

    try {
      // Load translation file if not already loaded
      if (!this.translations.has(language)) {
        await this.loadTranslations(language);
      }

      // Save to storage
      this.storageService.set('language', language);

      // Update document language
      document.documentElement.lang = language;

      // Update text direction for RTL languages
      const rtlLanguages = ['ar', 'he', 'fa'];
      document.documentElement.dir = rtlLanguages.includes(language) ? 'rtl' : 'ltr';

      // Emit language change event
      EventBus.emit('i18n:languageChanged', {
        language,
        previousLanguage,
        languageInfo: this.supportedLanguages.get(language)
      });

      // Update all translatable elements
      this.updateTranslatableElements();

      Logger.info('Language changed', { from: previousLanguage, to: language });
      return true;
    } catch (error) {
      Logger.error('Failed to change language', { language, error: error.message });
      this.currentLanguage = previousLanguage;
      return false;
    }
  }

  async loadTranslations(language) {
    try {
      // In a real application, you would load from a server or import dynamically
      // For now, we'll use inline translations
      const translations = await this.getTranslationsForLanguage(language);
      this.translations.set(language, translations);
      Logger.info('Translations loaded', { language, count: Object.keys(translations).length });
    } catch (error) {
      Logger.error('Failed to load translations', { language, error: error.message });
      throw error;
    }
  }

  async getTranslationsForLanguage(language) {
    // This would typically load from external files or API
    const translationData = {
      ja: await import('../locales/ja.js').then(m => m.default).catch(() => this.getJapaneseTranslations()),
      en: await import('../locales/en.js').then(m => m.default).catch(() => this.getEnglishTranslations()),
      zh: await import('../locales/zh.js').then(m => m.default).catch(() => this.getChineseTranslations()),
      ko: await import('../locales/ko.js').then(m => m.default).catch(() => this.getKoreanTranslations())
    };

    return translationData[language] || {};
  }

  getJapaneseTranslations() {
    return {
      // Common
      'common.loading': '読み込み中...',
      'common.error': 'エラー',
      'common.success': '成功',
      'common.warning': '警告',
      'common.info': '情報',
      'common.ok': 'OK',
      'common.cancel': 'キャンセル',
      'common.save': '保存',
      'common.delete': '削除',
      'common.edit': '編集',
      'common.add': '追加',
      'common.search': '検索',
      'common.close': '閉じる',
      'common.back': '戻る',
      'common.next': '次へ',
      'common.previous': '前へ',
      'common.yes': 'はい',
      'common.no': 'いいえ',

      // App
      'app.title': 'Kiro OSS Map',
      'app.description': 'オープンソース地図アプリケーション',

      // Navigation
      'nav.search': '検索',
      'nav.route': 'ルート',
      'nav.bookmarks': 'ブックマーク',
      'nav.measurement': '計測',
      'nav.share': '共有',
      'nav.settings': '設定',

      // Search
      'search.placeholder': '場所を検索...',
      'search.noResults': '検索結果が見つかりませんでした',
      'search.searching': '検索中...',
      'search.results': '検索結果',

      // Map
      'map.currentLocation': '現在地を表示',
      'map.zoomIn': 'ズームイン',
      'map.zoomOut': 'ズームアウト',
      'map.layers': 'レイヤー',
      'map.satellite': '衛星',
      'map.terrain': '地形',
      'map.standard': '標準',

      // Bookmarks
      'bookmarks.title': 'ブックマーク',
      'bookmarks.add': 'ブックマーク追加',
      'bookmarks.name': '名前',
      'bookmarks.category': 'カテゴリ',
      'bookmarks.notes': 'メモ',
      'bookmarks.tags': 'タグ',
      'bookmarks.noBookmarks': 'ブックマークがありません',
      'bookmarks.addHere': 'ここにブックマーク追加',
      'bookmarks.categories.work': '仕事',
      'bookmarks.categories.personal': 'プライベート',
      'bookmarks.categories.travel': '旅行',
      'bookmarks.categories.food': 'グルメ',
      'bookmarks.categories.shopping': 'ショッピング',

      // Measurement
      'measurement.title': '計測ツール',
      'measurement.distance': '距離測定',
      'measurement.area': '面積測定',
      'measurement.route': 'ルート距離',
      'measurement.clear': 'クリア',
      'measurement.units.metric': 'メートル法',
      'measurement.units.imperial': 'ヤードポンド法',

      // Route
      'route.from': '出発地',
      'route.to': '目的地',
      'route.calculate': 'ルート計算',
      'route.clear': 'ルートクリア',
      'route.driving': '車',
      'route.walking': '徒歩',

      // Share
      'share.title': '共有',
      'share.copyLink': 'リンクをコピー',
      'share.linkCopied': 'リンクをコピーしました',

      // Settings
      'settings.title': '設定',
      'settings.language': '言語',
      'settings.theme': 'テーマ',
      'settings.theme.light': 'ライト',
      'settings.theme.dark': 'ダーク',
      'settings.theme.auto': '自動',

      // Transit
      'transit.title': '公共交通',
      'transit.from': '出発地',
      'transit.to': '目的地',
      'transit.depart_at': '出発時刻',
      'transit.arrive_by': '到着時刻',
      'transit.now': '今すぐ',
      'transit.optimize': '最適化',
      'transit.optimize_time': '最短時間',
      'transit.optimize_transfers': '乗り換え最小',
      'transit.optimize_cost': '最安料金',
      'transit.wheelchair': '車椅子対応',
      'transit.search': 'ルート検索',
      'transit.searching': 'ルート検索中...',
      'transit.no_routes': 'ルートが見つかりません',

      // Errors
      'error.networkError': 'ネットワークエラーが発生しました',
      'error.locationNotFound': '位置情報が見つかりません',
      'error.permissionDenied': '位置情報の許可が拒否されました',
      'error.unknownError': '不明なエラーが発生しました'
    };
  }

  getEnglishTranslations() {
    return {
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.warning': 'Warning',
      'common.info': 'Info',
      'common.ok': 'OK',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.search': 'Search',
      'common.close': 'Close',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.previous': 'Previous',
      'common.yes': 'Yes',
      'common.no': 'No',

      // App
      'app.title': 'Kiro OSS Map',
      'app.description': 'Open Source Map Application',

      // Navigation
      'nav.search': 'Search',
      'nav.route': 'Route',
      'nav.bookmarks': 'Bookmarks',
      'nav.measurement': 'Measurement',
      'nav.share': 'Share',
      'nav.settings': 'Settings',

      // Search
      'search.placeholder': 'Search for places...',
      'search.noResults': 'No results found',
      'search.searching': 'Searching...',
      'search.results': 'Search Results',

      // Map
      'map.currentLocation': 'Show current location',
      'map.zoomIn': 'Zoom in',
      'map.zoomOut': 'Zoom out',
      'map.layers': 'Layers',
      'map.satellite': 'Satellite',
      'map.terrain': 'Terrain',
      'map.standard': 'Standard',

      // Bookmarks
      'bookmarks.title': 'Bookmarks',
      'bookmarks.add': 'Add Bookmark',
      'bookmarks.name': 'Name',
      'bookmarks.category': 'Category',
      'bookmarks.notes': 'Notes',
      'bookmarks.tags': 'Tags',
      'bookmarks.noBookmarks': 'No bookmarks',
      'bookmarks.addHere': 'Add bookmark here',
      'bookmarks.categories.work': 'Work',
      'bookmarks.categories.personal': 'Personal',
      'bookmarks.categories.travel': 'Travel',
      'bookmarks.categories.food': 'Food',
      'bookmarks.categories.shopping': 'Shopping',

      // Measurement
      'measurement.title': 'Measurement Tool',
      'measurement.distance': 'Distance',
      'measurement.area': 'Area',
      'measurement.route': 'Route Distance',
      'measurement.clear': 'Clear',
      'measurement.units.metric': 'Metric',
      'measurement.units.imperial': 'Imperial',

      // Route
      'route.from': 'From',
      'route.to': 'To',
      'route.calculate': 'Calculate Route',
      'route.clear': 'Clear Route',
      'route.driving': 'Driving',
      'route.walking': 'Walking',

      // Share
      'share.title': 'Share',
      'share.copyLink': 'Copy Link',
      'share.linkCopied': 'Link copied',

      // Settings
      'settings.title': 'Settings',
      'settings.language': 'Language',
      'settings.theme': 'Theme',
      'settings.theme.light': 'Light',
      'settings.theme.dark': 'Dark',
      'settings.theme.auto': 'Auto',

      // Transit
      'transit.title': 'Public Transit',
      'transit.from': 'From',
      'transit.to': 'To',
      'transit.depart_at': 'Depart at',
      'transit.arrive_by': 'Arrive by',
      'transit.now': 'Now',
      'transit.optimize': 'Optimize for',
      'transit.optimize_time': 'Fastest',
      'transit.optimize_transfers': 'Fewest transfers',
      'transit.optimize_cost': 'Lowest cost',
      'transit.wheelchair': 'Wheelchair accessible',
      'transit.search': 'Search Routes',
      'transit.searching': 'Searching routes...',
      'transit.no_routes': 'No routes found',

      // Errors
      'error.networkError': 'Network error occurred',
      'error.locationNotFound': 'Location not found',
      'error.permissionDenied': 'Location permission denied',
      'error.unknownError': 'Unknown error occurred'
    };
  }

  getChineseTranslations() {
    return {
      // Common
      'common.loading': '加载中...',
      'common.error': '错误',
      'common.success': '成功',
      'common.warning': '警告',
      'common.info': '信息',
      'common.ok': '确定',
      'common.cancel': '取消',
      'common.save': '保存',
      'common.delete': '删除',
      'common.edit': '编辑',
      'common.add': '添加',
      'common.search': '搜索',
      'common.close': '关闭',
      'common.back': '返回',
      'common.next': '下一步',
      'common.previous': '上一步',
      'common.yes': '是',
      'common.no': '否',

      // App
      'app.title': 'Kiro OSS 地图',
      'app.description': '开源地图应用程序',

      // Navigation
      'nav.search': '搜索',
      'nav.route': '路线',
      'nav.bookmarks': '书签',
      'nav.measurement': '测量',
      'nav.share': '分享',
      'nav.settings': '设置',

      // Search
      'search.placeholder': '搜索地点...',
      'search.noResults': '未找到结果',
      'search.searching': '搜索中...',
      'search.results': '搜索结果',

      // Map
      'map.currentLocation': '显示当前位置',
      'map.zoomIn': '放大',
      'map.zoomOut': '缩小',
      'map.layers': '图层',
      'map.satellite': '卫星',
      'map.terrain': '地形',
      'map.standard': '标准',

      // Bookmarks
      'bookmarks.title': '书签',
      'bookmarks.add': '添加书签',
      'bookmarks.name': '名称',
      'bookmarks.category': '类别',
      'bookmarks.notes': '备注',
      'bookmarks.tags': '标签',
      'bookmarks.noBookmarks': '没有书签',
      'bookmarks.addHere': '在此添加书签',
      'bookmarks.categories.work': '工作',
      'bookmarks.categories.personal': '个人',
      'bookmarks.categories.travel': '旅行',
      'bookmarks.categories.food': '美食',
      'bookmarks.categories.shopping': '购物'
    };
  }

  getKoreanTranslations() {
    return {
      // Common
      'common.loading': '로딩 중...',
      'common.error': '오류',
      'common.success': '성공',
      'common.warning': '경고',
      'common.info': '정보',
      'common.ok': '확인',
      'common.cancel': '취소',
      'common.save': '저장',
      'common.delete': '삭제',
      'common.edit': '편집',
      'common.add': '추가',
      'common.search': '검색',
      'common.close': '닫기',
      'common.back': '뒤로',
      'common.next': '다음',
      'common.previous': '이전',
      'common.yes': '예',
      'common.no': '아니오',

      // App
      'app.title': 'Kiro OSS 지도',
      'app.description': '오픈소스 지도 애플리케이션',

      // Navigation
      'nav.search': '검색',
      'nav.route': '경로',
      'nav.bookmarks': '북마크',
      'nav.measurement': '측정',
      'nav.share': '공유',
      'nav.settings': '설정',

      // Search
      'search.placeholder': '장소 검색...',
      'search.noResults': '결과를 찾을 수 없습니다',
      'search.searching': '검색 중...',
      'search.results': '검색 결과',

      // Map
      'map.currentLocation': '현재 위치 표시',
      'map.zoomIn': '확대',
      'map.zoomOut': '축소',
      'map.layers': '레이어',
      'map.satellite': '위성',
      'map.terrain': '지형',
      'map.standard': '표준',

      // Bookmarks
      'bookmarks.title': '북마크',
      'bookmarks.add': '북마크 추가',
      'bookmarks.name': '이름',
      'bookmarks.category': '카테고리',
      'bookmarks.notes': '메모',
      'bookmarks.tags': '태그',
      'bookmarks.noBookmarks': '북마크가 없습니다',
      'bookmarks.addHere': '여기에 북마크 추가',
      'bookmarks.categories.work': '업무',
      'bookmarks.categories.personal': '개인',
      'bookmarks.categories.travel': '여행',
      'bookmarks.categories.food': '음식',
      'bookmarks.categories.shopping': '쇼핑'
    };
  }

  translate(key, params = {}) {
    const translations = this.translations.get(this.currentLanguage) || {};
    let translation = translations[key];

    // Fallback to default language if translation not found
    if (!translation && this.currentLanguage !== this.fallbackLanguage) {
      const fallbackTranslations = this.translations.get(this.fallbackLanguage) || {};
      translation = fallbackTranslations[key];
    }

    // If still no translation, return the key
    if (!translation) {
      Logger.warn('Translation not found', { key, language: this.currentLanguage });
      return key;
    }

    // Replace parameters
    return this.interpolate(translation, params);
  }

  interpolate(text, params) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  formatDate(date, options = 'medium') {
    const formats = this.dateTimeFormats.get(this.currentLanguage) || this.dateTimeFormats.get(this.fallbackLanguage);
    const format = formats[options] || formats.medium;

    try {
      return new Intl.DateTimeFormat(this.currentLanguage, format).format(new Date(date));
    } catch (error) {
      Logger.error('Date formatting error', { date, options, error: error.message });
      return date.toString();
    }
  }

  formatNumber(number, options = 'decimal') {
    const formats = this.numberFormats.get(this.currentLanguage) || this.numberFormats.get(this.fallbackLanguage);
    const format = formats[options] || formats.decimal;

    try {
      return new Intl.NumberFormat(this.currentLanguage, format).format(number);
    } catch (error) {
      Logger.error('Number formatting error', { number, options, error: error.message });
      return number.toString();
    }
  }

  updateTranslatableElements() {
    // Update elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.dataset.i18n;
      const translation = this.translate(key);
      
      if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
        element.placeholder = translation;
      } else if (element.hasAttribute('title')) {
        element.title = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Update elements with data-i18n-html attribute (for HTML content)
    const htmlElements = document.querySelectorAll('[data-i18n-html]');
    htmlElements.forEach(element => {
      const key = element.dataset.i18nHtml;
      const translation = this.translate(key);
      element.innerHTML = translation;
    });
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getSupportedLanguages() {
    return Array.from(this.supportedLanguages.entries()).map(([code, info]) => ({
      code,
      ...info
    }));
  }

  isRTL() {
    const rtlLanguages = ['ar', 'he', 'fa'];
    return rtlLanguages.includes(this.currentLanguage);
  }

  // Utility method for components
  t(key, params = {}) {
    return this.translate(key, params);
  }

  // Static method for easy access
  static getInstance() {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }
}

// Export function for easy access
export function getI18nService() {
  return I18nService.getInstance();
}