/**
 * Transit Routes - 公共交通API
 * GTFS データ・公共交通ルート検索・リアルタイム情報API
 * 
 * @version 2.1.0
 * @author Kiro AI Assistant
 * @created 2025-08-19
 */

import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { Logger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateApiKey } from '../middleware/apiKey.js';

const router = Router();
const logger = new Logger('TransitRoutes');

// GTFS データストレージ（実際の実装では外部データベースを使用）
interface GTFSData {
    agencies: Map<string, any>;
    routes: Map<string, any>;
    stops: Map<string, any>;
    trips: Map<string, any>;
    stopTimes: Map<string, any>;
    calendar: Map<string, any>;
    fareAttributes: Map<string, any>;
}

// モックGTFSデータ（実際の実装では外部データソースから取得）
const gtfsData: GTFSData = {
    agencies: new Map([
        ['JR_EAST', {
            agency_id: 'JR_EAST',
            agency_name: 'JR東日本',
            agency_url: 'https://www.jreast.co.jp',
            agency_timezone: 'Asia/Tokyo',
            agency_lang: 'ja'
        }],
        ['TOKYO_METRO', {
            agency_id: 'TOKYO_METRO',
            agency_name: '東京メトロ',
            agency_url: 'https://www.tokyometro.jp',
            agency_timezone: 'Asia/Tokyo',
            agency_lang: 'ja'
        }]
    ]),
    routes: new Map([
        ['JR_YAMANOTE', {
            route_id: 'JR_YAMANOTE',
            agency_id: 'JR_EAST',
            route_short_name: '山手線',
            route_long_name: 'JR山手線',
            route_type: 2, // Rail
            route_color: '9ACD32',
            route_text_color: 'FFFFFF'
        }],
        ['METRO_GINZA', {
            route_id: 'METRO_GINZA',
            agency_id: 'TOKYO_METRO',
            route_short_name: '銀座線',
            route_long_name: '東京メトロ銀座線',
            route_type: 1, // Subway
            route_color: 'FF9500',
            route_text_color: 'FFFFFF'
        }]
    ]),
    stops: new Map([
        ['JR_SHINJUKU', {
            stop_id: 'JR_SHINJUKU',
            stop_name: '新宿',
            stop_lat: 35.6896,
            stop_lon: 139.7006,
            location_type: 1,
            wheelchair_boarding: 1
        }],
        ['JR_SHIBUYA', {
            stop_id: 'JR_SHIBUYA',
            stop_name: '渋谷',
            stop_lat: 35.6580,
            stop_lon: 139.7016,
            location_type: 1,
            wheelchair_boarding: 1
        }],
        ['METRO_GINZA', {
            stop_id: 'METRO_GINZA',
            stop_name: '銀座',
            stop_lat: 35.6717,
            stop_lon: 139.7640,
            location_type: 1,
            wheelchair_boarding: 1
        }]
    ]),
    trips: new Map(),
    stopTimes: new Map(),
    calendar: new Map(),
    fareAttributes: new Map([
        ['JR_BASIC', {
            fare_id: 'JR_BASIC',
            price: 150,
            currency_type: 'JPY',
            payment_method: 0,
            transfers: 0
        }],
        ['METRO_BASIC', {
            fare_id: 'METRO_BASIC',
            price: 170,
            currency_type: 'JPY',
            payment_method: 0,
            transfers: 0
        }]
    ])
};

/**
 * GTFS Static データ取得
 * GET /api/transit/gtfs/static
 */
router.get('/gtfs/static', 
    validateApiKey,
    async (req: Request, res: Response) => {
        try {
            logger.info('Fetching GTFS static data');
            
            const staticData = {
                agencies: Array.from(gtfsData.agencies.values()),
                routes: Array.from(gtfsData.routes.values()),
                stops: Array.from(gtfsData.stops.values()),
                trips: Array.from(gtfsData.trips.values()),
                stopTimes: Array.from(gtfsData.stopTimes.values()),
                calendar: Array.from(gtfsData.calendar.values()),
                fareAttributes: Array.from(gtfsData.fareAttributes.values())
            };
            
            res.json({
                success: true,
                data: staticData,
                timestamp: new Date().toISOString(),
                version: '2.1.0'
            });
            
        } catch (error) {
            logger.error('Failed to fetch GTFS static data:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to fetch GTFS data'
            });
        }
    }
);

/**
 * 公共交通ルート検索
 * POST /api/transit/routes
 */
router.post('/routes',
    validateApiKey,
    [
        body('origin').notEmpty().withMessage('Origin is required'),
        body('origin.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid origin latitude required'),
        body('origin.lon').isFloat({ min: -180, max: 180 }).withMessage('Valid origin longitude required'),
        body('destination').notEmpty().withMessage('Destination is required'),
        body('destination.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid destination latitude required'),
        body('destination.lon').isFloat({ min: -180, max: 180 }).withMessage('Valid destination longitude required'),
        body('departureTime').optional().isISO8601().withMessage('Valid departure time required'),
        body('arrivalTime').optional().isISO8601().withMessage('Valid arrival time required'),
        body('optimize').optional().isIn(['time', 'transfers', 'cost']).withMessage('Invalid optimize option'),
        body('maxTransfers').optional().isInt({ min: 0, max: 5 }).withMessage('Max transfers must be 0-5'),
        body('wheelchair').optional().isBoolean().withMessage('Wheelchair must be boolean'),
        body('modes').optional().isArray().withMessage('Modes must be array')
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: errors.array()
                });
            }
            
            const {
                origin,
                destination,
                departureTime,
                arrivalTime,
                optimize = 'time',
                maxTransfers = 3,
                wheelchair = false,
                modes = ['bus', 'train', 'subway']
            } = req.body;
            
            logger.info('Searching transit routes', {
                origin,
                destination,
                optimize,
                maxTransfers
            });
            
            // 最寄り停留所検索
            const originStops = findNearbyStops(origin, 800); // 800m以内
            const destinationStops = findNearbyStops(destination, 800);
            
            if (originStops.length === 0 || destinationStops.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No nearby transit stops found',
                    message: 'No transit stops within walking distance'
                });
            }
            
            // ルート計算（簡略化されたアルゴリズム）
            const routes = calculateTransitRoutes(
                originStops,
                destinationStops,
                {
                    departureTime: departureTime ? new Date(departureTime) : new Date(),
                    arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
                    optimize,
                    maxTransfers,
                    wheelchair,
                    modes
                }
            );
            
            // 運賃計算
            const routesWithFares = routes.map(route => ({
                ...route,
                fare: calculateRouteFare(route)
            }));
            
            res.json({
                success: true,
                data: {
                    routes: routesWithFares,
                    search_params: {
                        origin,
                        destination,
                        departureTime,
                        optimize,
                        maxTransfers
                    }
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error('Failed to search transit routes:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to search transit routes'
            });
        }
    }
);

/**
 * 停留所検索
 * GET /api/transit/stops/search
 */
router.get('/stops/search',
    validateApiKey,
    [
        query('q').notEmpty().withMessage('Search query is required'),
        query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
        query('lon').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
        query('radius').optional().isInt({ min: 100, max: 5000 }).withMessage('Radius must be 100-5000m'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: errors.array()
                });
            }
            
            const {
                q: query,
                lat,
                lon,
                radius = 1000,
                limit = 20
            } = req.query;
            
            logger.info('Searching transit stops', { query, lat, lon, radius });
            
            let stops = Array.from(gtfsData.stops.values());
            
            // テキスト検索
            if (query) {
                stops = stops.filter(stop => 
                    stop.stop_name.toLowerCase().includes((query as string).toLowerCase())
                );
            }
            
            // 位置ベース検索
            if (lat && lon) {
                const centerLat = parseFloat(lat as string);
                const centerLon = parseFloat(lon as string);
                const radiusM = parseInt(radius as string);
                
                stops = stops.filter(stop => {
                    const distance = calculateDistance(
                        centerLat, centerLon,
                        stop.stop_lat, stop.stop_lon
                    );
                    return distance <= radiusM;
                }).map(stop => ({
                    ...stop,
                    distance: calculateDistance(
                        centerLat, centerLon,
                        stop.stop_lat, stop.stop_lon
                    )
                })).sort((a, b) => a.distance - b.distance);
            }
            
            // 結果制限
            stops = stops.slice(0, parseInt(limit as string));
            
            res.json({
                success: true,
                data: {
                    stops,
                    total: stops.length
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error('Failed to search transit stops:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to search stops'
            });
        }
    }
);

/**
 * リアルタイム運行情報取得
 * GET /api/transit/gtfs-realtime/updates
 */
router.get('/gtfs-realtime/updates',
    validateApiKey,
    async (req: Request, res: Response) => {
        try {
            logger.info('Fetching GTFS realtime updates');
            
            // モックリアルタイムデータ
            const realtimeData = {
                tripUpdates: [
                    {
                        trip_id: 'JR_YAMANOTE_001',
                        delay: 120, // 2分遅延
                        status: 'delayed',
                        timestamp: Date.now()
                    },
                    {
                        trip_id: 'METRO_GINZA_001',
                        delay: 0,
                        status: 'on_time',
                        timestamp: Date.now()
                    }
                ],
                vehiclePositions: [
                    {
                        vehicle_id: 'JR_001',
                        trip_id: 'JR_YAMANOTE_001',
                        latitude: 35.6896,
                        longitude: 139.7006,
                        bearing: 45,
                        speed: 25,
                        timestamp: Date.now()
                    }
                ],
                alerts: [
                    {
                        id: 'ALERT_001',
                        title: '山手線運行情報',
                        description: '信号機点検のため、一部列車に遅れが生じています',
                        severity: 'warning',
                        affected_routes: ['JR_YAMANOTE'],
                        timestamp: Date.now()
                    }
                ]
            };
            
            res.json({
                success: true,
                data: realtimeData,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error('Failed to fetch realtime updates:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to fetch realtime updates'
            });
        }
    }
);

/**
 * 運賃情報取得
 * GET /api/transit/fares
 */
router.get('/fares',
    validateApiKey,
    [
        query('from_stop').notEmpty().withMessage('From stop is required'),
        query('to_stop').notEmpty().withMessage('To stop is required'),
        query('route_id').optional().isString().withMessage('Route ID must be string')
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: errors.array()
                });
            }
            
            const { from_stop, to_stop, route_id } = req.query;
            
            logger.info('Calculating fare', { from_stop, to_stop, route_id });
            
            // 簡略化された運賃計算
            const fromStop = gtfsData.stops.get(from_stop as string);
            const toStop = gtfsData.stops.get(to_stop as string);
            
            if (!fromStop || !toStop) {
                return res.status(404).json({
                    success: false,
                    error: 'Stop not found',
                    message: 'One or both stops not found'
                });
            }
            
            // 距離ベース運賃計算
            const distance = calculateDistance(
                fromStop.stop_lat, fromStop.stop_lon,
                toStop.stop_lat, toStop.stop_lon
            );
            
            const baseFare = 150; // 基本運賃
            const distanceFare = Math.ceil(distance / 1000) * 20; // 1kmあたり20円
            const totalFare = baseFare + distanceFare;
            
            res.json({
                success: true,
                data: {
                    fare: {
                        amount: totalFare,
                        currency: 'JPY',
                        type: 'regular'
                    },
                    from_stop: fromStop,
                    to_stop: toStop,
                    distance: Math.round(distance),
                    calculation: {
                        base_fare: baseFare,
                        distance_fare: distanceFare,
                        total: totalFare
                    }
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error('Failed to calculate fare:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to calculate fare'
            });
        }
    }
);

/**
 * ヘルパー関数
 */

// 最寄り停留所検索
function findNearbyStops(location: { lat: number; lon: number }, maxDistance: number) {
    const nearbyStops = [];
    
    for (const stop of gtfsData.stops.values()) {
        const distance = calculateDistance(
            location.lat, location.lon,
            stop.stop_lat, stop.stop_lon
        );
        
        if (distance <= maxDistance) {
            nearbyStops.push({
                ...stop,
                distance,
                walking_time: Math.ceil(distance / 1.4 / 60) // 徒歩時間（分）
            });
        }
    }
    
    return nearbyStops.sort((a, b) => a.distance - b.distance);
}

// 距離計算（Haversine公式）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// 公共交通ルート計算（簡略化）
function calculateTransitRoutes(
    originStops: any[],
    destinationStops: any[],
    options: any
) {
    const routes = [];
    
    // 簡略化されたルート生成
    for (let i = 0; i < Math.min(3, originStops.length); i++) {
        const originStop = originStops[i];
        const destinationStop = destinationStops[0];
        
        // 直通ルート（簡略化）
        const route = {
            id: `route_${i}`,
            departure_time: options.departureTime,
            arrival_time: new Date(options.departureTime.getTime() + 30 * 60 * 1000), // 30分後
            duration: 30 * 60, // 30分
            distance: calculateDistance(
                originStop.stop_lat, originStop.stop_lon,
                destinationStop.stop_lat, destinationStop.stop_lon
            ),
            transfers: 0,
            legs: [
                {
                    id: `leg_${i}_0`,
                    type: 'walking',
                    from_name: '出発地',
                    to_name: originStop.stop_name,
                    duration: originStop.walking_time * 60,
                    distance: originStop.distance,
                    departure_time: options.departureTime,
                    arrival_time: new Date(options.departureTime.getTime() + originStop.walking_time * 60 * 1000)
                },
                {
                    id: `leg_${i}_1`,
                    type: 'transit',
                    mode: 'train',
                    route_id: 'JR_YAMANOTE',
                    route_short_name: '山手線',
                    trip_headsign: '外回り',
                    from_stop_name: originStop.stop_name,
                    to_stop_name: destinationStop.stop_name,
                    duration: 20 * 60, // 20分
                    distance: calculateDistance(
                        originStop.stop_lat, originStop.stop_lon,
                        destinationStop.stop_lat, destinationStop.stop_lon
                    ),
                    departure_time: new Date(options.departureTime.getTime() + originStop.walking_time * 60 * 1000),
                    arrival_time: new Date(options.departureTime.getTime() + (originStop.walking_time + 20) * 60 * 1000)
                },
                {
                    id: `leg_${i}_2`,
                    type: 'walking',
                    from_name: destinationStop.stop_name,
                    to_name: '目的地',
                    duration: 5 * 60, // 5分
                    distance: 400,
                    departure_time: new Date(options.departureTime.getTime() + (originStop.walking_time + 20) * 60 * 1000),
                    arrival_time: new Date(options.departureTime.getTime() + (originStop.walking_time + 25) * 60 * 1000)
                }
            ]
        };
        
        routes.push(route);
    }
    
    return routes;
}

// 運賃計算
function calculateRouteFare(route: any) {
    let totalFare = 0;
    const breakdown = [];
    
    for (const leg of route.legs) {
        if (leg.type === 'transit') {
            const fare = 200; // 基本運賃
            totalFare += fare;
            breakdown.push({
                leg_id: leg.id,
                route_name: leg.route_short_name,
                fare: fare,
                currency: 'JPY',
                fare_type: 'regular'
            });
        }
    }
    
    return {
        total: totalFare,
        currency: 'JPY',
        breakdown
    };
}

export default router;