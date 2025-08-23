/**
 * BookmarkPanel - ブックマーク管理パネル（統合版では main.js に統合済み）
 * このファイルは互換性のために残されています
 */

console.log('🔖 BookmarkPanel - 統合版では main.js に統合済み');

/**
 * BookmarkPanelクラス（ES6クラス構文使用）
 * 実際の機能は main.js で提供されます
 */
class BookmarkPanel {
    // イベント処理システムの強化
    setupEventHandlers() {
        if (this.eventHandlersSetup) return;
        
        try {
            // ブックマーク追加イベント
            this.addEventListener('bookmark-add', this.handleBookmarkAdd.bind(this));
            
            // ブックマーク削除イベント  
            this.addEventListener('bookmark-delete', this.handleBookmarkDelete.bind(this));
            
            // ブックマーク編集イベント
            this.addEventListener('bookmark-edit', this.handleBookmarkEdit.bind(this));
            
            // カテゴリ変更イベント
            this.addEventListener('category-change', this.handleCategoryChange.bind(this));
            
            // 検索イベント
            this.addEventListener('search-input', this.handleSearchInput.bind(this));
            
            // パネル表示・非表示イベント
            this.addEventListener('panel-toggle', this.handlePanelToggle.bind(this));
            
            this.eventHandlersSetup = true;
            console.log('✅ BookmarkPanel: イベントハンドラー設定完了');
            
        } catch (error) {
            console.error('❌ BookmarkPanel: イベントハンドラー設定エラー:', error);
            this.handleError('イベントハンドラー設定に失敗しました', error);
        }
    }
    
    // イベントハンドラーのクリーンアップ
    cleanupEventHandlers() {
        try {
            this.removeEventListener('bookmark-add', this.handleBookmarkAdd);
            this.removeEventListener('bookmark-delete', this.handleBookmarkDelete);
            this.removeEventListener('bookmark-edit', this.handleBookmarkEdit);
            this.removeEventListener('category-change', this.handleCategoryChange);
            this.removeEventListener('search-input', this.handleSearchInput);
            this.removeEventListener('panel-toggle', this.handlePanelToggle);
            
            this.eventHandlersSetup = false;
            console.log('✅ BookmarkPanel: イベントハンドラークリーンアップ完了');
            
        } catch (error) {
            console.error('❌ BookmarkPanel: イベントハンドラークリーンアップエラー:', error);
        }
    }
    
    // ブックマーク追加ハンドラー
    handleBookmarkAdd(event) {
        try {
            const { location, title, category } = event.detail || {};
            
            if (!location || !title) {
                throw new Error('必須パラメータが不足しています');
            }
            
            const bookmark = {
                id: Date.now().toString(),
                location,
                title,
                category: category || 'default',
                createdAt: new Date().toISOString()
            };
            
            this.addBookmark(bookmark);
            this.showSuccessMessage('ブックマークを追加しました');
            
        } catch (error) {
            console.error('❌ BookmarkPanel: ブックマーク追加エラー:', error);
            this.handleError('ブックマークの追加に失敗しました', error);
        }
    }
    
    // ブックマーク削除ハンドラー
    handleBookmarkDelete(event) {
        try {
            const { bookmarkId } = event.detail || {};
            
            if (!bookmarkId) {
                throw new Error('ブックマークIDが指定されていません');
            }
            
            this.deleteBookmark(bookmarkId);
            this.showSuccessMessage('ブックマークを削除しました');
            
        } catch (error) {
            console.error('❌ BookmarkPanel: ブックマーク削除エラー:', error);
            this.handleError('ブックマークの削除に失敗しました', error);
        }
    }
    
    // エラーハンドリング強化
    handleError(message, error) {
        try {
            console.error('BookmarkPanel Error:', message, error);
            
            // エラーメッセージの表示
            this.showErrorMessage(message);
            
            // エラー情報の記録
            if (window.errorLogger) {
                window.errorLogger.log('BookmarkPanel', message, error);
            }
            
            // フォールバック処理
            this.performFallback();
            
        } catch (fallbackError) {
            console.error('❌ BookmarkPanel: フォールバック処理エラー:', fallbackError);
        }
    }
    
    // フォールバック処理
    performFallback() {
        try {
            // UI状態のリセット
            this.resetUIState();
            
            // データの再読み込み
            this.reloadBookmarks();
            
            console.log('✅ BookmarkPanel: フォールバック処理完了');
            
        } catch (error) {
            console.error('❌ BookmarkPanel: フォールバック処理エラー:', error);
        }
    }
    constructor() {
        this.initialized = true;
        this.message = 'BookmarkPanel functionality is integrated into main.js';
        console.log(`BookmarkPanel: スタブクラスが初期化されました`);
    }
    
    // ES6アロー関数を使用
    show = () => {
        console.log('BookmarkPanel.show(): 統合版では main.js で表示されます');
        return this;
    }
    
    hide = () => {
        console.log('BookmarkPanel.hide(): 統合版では main.js で非表示になります');
        return this;
    }
    
    // ES6 const使用
    getIntegrationStatus() {
        const status = {
            integrated: true,
            location: 'main.js',
            status: 'active'
        };
        return status;
    }
}

// CommonJS形式でエクスポート（Node.js互換）
module.exports = BookmarkPanel;

// ブラウザ環境での互換性
if (typeof window !== 'undefined') {
    window.BookmarkPanel = BookmarkPanel;
}

// デフォルトエクスポート（ES6互換）
module.exports.default = BookmarkPanel;