/**
 * Kiro OSS Map - セキュリティユーティリティ v2.2.0
 * XSS対策・入力検証・データサニタイゼーション
 */

/**
 * XSS対策 - HTMLエスケープ
 */
export const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * XSS対策 - 属性値エスケープ
 */
export const escapeAttribute = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * 入力値検証
 */
export const validateInput = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  coordinates: (lat, lng) => {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  },
  
  searchQuery: (query) => {
    // 危険な文字列をチェック
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /data:text\/html/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(query));
  }
};

/**
 * データサニタイゼーション
 */
export const sanitize = {
  searchQuery: (query) => {
    return query
      .replace(/<[^>]*>/g, '') // HTMLタグ除去
      .replace(/[<>'"&]/g, '') // 危険な文字除去
      .trim()
      .substring(0, 100); // 長さ制限
  },
  
  userInput: (input) => {
    return input
      .replace(/[<>'"&\x00-\x1f\x7f-\x9f]/g, '') // 制御文字・危険文字除去
      .trim()
      .substring(0, 1000); // 長さ制限
  }
};

/**
 * CSRFトークン生成
 */
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * セキュアなランダム文字列生成
 */
export const generateSecureRandom = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
};

/**
 * コンテンツセキュリティポリシー設定
 */
export const setCSP = () => {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://nominatim.openstreetmap.org https://router.project-osrm.org",
    "font-src 'self' https://unpkg.com"
  ].join('; ');
  
  document.head.appendChild(meta);
};
