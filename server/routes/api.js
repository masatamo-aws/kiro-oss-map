import express from 'express';
import { ShareService } from '../services/ShareService.js';
import { GeocodingService } from '../services/GeocodingService.js';
import { RoutingService } from '../services/RoutingService.js';

const router = express.Router();

// Initialize services
const shareService = new ShareService();
const geocodingService = new GeocodingService();
const routingService = new RoutingService();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Geocoding endpoints
router.get('/geocoding/search', async (req, res) => {
  try {
    const { q, limit = 10, bbox, countrycodes } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: { message: 'Query parameter "q" is required' }
      });
    }

    const options = {
      limit: Math.min(parseInt(limit), 50),
      bbox: bbox ? bbox.split(',').map(Number) : null,
      countrycodes: countrycodes ? countrycodes.split(',') : null
    };

    const results = await geocodingService.search(q, options);
    
    res.json({
      query: q,
      results: results,
      count: results.length
    });
  } catch (error) {
    console.error('Geocoding search error:', error);
    res.status(500).json({
      error: { message: 'Geocoding search failed' }
    });
  }
});

router.get('/geocoding/reverse', async (req, res) => {
  try {
    const { lat, lon, zoom = 18 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        error: { message: 'Parameters "lat" and "lon" are required' }
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: { message: 'Invalid coordinates' }
      });
    }

    const result = await geocodingService.reverseGeocode(latitude, longitude, {
      zoom: parseInt(zoom)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      error: { message: 'Reverse geocoding failed' }
    });
  }
});

// Routing endpoints
router.get('/routing/route', async (req, res) => {
  try {
    const { coordinates, profile = 'driving', alternatives = false, steps = true } = req.query;
    
    if (!coordinates) {
      return res.status(400).json({
        error: { message: 'Parameter "coordinates" is required' }
      });
    }

    const coords = coordinates.split(';').map(coord => {
      const [lon, lat] = coord.split(',').map(Number);
      return [lon, lat];
    });

    if (coords.length < 2) {
      return res.status(400).json({
        error: { message: 'At least 2 coordinates are required' }
      });
    }

    const options = {
      alternatives: alternatives === 'true',
      steps: steps === 'true'
    };

    const route = await routingService.calculateRoute(
      coords[0], 
      coords[1], 
      profile, 
      options
    );
    
    res.json({
      code: 'Ok',
      routes: [route]
    });
  } catch (error) {
    console.error('Routing error:', error);
    res.status(500).json({
      code: 'Error',
      message: 'Route calculation failed'
    });
  }
});

// Share endpoints
router.post('/share/create', async (req, res) => {
  try {
    const { type, data, expires_in = 2592000 } = req.body; // 30 days default
    
    if (!type || !data) {
      return res.status(400).json({
        error: { message: 'Parameters "type" and "data" are required' }
      });
    }

    const shareData = await shareService.createShare(type, data, expires_in);
    
    res.json(shareData);
  } catch (error) {
    console.error('Share creation error:', error);
    res.status(500).json({
      error: { message: 'Failed to create share' }
    });
  }
});

router.get('/share/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const shareData = await shareService.getShare(id);
    
    if (!shareData) {
      return res.status(404).json({
        error: { message: 'Share not found or expired' }
      });
    }
    
    res.json(shareData);
  } catch (error) {
    console.error('Share retrieval error:', error);
    res.status(500).json({
      error: { message: 'Failed to retrieve share' }
    });
  }
});

// POI search endpoint
router.get('/poi/search', async (req, res) => {
  try {
    const { q, category, bbox, limit = 20 } = req.query;
    
    const options = {
      category,
      bbox: bbox ? bbox.split(',').map(Number) : null,
      limit: Math.min(parseInt(limit), 100)
    };

    // For now, delegate to geocoding service
    // In a real implementation, this would use Overpass API or a POI database
    const results = await geocodingService.searchPOI(q, options);
    
    res.json({
      type: 'FeatureCollection',
      features: results.map(result => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [result.longitude, result.latitude]
        },
        properties: {
          name: result.name,
          category: result.category,
          address: result.address,
          tags: result.tags || {}
        }
      }))
    });
  } catch (error) {
    console.error('POI search error:', error);
    res.status(500).json({
      error: { message: 'POI search failed' }
    });
  }
});

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(clientId)) {
      rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const clientData = rateLimitMap.get(clientId);
    
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: { 
          message: 'Too many requests',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        }
      });
    }
    
    clientData.count++;
    next();
  };
};

// Apply rate limiting to all routes
router.use(rateLimit(1000, 60000)); // 1000 requests per minute

export default router;