import fetch from 'node-fetch';

/**
 * Routing service using OSRM API
 */
export class RoutingService {
  constructor() {
    this.osrmBaseUrl = 'https://router.project-osrm.org';
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async calculateRoute(origin, destination, profile = 'driving', options = {}) {
    const cacheKey = `route:${origin.join(',')}:${destination.join(',')}:${profile}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      let route;
      
      if (profile === 'walking') {
        route = await this.calculateWalkingRoute(origin, destination, options);
      } else {
        route = await this.calculateDrivingRoute(origin, destination, options);
      }

      // Cache result
      this.cache.set(cacheKey, {
        data: route,
        timestamp: Date.now()
      });

      return route;
    } catch (error) {
      console.error('Route calculation failed:', error);
      throw error;
    }
  }

  async calculateDrivingRoute(origin, destination, options = {}) {
    const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
    
    const params = new URLSearchParams({
      geometries: 'geojson',
      steps: options.steps !== false ? 'true' : 'false',
      overview: 'full',
      alternatives: options.alternatives ? 'true' : 'false'
    });

    const url = `${this.osrmBaseUrl}/route/v1/driving/${coordinates}?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error(`OSRM error: ${data.message}`);
    }

    return this.parseOSRMRoute(data.routes[0], 'driving');
  }

  async calculateWalkingRoute(origin, destination, options = {}) {
    const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
    
    const params = new URLSearchParams({
      geometries: 'geojson',
      steps: options.steps !== false ? 'true' : 'false',
      overview: 'full'
    });

    const url = `${this.osrmBaseUrl}/route/v1/foot/${coordinates}?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error(`OSRM error: ${data.message}`);
    }

    return this.parseOSRMRoute(data.routes[0], 'walking');
  }

  parseOSRMRoute(route, profile) {
    return {
      id: `route-${Date.now()}`,
      profile: profile,
      distance: route.distance, // meters
      duration: route.duration, // seconds
      geometry: route.geometry,
      legs: route.legs.map(leg => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps ? leg.steps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instruction: this.translateInstruction(step.maneuver, profile),
          maneuver: {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            location: step.maneuver.location
          },
          geometry: step.geometry
        })) : []
      })),
      waypoints: route.legs.map(leg => 
        leg.steps && leg.steps.length > 0 
          ? leg.steps[0].maneuver.location 
          : null
      ).filter(Boolean)
    };
  }

  translateInstruction(maneuver, profile) {
    const type = maneuver.type;
    const modifier = maneuver.modifier;
    
    const instructions = {
      driving: {
        depart: '出発',
        turn: {
          left: '左折',
          right: '右折',
          'slight left': '左方向',
          'slight right': '右方向',
          'sharp left': '急左折',
          'sharp right': '急右折',
          straight: '直進'
        },
        merge: {
          left: '左車線に合流',
          right: '右車線に合流',
          straight: '合流'
        },
        'on ramp': 'ランプに進入',
        'off ramp': 'ランプから退出',
        fork: {
          left: '左方向に分岐',
          right: '右方向に分岐',
          straight: '直進で分岐'
        },
        roundabout: 'ロータリーに進入',
        'roundabout turn': {
          left: 'ロータリーで左折',
          right: 'ロータリーで右折'
        },
        arrive: '目的地に到着'
      },
      walking: {
        depart: '出発',
        turn: {
          left: '左に曲がる',
          right: '右に曲がる',
          'slight left': '左方向に進む',
          'slight right': '右方向に進む',
          'sharp left': '急に左に曲がる',
          'sharp right': '急に右に曲がる',
          straight: '直進'
        },
        arrive: '目的地に到着'
      }
    };

    const profileInstructions = instructions[profile] || instructions.driving;
    
    if (profileInstructions[type]) {
      if (typeof profileInstructions[type] === 'object') {
        return profileInstructions[type][modifier] || profileInstructions[type].straight || type;
      }
      return profileInstructions[type];
    }
    
    return type;
  }

  async getRouteMatrix(origins, destinations, profile = 'driving') {
    const originCoords = origins.map(coord => `${coord[0]},${coord[1]}`).join(';');
    const destCoords = destinations.map(coord => `${coord[0]},${coord[1]}`).join(';');
    
    const params = new URLSearchParams({
      sources: Array.from({length: origins.length}, (_, i) => i).join(';'),
      destinations: Array.from({length: destinations.length}, (_, i) => i + origins.length).join(';')
    });

    const profilePath = profile === 'walking' ? 'foot' : 'driving';
    const url = `${this.osrmBaseUrl}/table/v1/${profilePath}/${originCoords};${destCoords}?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM Matrix API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error(`OSRM Matrix error: ${data.message}`);
    }

    return {
      durations: data.durations,
      distances: data.distances || null
    };
  }

  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
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

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}