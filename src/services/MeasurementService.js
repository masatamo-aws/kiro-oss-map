/**
 * MeasurementService - 地図上での距離・面積測定機能
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { StorageService } from './StorageService.js';

export class MeasurementService {
  constructor() {
    this.measurements = new Map();
    this.activeMeasurement = null;
    this.measurementType = null; // 'distance', 'area', 'route'
    this.units = 'metric'; // 'metric' or 'imperial'
    this.storageService = new StorageService();
    
    this.setupEventListeners();
    this.loadSettings();
  }

  setupEventListeners() {
    EventBus.on('measurement:start', (data) => {
      this.startMeasurement(data.type);
    });

    EventBus.on('measurement:addPoint', (data) => {
      this.addMeasurementPoint(data.coordinates);
    });

    EventBus.on('measurement:finish', () => {
      this.finishMeasurement();
    });

    EventBus.on('measurement:cancel', () => {
      this.cancelMeasurement();
    });

    EventBus.on('measurement:clear', () => {
      this.clearAllMeasurements();
    });

    EventBus.on('measurement:setUnits', (data) => {
      this.setUnits(data.units);
    });
  }

  loadSettings() {
    const settings = this.storageService.get('measurement-settings');
    if (settings) {
      this.units = settings.units || 'metric';
    }
  }

  saveSettings() {
    this.storageService.set('measurement-settings', {
      units: this.units
    });
  }

  startMeasurement(type) {
    try {
      if (this.activeMeasurement) {
        this.cancelMeasurement();
      }

      this.measurementType = type;
      this.activeMeasurement = {
        id: `measurement-${Date.now()}`,
        type: type,
        points: [],
        createdAt: new Date().toISOString(),
        isActive: true
      };

      Logger.info(`Started ${type} measurement`, { id: this.activeMeasurement.id });
      
      EventBus.emit('measurement:started', {
        measurement: this.activeMeasurement
      });

    } catch (error) {
      Logger.error('Failed to start measurement', error);
      EventBus.emit('measurement:error', { message: '測定を開始できませんでした' });
    }
  }

  addMeasurementPoint(coordinates) {
    try {
      if (!this.activeMeasurement) {
        throw new Error('No active measurement');
      }

      this.activeMeasurement.points.push({
        coordinates: coordinates,
        timestamp: new Date().toISOString()
      });

      // リアルタイム計算
      const result = this.calculateMeasurement(this.activeMeasurement);
      
      EventBus.emit('measurement:updated', {
        measurement: this.activeMeasurement,
        result: result
      });

      Logger.debug('Added measurement point', { 
        coordinates, 
        totalPoints: this.activeMeasurement.points.length 
      });

    } catch (error) {
      Logger.error('Failed to add measurement point', error);
      EventBus.emit('measurement:error', { message: '測定点を追加できませんでした' });
    }
  }

  finishMeasurement() {
    try {
      if (!this.activeMeasurement) {
        throw new Error('No active measurement');
      }

      if (this.activeMeasurement.points.length < 2) {
        throw new Error('Insufficient points for measurement');
      }

      // 最終計算
      const result = this.calculateMeasurement(this.activeMeasurement);
      
      this.activeMeasurement.isActive = false;
      this.activeMeasurement.result = result;
      this.activeMeasurement.completedAt = new Date().toISOString();

      // 保存
      this.measurements.set(this.activeMeasurement.id, this.activeMeasurement);
      this.saveMeasurements();

      Logger.info('Finished measurement', { 
        id: this.activeMeasurement.id,
        result: result
      });

      EventBus.emit('measurement:completed', {
        measurement: this.activeMeasurement,
        result: result
      });

      this.activeMeasurement = null;
      this.measurementType = null;

    } catch (error) {
      Logger.error('Failed to finish measurement', error);
      EventBus.emit('measurement:error', { message: '測定を完了できませんでした' });
    }
  }

  cancelMeasurement() {
    try {
      if (this.activeMeasurement) {
        Logger.info('Cancelled measurement', { id: this.activeMeasurement.id });
        
        EventBus.emit('measurement:cancelled', {
          measurement: this.activeMeasurement
        });

        this.activeMeasurement = null;
        this.measurementType = null;
      }
    } catch (error) {
      Logger.error('Failed to cancel measurement', error);
    }
  }

  calculateMeasurement(measurement) {
    try {
      switch (measurement.type) {
        case 'distance':
          return this.calculateDistance(measurement.points);
        case 'area':
          return this.calculateArea(measurement.points);
        case 'route':
          return this.calculateRouteDistance(measurement.points);
        default:
          throw new Error(`Unknown measurement type: ${measurement.type}`);
      }
    } catch (error) {
      Logger.error('Failed to calculate measurement', error);
      return null;
    }
  }

  calculateDistance(points) {
    if (points.length < 2) return null;

    let totalDistance = 0;
    
    for (let i = 1; i < points.length; i++) {
      const distance = this.haversineDistance(
        points[i - 1].coordinates,
        points[i].coordinates
      );
      totalDistance += distance;
    }

    return {
      type: 'distance',
      value: totalDistance,
      unit: this.units,
      formatted: this.formatDistance(totalDistance),
      segments: this.calculateSegments(points)
    };
  }

  calculateArea(points) {
    if (points.length < 3) return null;

    // Shoelace公式による面積計算
    const coordinates = points.map(p => p.coordinates);
    const area = this.shoelaceArea(coordinates);

    return {
      type: 'area',
      value: area,
      unit: this.units,
      formatted: this.formatArea(area),
      perimeter: this.calculatePerimeter(points)
    };
  }

  async calculateRouteDistance(points) {
    if (points.length < 2) return null;

    try {
      // OSRM APIを使用して実際の道路距離を計算
      const coordinates = points.map(p => p.coordinates);
      const coordinatesString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`
      );

      if (!response.ok) {
        throw new Error('OSRM API request failed');
      }

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        return {
          type: 'route',
          value: route.distance,
          unit: this.units,
          formatted: this.formatDistance(route.distance),
          duration: route.duration,
          formattedDuration: this.formatDuration(route.duration),
          geometry: route.geometry
        };
      }

      throw new Error('No route found');

    } catch (error) {
      Logger.error('Failed to calculate route distance', error);
      
      // フォールバック: 直線距離を使用
      return this.calculateDistance(points);
    }
  }

  haversineDistance(coord1, coord2) {
    const R = 6371000; // 地球の半径（メートル）
    const φ1 = coord1[1] * Math.PI / 180;
    const φ2 = coord2[1] * Math.PI / 180;
    const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
    const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  shoelaceArea(coordinates) {
    if (coordinates.length < 3) return 0;

    // 座標を平面座標系に変換（簡易版）
    const projectedCoords = coordinates.map(coord => {
      const x = coord[0] * 111320 * Math.cos(coord[1] * Math.PI / 180);
      const y = coord[1] * 110540;
      return [x, y];
    });

    let area = 0;
    const n = projectedCoords.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += projectedCoords[i][0] * projectedCoords[j][1];
      area -= projectedCoords[j][0] * projectedCoords[i][1];
    }

    return Math.abs(area) / 2;
  }

  calculateSegments(points) {
    const segments = [];
    
    for (let i = 1; i < points.length; i++) {
      const distance = this.haversineDistance(
        points[i - 1].coordinates,
        points[i].coordinates
      );
      
      segments.push({
        from: points[i - 1].coordinates,
        to: points[i].coordinates,
        distance: distance,
        formatted: this.formatDistance(distance)
      });
    }

    return segments;
  }

  calculatePerimeter(points) {
    if (points.length < 3) return 0;

    // 閉じた多角形として周囲長を計算
    const closedPoints = [...points, points[0]];
    const result = this.calculateDistance(closedPoints);
    
    return {
      value: result.value,
      formatted: result.formatted
    };
  }

  formatDistance(meters) {
    if (this.units === 'imperial') {
      const feet = meters * 3.28084;
      const miles = feet / 5280;
      
      if (miles >= 1) {
        return `${miles.toFixed(2)} mi`;
      } else {
        return `${feet.toFixed(0)} ft`;
      }
    } else {
      if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2)} km`;
      } else {
        return `${meters.toFixed(0)} m`;
      }
    }
  }

  formatArea(squareMeters) {
    if (this.units === 'imperial') {
      const squareFeet = squareMeters * 10.7639;
      const acres = squareFeet / 43560;
      const squareMiles = acres / 640;
      
      if (squareMiles >= 1) {
        return `${squareMiles.toFixed(2)} sq mi`;
      } else if (acres >= 1) {
        return `${acres.toFixed(2)} acres`;
      } else {
        return `${squareFeet.toFixed(0)} sq ft`;
      }
    } else {
      if (squareMeters >= 1000000) {
        return `${(squareMeters / 1000000).toFixed(2)} km²`;
      } else if (squareMeters >= 10000) {
        return `${(squareMeters / 10000).toFixed(2)} ha`;
      } else {
        return `${squareMeters.toFixed(0)} m²`;
      }
    }
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  }

  setUnits(units) {
    this.units = units;
    this.saveSettings();
    
    EventBus.emit('measurement:unitsChanged', { units });
    Logger.info('Changed measurement units', { units });
  }

  getMeasurements() {
    return Array.from(this.measurements.values());
  }

  getMeasurement(id) {
    return this.measurements.get(id);
  }

  deleteMeasurement(id) {
    try {
      if (this.measurements.has(id)) {
        this.measurements.delete(id);
        this.saveMeasurements();
        
        EventBus.emit('measurement:deleted', { id });
        Logger.info('Deleted measurement', { id });
        
        return true;
      }
      return false;
    } catch (error) {
      Logger.error('Failed to delete measurement', error);
      return false;
    }
  }

  clearAllMeasurements() {
    try {
      this.measurements.clear();
      this.saveMeasurements();
      
      if (this.activeMeasurement) {
        this.cancelMeasurement();
      }
      
      EventBus.emit('measurement:allCleared');
      Logger.info('Cleared all measurements');
      
    } catch (error) {
      Logger.error('Failed to clear measurements', error);
    }
  }

  exportMeasurements(format = 'json') {
    try {
      const measurements = this.getMeasurements();
      
      switch (format) {
        case 'json':
          return JSON.stringify(measurements, null, 2);
        case 'csv':
          return this.exportToCSV(measurements);
        case 'geojson':
          return this.exportToGeoJSON(measurements);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      Logger.error('Failed to export measurements', error);
      return null;
    }
  }

  exportToCSV(measurements) {
    const headers = ['ID', 'Type', 'Value', 'Unit', 'Created', 'Completed'];
    const rows = measurements.map(m => [
      m.id,
      m.type,
      m.result?.value || '',
      m.result?.unit || '',
      m.createdAt,
      m.completedAt || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  exportToGeoJSON(measurements) {
    const features = measurements.map(m => ({
      type: 'Feature',
      properties: {
        id: m.id,
        type: m.type,
        result: m.result,
        createdAt: m.createdAt,
        completedAt: m.completedAt
      },
      geometry: {
        type: m.type === 'area' ? 'Polygon' : 'LineString',
        coordinates: m.type === 'area' 
          ? [m.points.map(p => p.coordinates)]
          : m.points.map(p => p.coordinates)
      }
    }));

    return JSON.stringify({
      type: 'FeatureCollection',
      features: features
    }, null, 2);
  }

  saveMeasurements() {
    try {
      const measurementsArray = Array.from(this.measurements.entries());
      this.storageService.set('measurements', measurementsArray);
    } catch (error) {
      Logger.error('Failed to save measurements', error);
    }
  }

  loadMeasurements() {
    try {
      const measurementsArray = this.storageService.get('measurements');
      if (measurementsArray) {
        this.measurements = new Map(measurementsArray);
        Logger.info('Loaded measurements', { count: this.measurements.size });
      }
    } catch (error) {
      Logger.error('Failed to load measurements', error);
    }
  }

  getActiveMeasurement() {
    return this.activeMeasurement;
  }

  isActive() {
    return this.activeMeasurement !== null;
  }

  getMeasurementType() {
    return this.measurementType;
  }

  getUnits() {
    return this.units;
  }
}