/**
 * MapService - 地図関連サービス（統合版では main.js に統合済み）
 * このファイルは互換性のために残されています
 */

console.log('📍 MapService - 統合版では main.js に統合済み');

/**
 * MapServiceクラス（ES6クラス構文使用）
 */
class MapService {
    constructor() {
        this.initialized = true;
        this.message = 'MapService functionality is integrated into main.js';
    }
    
    // ES6アロー関数を使用
    init = () => {
        console.log('MapService: 統合版では main.js で初期化されます');
        return this;
    }
    
    // ES6 const使用
    getStatus() {
        const status = {
            integrated: true,
            location: 'main.js',
            active: true
        };
        return status;
    }
}

// CommonJS形式でエクスポート（Node.js互換）
module.exports = MapService;

// ブラウザ環境での互換性
if (typeof window !== 'undefined') {
    window.MapService = MapService;
}

// デフォルトエクスポート（ES6互換）
module.exports.default = MapService;