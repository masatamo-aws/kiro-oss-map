/**
 * PublicTransitService - 公共交通機能サービス
 * GTFS データ統合・公共交通ルート検索・乗り換え案内・リアルタイム運行情報・運賃計算
 * 
 * @version 2.1.0
 * @author Kiro AI Assistant
 * @created 2025-08-19
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { StorageService } from './StorageService.js';

export class PublicTransitService {
    constructor() {
        this.logger = Logger;
        this.storageService = new StorageService();
        
        // GTFS データキャッシュ
        this.gtfsData = {
            agencies: new Map(),
            routes: new Map(),
            stops: new Map(),
            trips: new Map(),
            stopTimes: new Map(),
            calendar: new Map(),
            calendarDates: new Map(),
            fareAttributes: new Map(),
            fareRules: new Map()
        };
        
        // リアルタイムデータキャッシュ
        this.realtimeData = {
            tripUpdates: new Map(),
            vehiclePositions: new Map(),
            alerts: new Map()
        };
        
        // 設定
        this.config = {
            gtfsEndpoint: '/api/gtfs',
            realtimeEndpoint: '/api/gtfs-realtime',
            maxWalkingDistance: 800, // メートル
            maxTransferTime: 10, // 分
            walkingSpeed: 1.4, // m/s
            cacheExpiry: 5 * 60 * 1000, // 5分
            maxRoutes: 5,
            supportedModes: ['bus', 'train', 'subway', 'tram', 'ferry']
        };
        
        this.init();
    }
    
    /**
     * サービス初期化
     */
    async init() {
        try {
            this.logger.info('PublicTransitService initializing...');
            
            // GTFS データの読み込み
            await this.loadGTFSData();
            
            // リアルタイムデータの開始
            this.startRealtimeUpdates();
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            this.logger.info('PublicTransitService initialized successfully');
            EventBus.emit('transit:ready');
            
        } catch (error) {
            this.logger.error('Failed to initialize PublicTransitService:', error);
            throw error;
        }
    }
    
    /**
     * GTFS データ読み込み
     */
    async loadGTFSData() {
        try {
            this.logger.info('Loading GTFS data...');
            
            // キャッシュされたデータをチェック
            const cachedData = await this.storageService.get('gtfs_data');
            const cacheTimestamp = await this.storageService.get('gtfs_cache_timestamp');
            
            if (cachedData && cacheTimestamp && 
                (Date.now() - cacheTimestamp) < 24 * 60 * 60 * 1000) { // 24時間
                this.logger.info('Using cached GTFS data');
                this.parseGTFSData(cachedData);
                return;
            }
            
            // サーバーからGTFSデータを取得
            const response = await fetch(`${this.config.gtfsEndpoint}/static`);
            if (!response.ok) {
                throw new Error(`Failed to fetch GTFS data: ${response.status}`);
            }
            
            const gtfsData = await response.json();
            
            // データを解析・保存
            this.parseGTFSData(gtfsData);
            await this.storageService.set('gtfs_data', gtfsData);
            await this.storageService.set('gtfs_cache_timestamp', Date.now());
            
            this.logger.info('GTFS data loaded successfully');
            
        } catch (error) {
            this.logger.error('Failed to load GTFS data:', error);
            // フォールバック: 基本的な公共交通データを使用
            this.loadFallbackData();
        }
    }
    
    /**
     * GTFS データ解析
     */
    parseGTFSData(data) {
        try {
            // agencies.txt
            if (data.agencies) {
                data.agencies.forEach(agency => {
                    this.gtfsData.agencies.set(agency.agency_id, agency);
                });
            }
            
            // routes.txt
            if (data.routes) {
                data.routes.forEach(route => {
                    this.gtfsData.routes.set(route.route_id, {
                        ...route,
                        route_type_name: this.getRouteTypeName(route.route_type)
                    });
                });
            }
            
            // stops.txt
            if (data.stops) {
                data.stops.forEach(stop => {
                    this.gtfsData.stops.set(stop.stop_id, {
                        ...stop,
                        lat: parseFloat(stop.stop_lat),
                        lon: parseFloat(stop.stop_lon)
                    });
                });
            }
            
            // trips.txt
            if (data.trips) {
                data.trips.forEach(trip => {
                    this.gtfsData.trips.set(trip.trip_id, trip);
                });
            }
            
            // stop_times.txt
            if (data.stopTimes) {
                data.stopTimes.forEach(stopTime => {
                    const key = `${stopTime.trip_id}_${stopTime.stop_sequence}`;
                    this.gtfsData.stopTimes.set(key, {
                        ...stopTime,
                        arrival_time_seconds: this.timeToSeconds(stopTime.arrival_time),
                        departure_time_seconds: this.timeToSeconds(stopTime.departure_time)
                    });
                });
            }
            
            // calendar.txt
            if (data.calendar) {
                data.calendar.forEach(service => {
                    this.gtfsData.calendar.set(service.service_id, service);
                });
            }
            
            // fare_attributes.txt
            if (data.fareAttributes) {
                data.fareAttributes.forEach(fare => {
                    this.gtfsData.fareAttributes.set(fare.fare_id, fare);
                });
            }
            
            this.logger.info('GTFS data parsed successfully', {
                agencies: this.gtfsData.agencies.size,
                routes: this.gtfsData.routes.size,
                stops: this.gtfsData.stops.size,
                trips: this.gtfsData.trips.size
            });
            
        } catch (error) {
            this.logger.error('Failed to parse GTFS data:', error);
            throw error;
        }
    }
    
    /**
     * 公共交通ルート検索
     */
    async searchRoutes(origin, destination, options = {}) {
        try {
            this.logger.info('Searching transit routes', { origin, destination, options });
            
            const searchOptions = {
                departureTime: options.departureTime || new Date(),
                arrivalTime: options.arrivalTime,
                maxWalkingDistance: options.maxWalkingDistance || this.config.maxWalkingDistance,
                maxTransfers: options.maxTransfers || 3,
                modes: options.modes || this.config.supportedModes,
                optimize: options.optimize || 'time', // 'time', 'transfers', 'cost'
                wheelchair: options.wheelchair || false,
                ...options
            };
            
            // 出発地・目的地の最寄り停留所を検索
            const originStops = await this.findNearbyStops(origin, searchOptions.maxWalkingDistance);
            const destinationStops = await this.findNearbyStops(destination, searchOptions.maxWalkingDistance);
            
            if (originStops.length === 0 || destinationStops.length === 0) {
                throw new Error('No nearby transit stops found');
            }
            
            // ルート計算
            const routes = await this.calculateRoutes(
                originStops, 
                destinationStops, 
                searchOptions
            );
            
            // ルートを最適化・ソート
            const optimizedRoutes = this.optimizeRoutes(routes, searchOptions.optimize);
            
            // リアルタイム情報を適用
            const routesWithRealtime = await this.applyRealtimeData(optimizedRoutes);
            
            // 運賃計算
            const routesWithFares = await this.calculateFares(routesWithRealtime);
            
            this.logger.info(`Found ${routesWithFares.length} transit routes`);
            EventBus.emit('transit:routes-found', { routes: routesWithFares });
            
            return routesWithFares;
            
        } catch (error) {
            this.logger.error('Failed to search transit routes:', error);
            EventBus.emit('transit:search-error', { error: error.message });
            throw error;
        }
    }
    
    /**
     * 最寄り停留所検索
     */
    async findNearbyStops(location, maxDistance) {
        const nearbyStops = [];
        
        for (const [stopId, stop] of this.gtfsData.stops) {
            const distance = this.calculateDistance(
                location.lat, location.lon,
                stop.lat, stop.lon
            );
            
            if (distance <= maxDistance) {
                nearbyStops.push({
                    ...stop,
                    distance,
                    walkingTime: Math.ceil(distance / this.config.walkingSpeed / 60) // 分
                });
            }
        }
        
        // 距離順でソート
        return nearbyStops.sort((a, b) => a.distance - b.distance);
    }
    
    /**
     * ルート計算（A*アルゴリズム使用）
     */
    async calculateRoutes(originStops, destinationStops, options) {
        const routes = [];
        const maxRoutes = Math.min(options.maxRoutes || this.config.maxRoutes, 10);
        
        // 各出発停留所から各到着停留所への経路を計算
        for (const originStop of originStops.slice(0, 3)) { // 最大3つの出発停留所
            for (const destStop of destinationStops.slice(0, 3)) { // 最大3つの到着停留所
                try {
                    const pathRoutes = await this.findPath(originStop, destStop, options);
                    routes.push(...pathRoutes);
                    
                    if (routes.length >= maxRoutes) break;
                } catch (error) {
                    this.logger.warn(`Failed to find path from ${originStop.stop_id} to ${destStop.stop_id}:`, error);
                }
            }
            if (routes.length >= maxRoutes) break;
        }
        
        return routes;
    }
    
    /**
     * A*アルゴリズムによる経路探索
     */
    async findPath(originStop, destStop, options) {
        const openSet = new Set([originStop.stop_id]);
        const closedSet = new Set();
        const gScore = new Map([[originStop.stop_id, 0]]);
        const fScore = new Map([[originStop.stop_id, this.heuristic(originStop, destStop)]]);
        const cameFrom = new Map();
        
        while (openSet.size > 0) {
            // f値が最小のノードを選択
            let current = null;
            let minFScore = Infinity;
            
            for (const stopId of openSet) {
                const score = fScore.get(stopId) || Infinity;
                if (score < minFScore) {
                    minFScore = score;
                    current = stopId;
                }
            }
            
            if (current === destStop.stop_id) {
                // 目的地に到達
                return this.reconstructPath(cameFrom, current, originStop, destStop, options);
            }
            
            openSet.delete(current);
            closedSet.add(current);
            
            // 隣接する停留所を探索
            const neighbors = await this.getNeighborStops(current, options);
            
            for (const neighbor of neighbors) {
                if (closedSet.has(neighbor.stop_id)) continue;
                
                const tentativeGScore = (gScore.get(current) || 0) + neighbor.cost;
                
                if (!openSet.has(neighbor.stop_id)) {
                    openSet.add(neighbor.stop_id);
                } else if (tentativeGScore >= (gScore.get(neighbor.stop_id) || Infinity)) {
                    continue;
                }
                
                cameFrom.set(neighbor.stop_id, { from: current, connection: neighbor });
                gScore.set(neighbor.stop_id, tentativeGScore);
                fScore.set(neighbor.stop_id, tentativeGScore + this.heuristic(
                    this.gtfsData.stops.get(neighbor.stop_id), destStop
                ));
            }
        }
        
        return []; // 経路が見つからない
    }
    
    /**
     * 隣接停留所取得（乗り換え可能な停留所）
     */
    async getNeighborStops(stopId, options) {
        const neighbors = [];
        const currentStop = this.gtfsData.stops.get(stopId);
        
        // 同じ停留所での路線間乗り換え
        for (const [routeId, route] of this.gtfsData.routes) {
            if (!options.modes.includes(this.getRouteMode(route.route_type))) continue;
            
            // この路線でこの停留所を通る便を検索
            const trips = this.getTripsForRouteAndStop(routeId, stopId, options.departureTime);
            
            for (const trip of trips) {
                const nextStops = this.getNextStopsInTrip(trip.trip_id, stopId);
                
                for (const nextStop of nextStops) {
                    neighbors.push({
                        stop_id: nextStop.stop_id,
                        cost: nextStop.travel_time,
                        connection_type: 'transit',
                        route_id: routeId,
                        trip_id: trip.trip_id,
                        departure_time: nextStop.departure_time,
                        arrival_time: nextStop.arrival_time
                    });
                }
            }
        }
        
        // 徒歩での乗り換え（近くの停留所）
        const walkingNeighbors = await this.findNearbyStops(
            { lat: currentStop.lat, lon: currentStop.lon },
            options.maxWalkingDistance
        );
        
        for (const walkingStop of walkingNeighbors) {
            if (walkingStop.stop_id === stopId) continue;
            
            neighbors.push({
                stop_id: walkingStop.stop_id,
                cost: walkingStop.walkingTime * 60, // 秒に変換
                connection_type: 'walking',
                distance: walkingStop.distance,
                walking_time: walkingStop.walkingTime
            });
        }
        
        return neighbors;
    }
    
    /**
     * 運賃計算
     */
    async calculateFares(routes) {
        return routes.map(route => {
            let totalFare = 0;
            const fareBreakdown = [];
            
            for (const leg of route.legs) {
                if (leg.type === 'transit') {
                    const routeInfo = this.gtfsData.routes.get(leg.route_id);
                    const fare = this.calculateLegFare(leg, routeInfo);
                    
                    totalFare += fare.amount;
                    fareBreakdown.push({
                        leg_id: leg.id,
                        route_name: routeInfo?.route_short_name || leg.route_id,
                        fare: fare.amount,
                        currency: fare.currency,
                        fare_type: fare.type
                    });
                }
            }
            
            return {
                ...route,
                fare: {
                    total: totalFare,
                    currency: 'JPY', // 日本円をデフォルト
                    breakdown: fareBreakdown
                }
            };
        });
    }
    
    /**
     * 区間運賃計算
     */
    calculateLegFare(leg, routeInfo) {
        // 基本運賃（距離ベース）
        const basefare = 150; // 基本運賃（円）
        const distanceFare = Math.ceil(leg.distance / 1000) * 20; // 1kmあたり20円
        
        // 路線タイプによる調整
        let typeFare = 0;
        switch (routeInfo?.route_type) {
            case 0: // 路面電車
                typeFare = 50;
                break;
            case 1: // 地下鉄
                typeFare = 100;
                break;
            case 2: // 鉄道
                typeFare = 80;
                break;
            case 3: // バス
                typeFare = 30;
                break;
            default:
                typeFare = 50;
        }
        
        return {
            amount: basefare + distanceFare + typeFare,
            currency: 'JPY',
            type: 'regular'
        };
    }
    
    /**
     * リアルタイムデータ適用
     */
    async applyRealtimeData(routes) {
        return routes.map(route => {
            const updatedLegs = route.legs.map(leg => {
                if (leg.type === 'transit' && leg.trip_id) {
                    const tripUpdate = this.realtimeData.tripUpdates.get(leg.trip_id);
                    if (tripUpdate) {
                        return {
                            ...leg,
                            delay: tripUpdate.delay || 0,
                            realtime_departure: new Date(leg.departure_time.getTime() + (tripUpdate.delay * 1000)),
                            realtime_arrival: new Date(leg.arrival_time.getTime() + (tripUpdate.delay * 1000)),
                            status: tripUpdate.status || 'scheduled'
                        };
                    }
                }
                return leg;
            });
            
            return {
                ...route,
                legs: updatedLegs,
                has_realtime: updatedLegs.some(leg => leg.delay !== undefined)
            };
        });
    }
    
    /**
     * リアルタイムデータ更新開始
     */
    startRealtimeUpdates() {
        // 30秒ごとにリアルタイムデータを更新
        setInterval(async () => {
            try {
                await this.updateRealtimeData();
            } catch (error) {
                this.logger.warn('Failed to update realtime data:', error);
            }
        }, 30000);
    }
    
    /**
     * リアルタイムデータ更新
     */
    async updateRealtimeData() {
        try {
            const response = await fetch(`${this.config.realtimeEndpoint}/updates`);
            if (!response.ok) return;
            
            const realtimeData = await response.json();
            
            // Trip Updates
            if (realtimeData.tripUpdates) {
                realtimeData.tripUpdates.forEach(update => {
                    this.realtimeData.tripUpdates.set(update.trip_id, {
                        delay: update.delay,
                        status: update.status,
                        timestamp: Date.now()
                    });
                });
            }
            
            // Vehicle Positions
            if (realtimeData.vehiclePositions) {
                realtimeData.vehiclePositions.forEach(position => {
                    this.realtimeData.vehiclePositions.set(position.vehicle_id, {
                        lat: position.latitude,
                        lon: position.longitude,
                        bearing: position.bearing,
                        speed: position.speed,
                        timestamp: Date.now()
                    });
                });
            }
            
            // Service Alerts
            if (realtimeData.alerts) {
                realtimeData.alerts.forEach(alert => {
                    this.realtimeData.alerts.set(alert.id, {
                        title: alert.title,
                        description: alert.description,
                        severity: alert.severity,
                        routes: alert.affected_routes,
                        timestamp: Date.now()
                    });
                });
            }
            
            EventBus.emit('transit:realtime-updated');
            
        } catch (error) {
            this.logger.warn('Failed to update realtime data:', error);
        }
    }
    
    /**
     * ユーティリティメソッド
     */
    
    // 距離計算（Haversine公式）
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // 地球の半径（メートル）
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }
    
    // 時刻を秒に変換
    timeToSeconds(timeStr) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60 + (seconds || 0);
    }
    
    // 路線タイプ名取得
    getRouteTypeName(routeType) {
        const types = {
            0: 'Tram',
            1: 'Subway',
            2: 'Rail',
            3: 'Bus',
            4: 'Ferry',
            5: 'Cable Tram',
            6: 'Aerial Lift',
            7: 'Funicular',
            11: 'Trolleybus',
            12: 'Monorail'
        };
        return types[routeType] || 'Unknown';
    }
    
    // 路線モード取得
    getRouteMode(routeType) {
        const modes = {
            0: 'tram',
            1: 'subway',
            2: 'train',
            3: 'bus',
            4: 'ferry'
        };
        return modes[routeType] || 'bus';
    }
    
    // ヒューリスティック関数（A*用）
    heuristic(stop1, stop2) {
        return this.calculateDistance(stop1.lat, stop1.lon, stop2.lat, stop2.lon) / this.config.walkingSpeed;
    }
    
    // ルート最適化
    optimizeRoutes(routes, optimize) {
        return routes.sort((a, b) => {
            switch (optimize) {
                case 'time':
                    return a.duration - b.duration;
                case 'transfers':
                    return a.transfers - b.transfers;
                case 'cost':
                    return (a.fare?.total || 0) - (b.fare?.total || 0);
                default:
                    return a.duration - b.duration;
            }
        });
    }
    
    // フォールバックデータ読み込み
    loadFallbackData() {
        this.logger.info('Loading fallback transit data');
        
        // 基本的な公共交通データ（東京エリア）
        const fallbackData = {
            agencies: [
                { agency_id: 'JR', agency_name: 'JR東日本', agency_url: 'https://www.jreast.co.jp' },
                { agency_id: 'METRO', agency_name: '東京メトロ', agency_url: 'https://www.tokyometro.jp' }
            ],
            routes: [
                { route_id: 'JR_YAMANOTE', route_short_name: '山手線', route_type: 2, agency_id: 'JR' },
                { route_id: 'METRO_GINZA', route_short_name: '銀座線', route_type: 1, agency_id: 'METRO' }
            ],
            stops: [
                { stop_id: 'JR_SHINJUKU', stop_name: '新宿', stop_lat: 35.6896, stop_lon: 139.7006 },
                { stop_id: 'JR_SHIBUYA', stop_name: '渋谷', stop_lat: 35.6580, stop_lon: 139.7016 }
            ]
        };
        
        this.parseGTFSData(fallbackData);
    }
    
    // イベントリスナー設定
    setupEventListeners() {
        EventBus.on('map:location-changed', (data) => {
            // 地図位置変更時の処理
        });
        
        EventBus.on('route:search-requested', async (data) => {
            if (data.mode === 'transit') {
                try {
                    const routes = await this.searchRoutes(data.origin, data.destination, data.options);
                    EventBus.emit('route:results', { routes, mode: 'transit' });
                } catch (error) {
                    EventBus.emit('route:error', { error: error.message, mode: 'transit' });
                }
            }
        });
    }
    
    /**
     * サービス終了処理
     */
    destroy() {
        this.logger.info('PublicTransitService destroying...');
        // クリーンアップ処理
        this.gtfsData = null;
        this.realtimeData = null;
    }
}

// シングルトンインスタンス
let instance = null;

export const getPublicTransitService = () => {
    if (!instance) {
        instance = new PublicTransitService();
    }
    return instance;
};