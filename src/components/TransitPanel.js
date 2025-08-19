/**
 * TransitPanel - 公共交通パネルコンポーネント
 * 公共交通ルート検索・表示・乗り換え案内UI
 * 
 * @version 2.1.0
 * @author Kiro AI Assistant
 * @created 2025-08-19
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { getPublicTransitService } from '../services/PublicTransitService.js';
import { getI18nService } from '../services/I18nService.js';

export class TransitPanel extends HTMLElement {
    constructor() {
        super();
        this.logger = new Logger('TransitPanel');
        this.transitService = getPublicTransitService();
        this.i18nService = getI18nService();
        
        // 状態管理
        this.state = {
            isVisible: false,
            isSearching: false,
            routes: [],
            selectedRoute: null,
            searchParams: {
                origin: null,
                destination: null,
                departureTime: null,
                arrivalTime: null,
                optimize: 'time',
                maxTransfers: 3,
                wheelchair: false
            }
        };
        
        this.init();
    }
    
    /**
     * コンポーネント初期化
     */
    init() {
        this.render();
        this.setupEventListeners();
        this.setupTransitServiceListeners();
        this.logger.info('TransitPanel initialized');
    }
    
    /**
     * レンダリング
     */
    render() {
        this.innerHTML = `
            <div class="transit-panel ${this.state.isVisible ? 'visible' : 'hidden'}">
                <div class="transit-header">
                    <h3 data-i18n="transit.title">公共交通</h3>
                    <button class="close-btn" aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="transit-search">
                    <div class="search-form">
                        <div class="location-inputs">
                            <div class="input-group">
                                <label data-i18n="transit.from">出発地</label>
                                <input type="text" class="origin-input" placeholder="出発地を入力" data-i18n-placeholder="transit.from_placeholder">
                                <button class="location-btn origin-location-btn" title="現在地を使用">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                </button>
                            </div>
                            
                            <button class="swap-locations-btn" title="出発地と目的地を入れ替え">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="17,1 21,5 17,9"></polyline>
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                    <polyline points="7,23 3,19 7,15"></polyline>
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                </svg>
                            </button>
                            
                            <div class="input-group">
                                <label data-i18n="transit.to">目的地</label>
                                <input type="text" class="destination-input" placeholder="目的地を入力" data-i18n-placeholder="transit.to_placeholder">
                                <button class="location-btn destination-location-btn" title="地図から選択">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="time-options">
                            <div class="time-type">
                                <label>
                                    <input type="radio" name="time-type" value="departure" checked>
                                    <span data-i18n="transit.depart_at">出発時刻</span>
                                </label>
                                <label>
                                    <input type="radio" name="time-type" value="arrival">
                                    <span data-i18n="transit.arrive_by">到着時刻</span>
                                </label>
                                <label>
                                    <input type="radio" name="time-type" value="now">
                                    <span data-i18n="transit.now">今すぐ</span>
                                </label>
                            </div>
                            
                            <div class="datetime-input">
                                <input type="date" class="date-input">
                                <input type="time" class="time-input">
                            </div>
                        </div>
                        
                        <div class="search-options">
                            <div class="optimize-options">
                                <label data-i18n="transit.optimize">最適化</label>
                                <select class="optimize-select">
                                    <option value="time" data-i18n="transit.optimize_time">最短時間</option>
                                    <option value="transfers" data-i18n="transit.optimize_transfers">最少乗り換え</option>
                                    <option value="cost" data-i18n="transit.optimize_cost">最安運賃</option>
                                </select>
                            </div>
                            
                            <div class="accessibility-options">
                                <label>
                                    <input type="checkbox" class="wheelchair-checkbox">
                                    <span data-i18n="transit.wheelchair">車椅子対応</span>
                                </label>
                            </div>
                        </div>
                        
                        <button class="search-btn" data-i18n="transit.search">ルート検索</button>
                    </div>
                </div>
                
                <div class="transit-results">
                    <div class="loading-indicator ${this.state.isSearching ? 'visible' : 'hidden'}">
                        <div class="spinner"></div>
                        <span data-i18n="transit.searching">検索中...</span>
                    </div>
                    
                    <div class="routes-list">
                        ${this.renderRoutes()}
                    </div>
                </div>
                
                <div class="route-details ${this.state.selectedRoute ? 'visible' : 'hidden'}">
                    ${this.renderRouteDetails()}
                </div>
            </div>
        `;
        
        // 多言語対応
        this.i18nService.updateTranslatableElements();
        
        // 現在時刻を設定
        this.setCurrentDateTime();
    }
    
    /**
     * ルート一覧レンダリング
     */
    renderRoutes() {
        if (this.state.routes.length === 0) {
            return `
                <div class="no-routes">
                    <p data-i18n="transit.no_routes">ルートが見つかりませんでした</p>
                </div>
            `;
        }
        
        return this.state.routes.map((route, index) => `
            <div class="route-item ${this.state.selectedRoute?.id === route.id ? 'selected' : ''}" 
                 data-route-index="${index}">
                <div class="route-summary">
                    <div class="route-time">
                        <span class="departure-time">${this.formatTime(route.departure_time)}</span>
                        <span class="duration">${this.formatDuration(route.duration)}</span>
                        <span class="arrival-time">${this.formatTime(route.arrival_time)}</span>
                    </div>
                    
                    <div class="route-info">
                        <div class="transfers">
                            <span class="transfer-count">${route.transfers}</span>
                            <span data-i18n="transit.transfers">回乗り換え</span>
                        </div>
                        
                        <div class="route-modes">
                            ${route.legs.filter(leg => leg.type === 'transit')
                                .map(leg => `<span class="mode-icon mode-${leg.mode}">${this.getModeIcon(leg.mode)}</span>`)
                                .join('')}
                        </div>
                        
                        <div class="route-fare">
                            <span class="fare-amount">¥${route.fare?.total || 0}</span>
                        </div>
                    </div>
                    
                    ${route.has_realtime ? '<div class="realtime-indicator" title="リアルタイム情報">🔴</div>' : ''}
                </div>
                
                <div class="route-legs">
                    ${route.legs.map(leg => this.renderLeg(leg)).join('')}
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 区間レンダリング
     */
    renderLeg(leg) {
        if (leg.type === 'walking') {
            return `
                <div class="leg walking-leg">
                    <div class="leg-icon">🚶</div>
                    <div class="leg-info">
                        <span class="leg-description" data-i18n="transit.walk_to">徒歩</span>
                        <span class="leg-duration">${this.formatDuration(leg.duration)}</span>
                        <span class="leg-distance">${Math.round(leg.distance)}m</span>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="leg transit-leg">
                <div class="leg-icon mode-${leg.mode}">${this.getModeIcon(leg.mode)}</div>
                <div class="leg-info">
                    <div class="leg-route">
                        <span class="route-name">${leg.route_short_name || leg.route_name}</span>
                        <span class="route-direction">${leg.trip_headsign || ''}</span>
                    </div>
                    <div class="leg-stops">
                        <span class="from-stop">${leg.from_stop_name}</span>
                        <span class="to-stop">${leg.to_stop_name}</span>
                    </div>
                    <div class="leg-time">
                        <span class="departure">${this.formatTime(leg.departure_time)}</span>
                        <span class="arrival">${this.formatTime(leg.arrival_time)}</span>
                        ${leg.delay ? `<span class="delay">+${leg.delay}分</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * ルート詳細レンダリング
     */
    renderRouteDetails() {
        if (!this.state.selectedRoute) return '';
        
        const route = this.state.selectedRoute;
        
        return `
            <div class="route-details-content">
                <div class="details-header">
                    <h4 data-i18n="transit.route_details">ルート詳細</h4>
                    <button class="back-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15,18 9,12 15,6"></polyline>
                        </svg>
                    </button>
                </div>
                
                <div class="details-summary">
                    <div class="total-time">
                        <span class="label" data-i18n="transit.total_time">総所要時間</span>
                        <span class="value">${this.formatDuration(route.duration)}</span>
                    </div>
                    <div class="total-fare">
                        <span class="label" data-i18n="transit.total_fare">総運賃</span>
                        <span class="value">¥${route.fare?.total || 0}</span>
                    </div>
                    <div class="total-distance">
                        <span class="label" data-i18n="transit.total_distance">総距離</span>
                        <span class="value">${(route.distance / 1000).toFixed(1)}km</span>
                    </div>
                </div>
                
                <div class="detailed-steps">
                    ${route.legs.map((leg, index) => this.renderDetailedLeg(leg, index)).join('')}
                </div>
                
                <div class="fare-breakdown">
                    <h5 data-i18n="transit.fare_breakdown">運賃内訳</h5>
                    ${route.fare?.breakdown?.map(fare => `
                        <div class="fare-item">
                            <span class="route-name">${fare.route_name}</span>
                            <span class="fare-amount">¥${fare.fare}</span>
                        </div>
                    `).join('') || '<p data-i18n="transit.no_fare_info">運賃情報なし</p>'}
                </div>
            </div>
        `;
    }
    
    /**
     * 詳細区間レンダリング
     */
    renderDetailedLeg(leg, index) {
        if (leg.type === 'walking') {
            return `
                <div class="detailed-leg walking">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-content">
                        <div class="step-title">
                            <span data-i18n="transit.walk_to">徒歩</span>
                            <span class="duration">${this.formatDuration(leg.duration)}</span>
                        </div>
                        <div class="step-description">
                            ${leg.from_name || ''} から ${leg.to_name || ''} まで徒歩
                            <br>距離: ${Math.round(leg.distance)}m
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="detailed-leg transit">
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-title">
                        <span class="route-info">
                            ${this.getModeIcon(leg.mode)}
                            ${leg.route_short_name || leg.route_name}
                        </span>
                        <span class="duration">${this.formatDuration(leg.duration)}</span>
                    </div>
                    
                    <div class="step-description">
                        <div class="departure-info">
                            <strong>${this.formatTime(leg.departure_time)}</strong>
                            ${leg.from_stop_name}
                            ${leg.platform ? `(${leg.platform}番線)` : ''}
                        </div>
                        
                        <div class="route-direction">
                            ${leg.trip_headsign || ''} 方面
                            ${leg.stops_count ? `(${leg.stops_count}駅)` : ''}
                        </div>
                        
                        <div class="arrival-info">
                            <strong>${this.formatTime(leg.arrival_time)}</strong>
                            ${leg.to_stop_name}
                            ${leg.delay ? `<span class="delay-info">遅延 +${leg.delay}分</span>` : ''}
                        </div>
                    </div>
                    
                    ${leg.alerts?.length ? `
                        <div class="step-alerts">
                            ${leg.alerts.map(alert => `
                                <div class="alert ${alert.severity}">
                                    <strong>${alert.title}</strong>
                                    <p>${alert.description}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // 閉じるボタン
        this.querySelector('.close-btn')?.addEventListener('click', () => {
            this.hide();
        });
        
        // 検索ボタン
        this.querySelector('.search-btn')?.addEventListener('click', () => {
            this.performSearch();
        });
        
        // 位置入れ替えボタン
        this.querySelector('.swap-locations-btn')?.addEventListener('click', () => {
            this.swapLocations();
        });
        
        // 現在地ボタン
        this.querySelector('.origin-location-btn')?.addEventListener('click', () => {
            this.useCurrentLocation('origin');
        });
        
        // ルート選択
        this.addEventListener('click', (e) => {
            const routeItem = e.target.closest('.route-item');
            if (routeItem) {
                const routeIndex = parseInt(routeItem.dataset.routeIndex);
                this.selectRoute(routeIndex);
            }
        });
        
        // 戻るボタン
        this.addEventListener('click', (e) => {
            if (e.target.closest('.back-btn')) {
                this.showRoutesList();
            }
        });
        
        // 時刻タイプ変更
        this.addEventListener('change', (e) => {
            if (e.target.name === 'time-type') {
                this.updateTimeInputs(e.target.value);
            }
        });
        
        // 入力フィールドのオートコンプリート
        this.setupAutocomplete();
    }
    
    /**
     * 公共交通サービスイベントリスナー設定
     */
    setupTransitServiceListeners() {
        EventBus.on('transit:routes-found', (data) => {
            this.state.routes = data.routes;
            this.state.isSearching = false;
            this.render();
        });
        
        EventBus.on('transit:search-error', (data) => {
            this.state.isSearching = false;
            this.showError(data.error);
            this.render();
        });
        
        EventBus.on('transit:realtime-updated', () => {
            if (this.state.routes.length > 0) {
                this.updateRealtimeInfo();
            }
        });
    }
    
    /**
     * オートコンプリート設定
     */
    setupAutocomplete() {
        const originInput = this.querySelector('.origin-input');
        const destinationInput = this.querySelector('.destination-input');
        
        [originInput, destinationInput].forEach(input => {
            if (!input) return;
            
            let timeout;
            input.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.showLocationSuggestions(e.target, e.target.value);
                }, 300);
            });
            
            input.addEventListener('blur', () => {
                setTimeout(() => this.hideSuggestions(input), 200);
            });
        });
    }
    
    /**
     * 公開メソッド
     */
    
    show() {
        this.state.isVisible = true;
        this.render();
        EventBus.emit('transit-panel:shown');
    }
    
    hide() {
        this.state.isVisible = false;
        this.render();
        EventBus.emit('transit-panel:hidden');
    }
    
    toggle() {
        if (this.state.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    setOrigin(location) {
        this.state.searchParams.origin = location;
        const input = this.querySelector('.origin-input');
        if (input) {
            input.value = location.name || `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
        }
    }
    
    setDestination(location) {
        this.state.searchParams.destination = location;
        const input = this.querySelector('.destination-input');
        if (input) {
            input.value = location.name || `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
        }
    }
    
    /**
     * プライベートメソッド
     */
    
    async performSearch() {
        try {
            this.state.isSearching = true;
            this.render();
            
            // 検索パラメータを収集
            const params = this.collectSearchParams();
            
            if (!params.origin || !params.destination) {
                throw new Error('出発地と目的地を入力してください');
            }
            
            // 公共交通ルート検索
            const routes = await this.transitService.searchRoutes(
                params.origin,
                params.destination,
                params.options
            );
            
            this.state.routes = routes;
            this.state.isSearching = false;
            this.render();
            
        } catch (error) {
            this.state.isSearching = false;
            this.showError(error.message);
            this.render();
        }
    }
    
    collectSearchParams() {
        const originInput = this.querySelector('.origin-input');
        const destinationInput = this.querySelector('.destination-input');
        const timeType = this.querySelector('input[name="time-type"]:checked')?.value;
        const dateInput = this.querySelector('.date-input');
        const timeInput = this.querySelector('.time-input');
        const optimizeSelect = this.querySelector('.optimize-select');
        const wheelchairCheckbox = this.querySelector('.wheelchair-checkbox');
        
        // 時刻設定
        let departureTime, arrivalTime;
        if (timeType === 'now') {
            departureTime = new Date();
        } else if (timeType === 'departure' || timeType === 'arrival') {
            const date = dateInput?.value || new Date().toISOString().split('T')[0];
            const time = timeInput?.value || '09:00';
            const datetime = new Date(`${date}T${time}`);
            
            if (timeType === 'departure') {
                departureTime = datetime;
            } else {
                arrivalTime = datetime;
            }
        }
        
        return {
            origin: this.state.searchParams.origin,
            destination: this.state.searchParams.destination,
            options: {
                departureTime,
                arrivalTime,
                optimize: optimizeSelect?.value || 'time',
                wheelchair: wheelchairCheckbox?.checked || false,
                maxTransfers: 3
            }
        };
    }
    
    selectRoute(routeIndex) {
        this.state.selectedRoute = this.state.routes[routeIndex];
        this.render();
        
        // 地図上にルートを表示
        EventBus.emit('map:show-transit-route', {
            route: this.state.selectedRoute
        });
    }
    
    showRoutesList() {
        this.state.selectedRoute = null;
        this.render();
    }
    
    swapLocations() {
        const temp = this.state.searchParams.origin;
        this.state.searchParams.origin = this.state.searchParams.destination;
        this.state.searchParams.destination = temp;
        
        const originInput = this.querySelector('.origin-input');
        const destinationInput = this.querySelector('.destination-input');
        
        if (originInput && destinationInput) {
            const tempValue = originInput.value;
            originInput.value = destinationInput.value;
            destinationInput.value = tempValue;
        }
    }
    
    useCurrentLocation(type) {
        EventBus.emit('geolocation:get-current-position', {
            callback: (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    name: '現在地'
                };
                
                if (type === 'origin') {
                    this.setOrigin(location);
                } else {
                    this.setDestination(location);
                }
            }
        });
    }
    
    setCurrentDateTime() {
        const now = new Date();
        const dateInput = this.querySelector('.date-input');
        const timeInput = this.querySelector('.time-input');
        
        if (dateInput) {
            dateInput.value = now.toISOString().split('T')[0];
        }
        
        if (timeInput) {
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            timeInput.value = `${hours}:${minutes}`;
        }
    }
    
    updateTimeInputs(timeType) {
        const datetimeInput = this.querySelector('.datetime-input');
        if (datetimeInput) {
            datetimeInput.style.display = timeType === 'now' ? 'none' : 'flex';
        }
    }
    
    showError(message) {
        // トースト通知でエラーを表示
        EventBus.emit('toast:show', {
            type: 'error',
            message: message,
            duration: 5000
        });
    }
    
    /**
     * フォーマット関数
     */
    
    formatTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}時間${minutes}分`;
        }
        return `${minutes}分`;
    }
    
    getModeIcon(mode) {
        const icons = {
            bus: '🚌',
            train: '🚆',
            subway: '🚇',
            tram: '🚊',
            ferry: '⛴️',
            walking: '🚶'
        };
        return icons[mode] || '🚌';
    }
}

// カスタム要素として登録
customElements.define('transit-panel', TransitPanel);