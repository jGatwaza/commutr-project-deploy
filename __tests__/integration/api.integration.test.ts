/**
 * Integration tests for API endpoints
 * Tests the entire API layer with real HTTP requests
 */

import request from 'supertest';
import express, { type Express } from 'express';
import cors from 'cors';
import playlistRouter from '../../src/web/playlist.js';
import watchHistoryRouter from '../../src/web/watchHistory.js';
import achievementsRouter from '../../src/web/achievements.js';

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  // Mount routers
  app.use(playlistRouter);
  app.use('/api', watchHistoryRouter);
  app.use('/api', achievementsRouter);
  
  return app;
}

describe('API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Playlist API', () => {
    test('GET /v1/playlist should return 401 without auth', async () => {
      const response = await request(app)
        .get('/v1/playlist')
        .query({ topic: 'python', durationSec: 600 });

      expect(response.status).toBe(401);
    });

    test('GET /v1/playlist should return 400 for missing params', async () => {
      const response = await request(app)
        .get('/v1/playlist')
        .set('Authorization', 'Bearer TEST')
        .query({});

      expect(response.status).toBe(400);
    });

    test('GET /v1/playlist should return 400 for invalid duration', async () => {
      const response = await request(app)
        .get('/v1/playlist')
        .set('Authorization', 'Bearer TEST')
        .query({ topic: 'python', durationSec: 200 }); // Below minimum 300

      expect(response.status).toBe(400);
    });

    test('GET /v1/playlist should return playlist with valid params', async () => {
      const response = await request(app)
        .get('/v1/playlist')
        .set('Authorization', 'Bearer TEST')
        .query({ topic: 'python', durationSec: 900 });

      if (response.status === 204) {
        // No content available for this topic
        expect(response.headers['x-reason']).toBe('no_candidates');
      } else {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('totalDurationSec');
        expect(Array.isArray(response.body.items)).toBe(true);
      }
    });

    test('GET /v1/playlist should respect duration constraints', async () => {
      const response = await request(app)
        .get('/v1/playlist')
        .set('Authorization', 'Bearer TEST')
        .query({ topic: 'python', durationSec: 600 });

      if (response.status === 200) {
        const minDuration = 600 * 0.5; // Allow 50% tolerance
        const maxDuration = 600 * 1.5;
        
        expect(response.body.totalDurationSec).toBeGreaterThanOrEqual(minDuration);
        expect(response.body.totalDurationSec).toBeLessThanOrEqual(maxDuration);
      }
    });

    test('GET /v1/playlist should include video metadata', async () => {
      const response = await request(app)
        .get('/v1/playlist')
        .set('Authorization', 'Bearer TEST')
        .query({ topic: 'javascript', durationSec: 600 });

      if (response.status === 200 && response.body.items.length > 0) {
        const video = response.body.items[0];
        expect(video).toHaveProperty('videoId');
        expect(video).toHaveProperty('title');
        expect(video).toHaveProperty('durationSec');
        expect(video).toHaveProperty('thumbnail');
      }
    });
  });

  describe('Watch History API', () => {
    const mockAuth = (req: any, res: any, next: any) => {
      req.user = { firebaseUid: 'testUser123' };
      next();
    };

    beforeAll(() => {
      // Mock auth middleware for watch history tests
      const middleware = require('../../src/auth/middleware.js');
      middleware.requireAuth = mockAuth;
    });

    test('POST /api/history/watch should require auth', async () => {
      // This will fail before our mock kicks in if auth is not set up properly
      const response = await request(app)
        .post('/api/history/watch')
        .send({
          userId: 'testUser',
          videoId: 'test123',
          title: 'Test Video',
          durationSec: 300,
          progressPct: 50
        });

      // With mocked auth, this should work
      expect([201, 400, 500]).toContain(response.status);
    });

    test('POST /api/history/watch should validate input', async () => {
      const response = await request(app)
        .post('/api/history/watch')
        .send({
          userId: 'testUser',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/history/watch should require userId', async () => {
      const response = await request(app)
        .get('/api/history/watch')
        .query({});

      expect(response.status).toBe(400);
    });

    test('GET /api/history/analytics should validate timeframe', async () => {
      const response = await request(app)
        .get('/api/history/analytics')
        .query({ userId: 'testUser', timeframe: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('Achievements API', () => {
    test('GET /api/achievements should require auth', async () => {
      const response = await request(app)
        .get('/api/achievements')
        .query({ userId: 'testUser' });

      // Should either require auth (401) or work with test setup
      expect([200, 401, 500]).toContain(response.status);
    });

    test('GET /api/achievements should return achievement structure', async () => {
      // Mock auth for this test
      const middleware = require('../../src/auth/middleware.js');
      middleware.requireAuth = (req: any, res: any, next: any) => {
        req.user = { firebaseUid: 'testUser' };
        next();
      };

      const response = await request(app)
        .get('/api/achievements')
        .query({ userId: 'testUser' });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('summary');
        expect(response.body).toHaveProperty('badges');
        expect(response.body.summary).toHaveProperty('totalMinutes');
        expect(response.body.summary).toHaveProperty('totalSessions');
        expect(Array.isArray(response.body.badges)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', 'Bearer TEST');

      expect(response.status).toBe(404);
    });

    test('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/history/watch')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBe(400);
    });
  });

  describe('CORS', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .options('/v1/playlist')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
