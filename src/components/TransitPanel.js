/**
 * TransitPanel - 公共交通パネル（統合版では main.js に統合済み）
 * このファイルは互換性のために残されています
 */

console.log('🚌 TransitPanel - 統合版では main.js に統合済み');

/**
 * TransitPanelクラス（ES6クラス構文使用）
 * 実際の機能は main.js で提供されます
 */
class TransitPanel {
    // イベント処理システムの強化
    setupEventHandlers() {
        if (this.eventHandlersSetup) return;
        
        try {
            // パネル表示・非表示イベント
            this.addEventListener('panel-toggle', this.handlePanelToggle.bind(this));
            
            // 路線検索イベント
            this.addEventListener('route-search', this.handleRouteSearch.bind(this));
            
            // 停留所検索イベント
            this.addEventListener('stop-search', this.handleStopSearch.bind(this));
            
            // 時刻表表示イベント
            this.addEventListener('timetable-show', this.handleTimetableShow.bind(this));
            
            // データ更新イベント
            this.addEventListener('data-update', this.handleDataUpdate.bind(this));
            
            // 設定変更イベント
            this.addEventListener('settings-change', this.handleSettingsChange.bind(this));
            
            this.eventHandlersSetup = true;
            console.log('✅ TransitPanel: イベントハンドラー設定完了');
            
        } catch (error) {
            console.error('❌ TransitPanel: イベントハンドラー設定エラー:', error);
            this.handleError('イベントハンドラー設定に失敗しました', error);
        }
    }
    
    // イベントハンドラーのクリーンアップ
    cleanupEventHandlers() {
        try {
            this.removeEventListener('panel-toggle', this.handlePanelToggle);
            this.removeEventListener('route-search', this.handleRouteSearch);
            this.removeEventListener('stop-search', this.handleStopSearch);
            this.removeEventListener('timetable-show', this.handleTimetableShow);
            this.removeEventListener('data-update', this.handleDataUpdate);
            this.removeEventListener('settings-change', this.handleSettingsChange);
            
            this.eventHandlersSetup = false;
            console.log('✅ TransitPanel: イベントハンドラークリーンアップ完了');
            
        } catch (error) {
            console.error('❌ TransitPanel: イベントハンドラークリーンアップエラー:', error);
        }
    }
    
    // パネル表示・非表示ハンドラー
    handlePanelToggle(event) {
        try {
            const { visible } = event.detail || {};
            
            if (visible) {
                this.showPanel();
                this.loadTransitData();
            } else {
                this.hidePanel();
                this.clearTransitData();
            }
            
            console.log('✅ TransitPanel: パネル表示切り替え完了');
            
        } catch (error) {
            console.error('❌ TransitPanel: パネル表示切り替えエラー:', error);
            this.handleError('パネルの表示切り替えに失敗しました', error);
        }
    }
    
    // 路線検索ハンドラー
    handleRouteSearch(event) {
        try {
            const { from, to, options } = event.detail || {};
            
            if (!from || !to) {
                throw new Error('出発地と目的地が必要です');
            }
            
            this.searchRoute(from, to, options);
            console.log('✅ TransitPanel: 路線検索開始');
            
        } catch (error) {
            console.error('❌ TransitPanel: 路線検索エラー:', error);
            this.handleError('路線検索に失敗しました', error);
        }
    }
    
    // データ更新ハンドラー
    handleDataUpdate(event) {
        try {
            const { dataType, data } = event.detail || {};
            
            switch (dataType) {
                case 'routes':
                    this.updateRoutes(data);
                    break;
                case 'stops':
                    this.updateStops(data);
                    break;
                case 'timetable':
                    this.updateTimetable(data);
                    break;
                default:
                    console.warn('未知のデータタイプ:', dataType);
            }
            
            console.log('✅ TransitPanel: データ更新完了');
            
        } catch (error) {
            console.error('❌ TransitPanel: データ更新エラー:', error);
            this.handleError('データの更新に失敗しました', error);
        }
    }
    
    // エラーハンドリング強化
    handleError(message, error) {
        try {
            console.error('TransitPanel Error:', message, error);
            
            // エラーメッセージの表示
            this.showErrorMessage(message);
            
            // エラー情報の記録
            if (window.errorLogger) {
                window.errorLogger.log('TransitPanel', message, error);
            }
            
            // フォールバック処理
            this.performFallback();
            
        } catch (fallbackError) {
            console.error('❌ TransitPanel: エラーハンドリングエラー:', fallbackError);
        }
    }
    
    // フォールバック処理
    performFallback() {
        try {
            // UI状態のリセット
            this.resetUIState();
            
            // 基本データの再読み込み
            this.reloadBasicData();
            
            console.log('✅ TransitPanel: フォールバック処理完了');
            
        } catch (error) {
            console.error('❌ TransitPanel: フォールバック処理エラー:', error);
        }
    }
    constructor() {
        this.initialized = true;
        this.message = 'TransitPanel functionality is integrated into main.js';
        this.eventListeners = new Map();
        console.log(`TransitPanel: スタブクラスが初期化されました`);
    }
    
    // ES6アロー関数を使用
    show = () => {
        try {
            console.log('TransitPanel.show(): 統合版では main.js で表示されます');
            this.emit('show');
            return this;
        } catch (error) {
            this.handleError('show', error);
            return this;
        }
    }
    
    hide = () => {
        try {
            console.log('TransitPanel.hide(): 統合版では main.js で非表示になります');
            this.emit('hide');
            return this;
        } catch (error) {
            this.handleError('hide', error);
            return this;
        }
    }
    
    searchTransit = () => {
        try {
            console.log('TransitPanel.searchTransit(): 統合版では main.js で実行されます');
            this.emit('searchStarted');
            return this;
        } catch (error) {
            this.handleError('searchTransit', error);
            return this;
        }
    }
    
    displayRoutes = () => {
        try {
            console.log('TransitPanel.displayRoutes(): 統合版では main.js で実行されます');
            this.emit('routesDisplayed');
            return this;
        } catch (error) {
            this.handleError('displayRoutes', error);
            return this;
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
                    console.error(`TransitPanel: イベント処理エラー (${event}):`, error);
                }
            });
        }
    }
    
    // エラーハンドリング
    handleError(method, error) {
        console.error(`TransitPanel.${method}(): エラーが発生しました`, error);
        this.emit('error', { method, error });
    }
    
    // ES6 const使用
    getIntegrationStatus() {
        const status = {
            integrated: true,
            location: 'main.js',
            status: 'active',
            features: ['show', 'hide', 'searchTransit', 'displayRoutes']
        };
        return status;
    }
}

// CommonJS形式でエクスポート（Node.js互換）
module.exports = TransitPanel;

// ブラウザ環境での互換性
if (typeof window !== 'undefined') {
    window.TransitPanel = TransitPanel;
}

// デフォルトエクスポート（ES6互換）
module.exports.default = TransitPanel;