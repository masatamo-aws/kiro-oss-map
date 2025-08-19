/**
 * Kiro OSS Map v2.1.0 - 共通型定義
 * マイクロサービス間で共有される型定義
 */
/**
 * API レスポンス基本型
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
    metadata?: ResponseMetadata;
}
/**
 * API エラー型
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    traceId?: string;
}
/**
 * レスポンスメタデータ
 */
export interface ResponseMetadata {
    requestId: string;
    timestamp: string;
    version: string;
    service: string;
    processingTime?: number;
    pagination?: PaginationMetadata;
}
/**
 * ページネーションメタデータ
 */
export interface PaginationMetadata {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
/**
 * 座標情報
 */
export interface Coordinates {
    latitude: number;
    longitude: number;
}
/**
 * 境界ボックス
 */
export interface BoundingBox {
    north: number;
    south: number;
    east: number;
    west: number;
}
/**
 * 地理的範囲
 */
export interface GeographicBounds {
    center: Coordinates;
    radius?: number;
    boundingBox?: BoundingBox;
}
/**
 * GeoJSON Point
 */
export interface GeoPoint {
    type: 'Point';
    coordinates: [number, number];
}
/**
 * GeoJSON LineString
 */
export interface GeoLineString {
    type: 'LineString';
    coordinates: [number, number][];
}
/**
 * GeoJSON Polygon
 */
export interface GeoPolygon {
    type: 'Polygon';
    coordinates: [number, number][][];
}
/**
 * GeoJSON Geometry Union
 */
export type GeoGeometry = GeoPoint | GeoLineString | GeoPolygon;
/**
 * ユーザー基本情報
 */
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}
/**
 * ユーザーロール
 */
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin",
    MODERATOR = "moderator"
}
/**
 * ユーザー設定
 */
export interface UserSettings {
    userId: string;
    language: string;
    theme: 'light' | 'dark' | 'auto';
    units: 'metric' | 'imperial';
    defaultMapStyle: string;
    notifications: NotificationSettings;
    privacy: PrivacySettings;
    updatedAt: Date;
}
/**
 * 通知設定
 */
export interface NotificationSettings {
    email: boolean;
    push: boolean;
    marketing: boolean;
}
/**
 * プライバシー設定
 */
export interface PrivacySettings {
    shareLocation: boolean;
    shareBookmarks: boolean;
    analytics: boolean;
}
/**
 * JWT ペイロード
 */
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
    jti?: string;
}
/**
 * 認証トークン
 */
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
}
/**
 * セッション情報
 */
export interface Session {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt: Date;
    ipAddress: string;
    userAgent: string;
}
/**
 * 地図スタイル
 */
export interface MapStyle {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    styleUrl: string;
    isDefault: boolean;
    category: MapStyleCategory;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * 地図スタイルカテゴリ
 */
export declare enum MapStyleCategory {
    STANDARD = "standard",
    SATELLITE = "satellite",
    TERRAIN = "terrain",
    DARK = "dark",
    CUSTOM = "custom"
}
/**
 * タイル情報
 */
export interface TileInfo {
    z: number;
    x: number;
    y: number;
    style: string;
    format: 'png' | 'jpg' | 'webp';
}
/**
 * 検索リクエスト
 */
export interface SearchRequest {
    query: string;
    limit?: number;
    offset?: number;
    bounds?: GeographicBounds;
    countryCode?: string;
    language?: string;
    categories?: string[];
}
/**
 * 検索結果
 */
export interface SearchResult {
    placeId: string;
    displayName: string;
    coordinates: Coordinates;
    boundingBox?: BoundingBox;
    category: string;
    type: string;
    importance: number;
    address?: Address;
    metadata?: Record<string, any>;
}
/**
 * 住所情報
 */
export interface Address {
    houseNumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    countryCode?: string;
}
/**
 * 検索履歴
 */
export interface SearchHistory {
    id: string;
    userId: string;
    query: string;
    results: SearchResult[];
    timestamp: Date;
    location?: Coordinates;
}
/**
 * ルート計算リクエスト
 */
export interface RouteRequest {
    coordinates: Coordinates[];
    profile: RouteProfile;
    alternatives?: boolean;
    steps?: boolean;
    geometries?: 'geojson' | 'polyline' | 'polyline6';
    overview?: 'full' | 'simplified' | 'false';
    annotations?: string[];
}
/**
 * ルートプロファイル
 */
export declare enum RouteProfile {
    DRIVING = "driving",
    WALKING = "walking",
    CYCLING = "cycling",
    PUBLIC_TRANSPORT = "public-transport"
}
/**
 * ルート計算結果
 */
export interface RouteResponse {
    code: string;
    routes: Route[];
    waypoints?: Waypoint[];
}
/**
 * ルート情報
 */
export interface Route {
    geometry: GeoGeometry;
    legs: RouteLeg[];
    distance: number;
    duration: number;
    steps?: RouteStep[];
    metadata?: RouteMetadata;
}
/**
 * ルート区間
 */
export interface RouteLeg {
    distance: number;
    duration: number;
    steps?: RouteStep[];
    summary?: string;
}
/**
 * ルートステップ
 */
export interface RouteStep {
    geometry: GeoGeometry;
    maneuver: Maneuver;
    distance: number;
    duration: number;
    name: string;
    instruction: string;
}
/**
 * 操作指示
 */
export interface Maneuver {
    type: string;
    instruction: string;
    bearingBefore?: number;
    bearingAfter?: number;
    location: Coordinates;
}
/**
 * ルートメタデータ
 */
export interface RouteMetadata {
    engine: string;
    version: string;
    timestamp: Date;
    processingTime: number;
}
/**
 * ウェイポイント
 */
export interface Waypoint {
    hint?: string;
    distance?: number;
    name?: string;
    location: Coordinates;
}
/**
 * ブックマーク
 */
export interface Bookmark {
    id: string;
    userId: string;
    name: string;
    description?: string;
    coordinates: Coordinates;
    category: string;
    tags: string[];
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * ブックマークカテゴリ
 */
export interface BookmarkCategory {
    id: string;
    userId: string;
    name: string;
    color: string;
    icon?: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * ログエントリ
 */
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    version: string;
    traceId?: string | undefined;
    spanId?: string | undefined;
    userId?: string | undefined;
    requestId: string;
    message: string;
    metadata?: Record<string, any>;
    error?: LogError;
}
/**
 * ログレベル
 */
export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}
/**
 * ログエラー
 */
export interface LogError {
    name: string;
    message: string;
    stack: string;
}
/**
 * メトリクス
 */
export interface Metrics {
    service: string;
    timestamp: Date;
    http: HttpMetrics;
    system: SystemMetrics;
    database?: DatabaseMetrics;
    cache?: CacheMetrics;
}
/**
 * HTTP メトリクス
 */
export interface HttpMetrics {
    requestsTotal: number;
    requestDuration: number[];
    errorRate: number;
    activeConnections: number;
}
/**
 * システムメトリクス
 */
export interface SystemMetrics {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
}
/**
 * データベースメトリクス
 */
export interface DatabaseMetrics {
    connectionsActive: number;
    connectionsIdle: number;
    queryDuration: number[];
    queryCount: number;
}
/**
 * キャッシュメトリクス
 */
export interface CacheMetrics {
    hitRate: number;
    missRate: number;
    evictionCount: number;
    memoryUsage: number;
}
/**
 * サービス設定
 */
export interface ServiceConfig {
    name: string;
    version: string;
    port: number;
    environment: Environment;
    database?: DatabaseConfig;
    redis?: RedisConfig;
    external?: ExternalServiceConfig;
    monitoring?: MonitoringConfig;
}
/**
 * 環境
 */
export declare enum Environment {
    DEVELOPMENT = "development",
    STAGING = "staging",
    PRODUCTION = "production"
}
/**
 * データベース設定
 */
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
}
/**
 * Redis設定
 */
export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    database?: number;
    keyPrefix?: string;
}
/**
 * 外部サービス設定
 */
export interface ExternalServiceConfig {
    nominatim?: {
        baseUrl: string;
        timeout: number;
    };
    osrm?: {
        baseUrl: string;
        timeout: number;
    };
}
/**
 * 監視設定
 */
export interface MonitoringConfig {
    prometheus?: {
        enabled: boolean;
        port: number;
        path: string;
    };
    jaeger?: {
        enabled: boolean;
        endpoint: string;
    };
}
/**
 * 部分的な型（Partial の拡張）
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
/**
 * 必須フィールドを指定
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
/**
 * オプショナルフィールドを指定
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/**
 * 作成用型（IDとタイムスタンプを除外）
 */
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * 更新用型（IDとタイムスタンプを除外、他はオプショナル）
 */
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
//# sourceMappingURL=common.d.ts.map