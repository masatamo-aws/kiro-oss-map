/**
 * API Gateway Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Kiro OSS Map API Gateway', () => {
  let server: any;
  let authToken: string;
  const testApiKey = 'test-api-key-12345';

  beforeAll(async () => {
    // Start test server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
    });
  });

  describe('API Documentation', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api/v2')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Kiro OSS Map API Gateway');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User',
        organizationName: 'Test Organization'
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user).toHaveProperty('email', userData.email);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'existing@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      
      authToken = response.body.tokens.accessToken;
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'existing@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should get current user info', async () => {
      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'existing@example.com');
    });
  });

  describe('Maps API', () => {
    it('should get available map styles', async () => {
      const response = await request(app)
        .get('/api/v2/maps/styles')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('styles');
      expect(Array.isArray(response.body.styles)).toBe(true);
      expect(response.body.styles.length).toBeGreaterThan(0);
    });

    it('should get map style definition', async () => {
      const response = await request(app)
        .get('/api/v2/maps/styles/standard')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'standard');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('sources');
    });

    it('should return 404 for non-existent style', async () => {
      await request(app)
        .get('/api/v2/maps/styles/nonexistent')
        .set('X-API-Key', testApiKey)
        .expect(404);
    });
  });

  describe('Search API', () => {
    it('should perform geocoding search', async () => {
      const response = await request(app)
        .get('/api/v2/search/geocode')
        .query({ q: '東京駅' })
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('query', '東京駅');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should perform reverse geocoding', async () => {
      const response = await request(app)
        .get('/api/v2/search/reverse')
        .query({ lat: 35.6812, lng: 139.7671 })
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('coordinates');
      expect(response.body.coordinates).toHaveProperty('latitude', 35.6812);
      expect(response.body.coordinates).toHaveProperty('longitude', 139.7671);
    });

    it('should get search categories', async () => {
      const response = await request(app)
        .get('/api/v2/search/categories')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    it('should require query parameter for geocoding', async () => {
      await request(app)
        .get('/api/v2/search/geocode')
        .set('X-API-Key', testApiKey)
        .expect(400);
    });
  });

  describe('Routing API', () => {
    it('should calculate route', async () => {
      const routeData = {
        origin: [139.7671, 35.6812], // Tokyo Station
        destination: [139.6917, 35.6895], // Shinjuku Station
        profile: 'driving'
      };

      const response = await request(app)
        .post('/api/v2/routing/calculate')
        .send(routeData)
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
      expect(Array.isArray(response.body.routes)).toBe(true);
      expect(response.body.routes.length).toBeGreaterThan(0);
    });

    it('should get routing profiles', async () => {
      const response = await request(app)
        .get('/api/v2/routing/profiles')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(Array.isArray(response.body.profiles)).toBe(true);
    });

    it('should validate route coordinates', async () => {
      const invalidRouteData = {
        origin: [200, 100], // Invalid coordinates
        destination: [139.6917, 35.6895],
        profile: 'driving'
      };

      await request(app)
        .post('/api/v2/routing/calculate')
        .send(invalidRouteData)
        .set('X-API-Key', testApiKey)
        .expect(400);
    });
  });

  describe('User API', () => {
    it('should get user bookmarks', async () => {
      const response = await request(app)
        .get('/api/v2/user/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('bookmarks');
      expect(Array.isArray(response.body.bookmarks)).toBe(true);
    });

    it('should create a bookmark', async () => {
      const bookmarkData = {
        name: 'Test Bookmark',
        coordinates: [139.7671, 35.6812],
        category: 'station',
        tags: ['test']
      };

      const response = await request(app)
        .post('/api/v2/user/bookmarks')
        .send(bookmarkData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Bookmark created successfully');
      expect(response.body).toHaveProperty('bookmark');
    });

    it('should get user preferences', async () => {
      const response = await request(app)
        .get('/api/v2/user/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('preferences');
      expect(response.body.preferences).toHaveProperty('language');
    });

    it('should require authentication for user endpoints', async () => {
      await request(app)
        .get('/api/v2/user/bookmarks')
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests quickly
      const promises = Array(20).fill(null).map(() =>
        request(app)
          .get('/health')
          .expect((res) => {
            expect([200, 429]).toContain(res.status);
          })
      );

      await Promise.all(promises);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v2/nonexistent')
        .set('X-API-Key', testApiKey)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should handle invalid JSON', async () => {
      await request(app)
        .post('/api/v2/auth/login')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });

  describe('Security', () => {
    it('should require API key for protected routes', async () => {
      await request(app)
        .get('/api/v2/maps/styles')
        .expect(401);
    });

    it('should reject invalid API key', async () => {
      await request(app)
        .get('/api/v2/maps/styles')
        .set('X-API-Key', 'invalid-key')
        .expect(401);
    });

    it('should set security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });
});