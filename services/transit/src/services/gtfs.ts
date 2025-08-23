import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { logger } from '../../../shared/utils/logger';

export interface GTFSStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_code?: string;
  stop_desc?: string;
  zone_id?: string;
  stop_url?: string;
  location_type?: number;
  parent_station?: string;
}

export interface GTFSRoute {
  route_id: string;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc?: string;
  route_type: number;
  route_url?: string;
  route_color?: string;
  route_text_color?: string;
}

export interface GTFSTrip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
  direction_id?: number;
  block_id?: string;
  shape_id?: string;
}

export interface GTFSStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
  stop_headsign?: string;
  pickup_type?: number;
  drop_off_type?: number;
  shape_dist_traveled?: number;
}

export interface GTFSAgency {
  agency_id: string;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
  agency_lang?: string;
  agency_phone?: string;
  agency_fare_url?: string;
}

export class GTFSService {
  private stops: Map<string, GTFSStop> = new Map();
  private routes: Map<string, GTFSRoute> = new Map();
  private trips: Map<string, GTFSTrip> = new Map();
  private stopTimes: Map<string, GTFSStopTime[]> = new Map();
  private agencies: Map<string, GTFSAgency> = new Map();
  private gtfsPath: string;

  constructor(gtfsPath: string) {
    this.gtfsPath = gtfsPath;
  }

  async loadGTFSData(): Promise<void> {
    try {
      logger.info('Loading GTFS data...');
      
      await Promise.all([
        this.loadAgencies(),
        this.loadStops(),
        this.loadRoutes(),
        this.loadTrips(),
        this.loadStopTimes()
      ]);

      logger.info(`GTFS data loaded successfully:
        - Agencies: ${this.agencies.size}
        - Stops: ${this.stops.size}
        - Routes: ${this.routes.size}
        - Trips: ${this.trips.size}
        - Stop Times: ${this.stopTimes.size}`);
    } catch (error) {
      logger.error('Failed to load GTFS data:', error);
      throw error;
    }
  }

  private async loadAgencies(): Promise<void> {
    const filePath = path.join(this.gtfsPath, 'agency.txt');
    if (!fs.existsSync(filePath)) return;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: GTFSAgency) => {
          this.agencies.set(row.agency_id, row);
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }

  private async loadStops(): Promise<void> {
    const filePath = path.join(this.gtfsPath, 'stops.txt');
    if (!fs.existsSync(filePath)) return;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          const stop: GTFSStop = {
            ...row,
            stop_lat: parseFloat(row.stop_lat),
            stop_lon: parseFloat(row.stop_lon),
            location_type: row.location_type ? parseInt(row.location_type) : 0
          };
          this.stops.set(stop.stop_id, stop);
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }

  private async loadRoutes(): Promise<void> {
    const filePath = path.join(this.gtfsPath, 'routes.txt');
    if (!fs.existsSync(filePath)) return;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          const route: GTFSRoute = {
            ...row,
            route_type: parseInt(row.route_type)
          };
          this.routes.set(route.route_id, route);
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }

  private async loadTrips(): Promise<void> {
    const filePath = path.join(this.gtfsPath, 'trips.txt');
    if (!fs.existsSync(filePath)) return;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          const trip: GTFSTrip = {
            ...row,
            direction_id: row.direction_id ? parseInt(row.direction_id) : undefined
          };
          this.trips.set(trip.trip_id, trip);
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }

  private async loadStopTimes(): Promise<void> {
    const filePath = path.join(this.gtfsPath, 'stop_times.txt');
    if (!fs.existsSync(filePath)) return;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          const stopTime: GTFSStopTime = {
            ...row,
            stop_sequence: parseInt(row.stop_sequence),
            pickup_type: row.pickup_type ? parseInt(row.pickup_type) : 0,
            drop_off_type: row.drop_off_type ? parseInt(row.drop_off_type) : 0,
            shape_dist_traveled: row.shape_dist_traveled ? parseFloat(row.shape_dist_traveled) : undefined
          };

          if (!this.stopTimes.has(stopTime.trip_id)) {
            this.stopTimes.set(stopTime.trip_id, []);
          }
          this.stopTimes.get(stopTime.trip_id)!.push(stopTime);
        })
        .on('end', () => {
          // Sort stop times by sequence
          for (const [tripId, stopTimes] of this.stopTimes) {
            stopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence);
          }
          resolve();
        })
        .on('error', reject);
    });
  }

  // Public methods for accessing GTFS data
  getStop(stopId: string): GTFSStop | undefined {
    return this.stops.get(stopId);
  }

  getRoute(routeId: string): GTFSRoute | undefined {
    return this.routes.get(routeId);
  }

  getTrip(tripId: string): GTFSTrip | undefined {
    return this.trips.get(tripId);
  }

  getStopTimes(tripId: string): GTFSStopTime[] {
    return this.stopTimes.get(tripId) || [];
  }

  getAgency(agencyId: string): GTFSAgency | undefined {
    return this.agencies.get(agencyId);
  }

  // Search methods
  findNearbyStops(lat: number, lon: number, radiusKm: number = 1): GTFSStop[] {
    const stops: GTFSStop[] = [];
    
    for (const stop of this.stops.values()) {
      const distance = this.calculateDistance(lat, lon, stop.stop_lat, stop.stop_lon);
      if (distance <= radiusKm) {
        stops.push(stop);
      }
    }

    return stops.sort((a, b) => {
      const distA = this.calculateDistance(lat, lon, a.stop_lat, a.stop_lon);
      const distB = this.calculateDistance(lat, lon, b.stop_lat, b.stop_lon);
      return distA - distB;
    });
  }

  searchRoutes(query: string): GTFSRoute[] {
    const results: GTFSRoute[] = [];
    const lowerQuery = query.toLowerCase();

    for (const route of this.routes.values()) {
      if (
        route.route_short_name.toLowerCase().includes(lowerQuery) ||
        route.route_long_name.toLowerCase().includes(lowerQuery)
      ) {
        results.push(route);
      }
    }

    return results;
  }

  getRouteTrips(routeId: string): GTFSTrip[] {
    const trips: GTFSTrip[] = [];
    
    for (const trip of this.trips.values()) {
      if (trip.route_id === routeId) {
        trips.push(trip);
      }
    }

    return trips;
  }

  // Utility methods
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get schedule for a specific stop
  getStopSchedule(stopId: string, date?: Date): any[] {
    const schedule: any[] = [];
    const targetDate = date || new Date();

    for (const [tripId, stopTimes] of this.stopTimes) {
      const stopTime = stopTimes.find(st => st.stop_id === stopId);
      if (stopTime) {
        const trip = this.getTrip(tripId);
        const route = trip ? this.getRoute(trip.route_id) : undefined;
        
        if (trip && route) {
          schedule.push({
            trip_id: tripId,
            route_short_name: route.route_short_name,
            route_long_name: route.route_long_name,
            trip_headsign: trip.trip_headsign,
            arrival_time: stopTime.arrival_time,
            departure_time: stopTime.departure_time,
            route_color: route.route_color,
            route_type: route.route_type
          });
        }
      }
    }

    return schedule.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  }
}