/**
 * Theme service for managing light/dark mode
 */
export class ThemeService {
  constructor() {
    this.currentTheme = 'light';
    this.storageKey = 'kiro-oss-map-theme';
  }

  initialize() {
    // Load saved theme or detect system preference
    const savedTheme = localStorage.getItem(this.storageKey);
    
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKey)) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }

    this.currentTheme = theme;
    
    // Update DOM
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Update theme toggle button icon
    this.updateThemeToggleIcon();

    // Save to localStorage
    localStorage.setItem(this.storageKey, theme);

    // Emit theme change event
    window.dispatchEvent(new CustomEvent('themechange', { 
      detail: { theme } 
    }));
  }

  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  isDark() {
    return this.currentTheme === 'dark';
  }

  isLight() {
    return this.currentTheme === 'light';
  }

  updateThemeToggleIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const icon = themeToggle.querySelector('svg');
    if (!icon) return;

    if (this.currentTheme === 'dark') {
      // Sun icon for switching to light mode
      icon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z">
        </path>
      `;
      themeToggle.title = 'ライトモードに切替';
    } else {
      // Moon icon for switching to dark mode
      icon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z">
        </path>
      `;
      themeToggle.title = 'ダークモードに切替';
    }
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  resetToSystem() {
    localStorage.removeItem(this.storageKey);
    this.setTheme(this.getSystemTheme());
  }
}