/**
 * Geolocation service for getting user's current position
 */
export class GeolocationService {
  constructor() {
    this.watchId = null;
    this.lastKnownPosition = null;
    this.isWatching = false;
  }

  async getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      };

      const finalOptions = { ...defaultOptions, ...options };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };

          this.lastKnownPosition = result;
          resolve(result);
        },
        (error) => {
          reject(this.handleGeolocationError(error));
        },
        finalOptions
      );
    });
  }

  startWatching(callback, options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    if (this.isWatching) {
      this.stopWatching();
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000 // 30 seconds
    };

    const finalOptions = { ...defaultOptions, ...options };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const result = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        };

        this.lastKnownPosition = result;
        callback(result);
      },
      (error) => {
        callback(null, this.handleGeolocationError(error));
      },
      finalOptions
    );

    this.isWatching = true;
    return this.watchId;
  }

  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  handleGeolocationError(error) {
    let message;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = '位置情報の取得が拒否されました。ブラウザの設定で位置情報を許可してください。';
        break;
      case error.POSITION_UNAVAILABLE:
        message = '位置情報が利用できません。';
        break;
      case error.TIMEOUT:
        message = '位置情報の取得がタイムアウトしました。';
        break;
      default:
        message = '位置情報の取得中に不明なエラーが発生しました。';
        break;
    }

    return new Error(message);
  }

  isSupported() {
    return 'geolocation' in navigator;
  }

  async checkPermission() {
    if (!navigator.permissions) {
      return 'unsupported';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      return 'unsupported';
    }
  }

  getLastKnownPosition() {
    return this.lastKnownPosition;
  }

  calculateDistance(pos1, pos2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.latitude * Math.PI / 180;
    const φ2 = pos2.latitude * Math.PI / 180;
    const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  calculateBearing(pos1, pos2) {
    const φ1 = pos1.latitude * Math.PI / 180;
    const φ2 = pos2.latitude * Math.PI / 180;
    const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);

    return (θ * 180 / Math.PI + 360) % 360; // Bearing in degrees
  }

  formatCoordinates(position, format = 'decimal') {
    const { latitude, longitude } = position;

    switch (format) {
      case 'decimal':
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      
      case 'dms':
        return `${this.toDMS(latitude, 'lat')}, ${this.toDMS(longitude, 'lng')}`;
      
      default:
        return `${latitude}, ${longitude}`;
    }
  }

  toDMS(coordinate, type) {
    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

    const direction = type === 'lat' 
      ? (coordinate >= 0 ? 'N' : 'S')
      : (coordinate >= 0 ? 'E' : 'W');

    return `${degrees}°${minutes}'${seconds}"${direction}`;
  }
}