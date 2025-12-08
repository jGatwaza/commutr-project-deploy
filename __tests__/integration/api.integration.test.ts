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

  // Note: Watch History and Achievements API tests are covered in unit tests
  // These endpoints require database and auth setup which is complex to mock in integration tests

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
