/**
 * ShareDialog - 共有ダイアログ（統合版では main.js に統合済み）
 * このファイルは互換性のために残されています
 */

console.log('🔗 ShareDialog - 統合版では main.js に統合済み');

/**
 * ShareDialogクラス（ES6クラス構文使用）
 * 実際の機能は main.js で提供されます
 */
class ShareDialog {
    // イベント処理システムの強化
    setupEventHandlers() {
        if (this.eventHandlersSetup) return;
        
        try {
            // ダイアログ表示イベント
            this.addEventListener('dialog-show', this.handleDialogShow.bind(this));
            
            // ダイアログ非表示イベント
            this.addEventListener('dialog-hide', this.handleDialogHide.bind(this));
            
            // URL共有イベント
            this.addEventListener('share-url', this.handleShareUrl.bind(this));
            
            // クリップボードコピーイベント
            this.addEventListener('copy-clipboard', this.handleCopyClipboard.bind(this));
            
            // ソーシャル共有イベント
            this.addEventListener('social-share', this.handleSocialShare.bind(this));
            
            // キーボードイベント
            this.addEventListener('keydown', this.handleKeydown.bind(this));
            
            this.eventHandlersSetup = true;
            console.log('✅ ShareDialog: イベントハンドラー設定完了');
            
        } catch (error) {
            console.error('❌ ShareDialog: イベントハンドラー設定エラー:', error);
            this.handleError('イベントハンドラー設定に失敗しました', error);
        }
    }
    
    // イベントハンドラーのクリーンアップ
    cleanupEventHandlers() {
        try {
            this.removeEventListener('dialog-show', this.handleDialogShow);
            this.removeEventListener('dialog-hide', this.handleDialogHide);
            this.removeEventListener('share-url', this.handleShareUrl);
            this.removeEventListener('copy-clipboard', this.handleCopyClipboard);
            this.removeEventListener('social-share', this.handleSocialShare);
            this.removeEventListener('keydown', this.handleKeydown);
            
            this.eventHandlersSetup = false;
            console.log('✅ ShareDialog: イベントハンドラークリーンアップ完了');
            
        } catch (error) {
            console.error('❌ ShareDialog: イベントハンドラークリーンアップエラー:', error);
        }
    }
    
    // ダイアログ表示ハンドラー
    handleDialogShow(event) {
        try {
            const { shareData } = event.detail || {};
            
            if (!shareData) {
                throw new Error('共有データが指定されていません');
            }
            
            this.showDialog(shareData);
            console.log('✅ ShareDialog: ダイアログ表示完了');
            
        } catch (error) {
            console.error('❌ ShareDialog: ダイアログ表示エラー:', error);
            this.handleError('ダイアログの表示に失敗しました', error);
        }
    }
    
    // クリップボードコピーハンドラー
    handleCopyClipboard(event) {
        try {
            const { text } = event.detail || {};
            
            if (!text) {
                throw new Error('コピーするテキストが指定されていません');
            }
            
            // クリップボードAPI使用
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showSuccessMessage('URLをクリップボードにコピーしました');
                }).catch((error) => {
                    throw new Error('クリップボードコピーに失敗しました: ' + error.message);
                });
            } else {
                // フォールバック処理
                this.fallbackCopyToClipboard(text);
            }
            
        } catch (error) {
            console.error('❌ ShareDialog: クリップボードコピーエラー:', error);
            this.handleError('クリップボードへのコピーに失敗しました', error);
        }
    }
    
    // フォールバッククリップボードコピー
    fallbackCopyToClipboard(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showSuccessMessage('URLをクリップボードにコピーしました');
            
        } catch (error) {
            console.error('❌ ShareDialog: フォールバックコピーエラー:', error);
            this.showErrorMessage('クリップボードへのコピーに失敗しました');
        }
    }
    
    // キーボードイベントハンドラー
    handleKeydown(event) {
        try {
            if (event.key === 'Escape') {
                this.hideDialog();
            } else if (event.key === 'Enter' && event.ctrlKey) {
                this.handleQuickShare();
            }
            
        } catch (error) {
            console.error('❌ ShareDialog: キーボードイベントエラー:', error);
        }
    }
    
    // エラーハンドリング強化
    handleError(message, error) {
        try {
            console.error('ShareDialog Error:', message, error);
            
            // エラーメッセージの表示
            this.showErrorMessage(message);
            
            // エラー情報の記録
            if (window.errorLogger) {
                window.errorLogger.log('ShareDialog', message, error);
            }
            
        } catch (fallbackError) {
            console.error('❌ ShareDialog: エラーハンドリングエラー:', fallbackError);
        }
    }
    constructor() {
        this.initialized = true;
        this.message = 'ShareDialog functionality is integrated into main.js';
        this.eventListeners = new Map();
        console.log(`ShareDialog: スタブクラスが初期化されました`);
    }
    
    // ES6アロー関数を使用
    show = () => {
        try {
            console.log('ShareDialog.show(): 統合版では main.js で表示されます');
            this.emit('show');
            return this;
        } catch (error) {
            this.handleError('show', error);
            return this;
        }
    }
    
    hide = () => {
        try {
            console.log('ShareDialog.hide(): 統合版では main.js で非表示になります');
            this.emit('hide');
            return this;
        } catch (error) {
            this.handleError('hide', error);
            return this;
        }
    }
    
    generateShareUrl = () => {
        try {
            console.log('ShareDialog.generateShareUrl(): 統合版では main.js で実行されます');
            const url = 'https://example.com/share';
            this.emit('urlGenerated', url);
            return url;
        } catch (error) {
            this.handleError('generateShareUrl', error);
            return null;
        }
    }
    
    copyToClipboard = () => {
        try {
            console.log('ShareDialog.copyToClipboard(): 統合版では main.js で実行されます');
            this.emit('copied');
            return true;
        } catch (error) {
            this.handleError('copyToClipboard', error);
            return false;
        }
    }
    
    // イベント処理機能
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        return this;
    }
    
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`ShareDialog: イベント処理エラー (${event}):`, error);
                }
            });
        }
    }
    
    // エラーハンドリング
    handleError(method, error) {
        console.error(`ShareDialog.${method}(): エラーが発生しました`, error);
        this.emit('error', { method, error });
    }
    
    // ES6 const使用
    getIntegrationStatus() {
        const status = {
            integrated: true,
            location: 'main.js',
            status: 'active',
            features: ['show', 'hide', 'generateShareUrl', 'copyToClipboard']
        };
        return status;
    }
}

// CommonJS形式でエクスポート（Node.js互換）
module.exports = ShareDialog;

// ブラウザ環境での互換性
if (typeof window !== 'undefined') {
    window.ShareDialog = ShareDialog;
}

// デフォルトエクスポート（ES6互換）
module.exports.default = ShareDialog;