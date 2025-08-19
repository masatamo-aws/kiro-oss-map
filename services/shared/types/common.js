/**
 * Kiro OSS Map v2.1.0 - 共通型定義
 * マイクロサービス間で共有される型定義
 */
/**
 * ユーザーロール
 */
export var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["ADMIN"] = "admin";
    UserRole["MODERATOR"] = "moderator";
})(UserRole || (UserRole = {}));
/**
 * 地図スタイルカテゴリ
 */
export var MapStyleCategory;
(function (MapStyleCategory) {
    MapStyleCategory["STANDARD"] = "standard";
    MapStyleCategory["SATELLITE"] = "satellite";
    MapStyleCategory["TERRAIN"] = "terrain";
    MapStyleCategory["DARK"] = "dark";
    MapStyleCategory["CUSTOM"] = "custom";
})(MapStyleCategory || (MapStyleCategory = {}));
/**
 * ルートプロファイル
 */
export var RouteProfile;
(function (RouteProfile) {
    RouteProfile["DRIVING"] = "driving";
    RouteProfile["WALKING"] = "walking";
    RouteProfile["CYCLING"] = "cycling";
    RouteProfile["PUBLIC_TRANSPORT"] = "public-transport";
})(RouteProfile || (RouteProfile = {}));
/**
 * ログレベル
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (LogLevel = {}));
/**
 * 環境
 */
export var Environment;
(function (Environment) {
    Environment["DEVELOPMENT"] = "development";
    Environment["STAGING"] = "staging";
    Environment["PRODUCTION"] = "production";
})(Environment || (Environment = {}));
//# sourceMappingURL=common.js.map