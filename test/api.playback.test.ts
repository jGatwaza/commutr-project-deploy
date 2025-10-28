import request from 'supertest';
import express, { type Request, type Response, type NextFunction } from 'express';
import playbackRouter, {
  __setPacksRepo,
  __simulateDown,
  __resetRate,
  __resetDone,
} from '../src/web/playback.js';

/**
 * Playback API Tests
 * Tests for deep link generation and completion tracking endpoints
 */

// ============================================================================
// Test App Setup
// ============================================================================

function createTestApp(withAuth = true) {
  const app = express();
  
  // Mock auth middleware
  if (withAuth) {
    app.use((req: any, res: Response, next: NextFunction) => {
      req.user = { userId: 'test-user-123' };
      next();
    });
  }
  
  app.use(express.json());
  app.use(playbackRouter);
  
  return app;
}

// ============================================================================
// Test Data Setup
// ============================================================================

function setupTestPacks() {
  const packs = new Map();
  packs.set('pack-001', {
    items: [
      { videoId: 'video-a', durationSec: 300 },
      { videoId: 'video-b', durationSec: 450 },
      { videoId: 'video-c', durationSec: 600 },
    ],
  });
  packs.set('pack-002', {
    items: [
      { videoId: 'video-x', durationSec: 200 },
      { videoId: 'video-y', durationSec: 350 },
    ],
  });
  __setPacksRepo(packs);
}

// ============================================================================
// Test Suite: GET /v1/playback/deeplink
// ============================================================================

describe('GET /v1/playback/deeplink', () => {
  beforeEach(() => {
    setupTestPacks();
    __resetRate();
    __simulateDown(false);
  });

  test('GET happy: 302 redirect + correct Location', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-a', startSec: 30 })
      .redirects(0); // Don't follow redirects
    
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://www.youtube.com/watch?v=video-a&t=30s');
  });

  test('GET JSON mode: 200 { url, version:"v1" }', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-b', startSec: 0, format: 'json' });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: 'https://www.youtube.com/watch?v=video-b&t=0s',
      version: 'v1',
    });
  });

  test('GET JSON mode via Accept header', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-c' })
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: 'https://www.youtube.com/watch?v=video-c&t=0s',
      version: 'v1',
    });
  });

  test('GET 400 missing packId', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ videoId: 'video-a' });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PARAMS');
  });

  test('GET 400 missing videoId', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001' });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PARAMS');
  });

  test('GET 400 invalid startSec (negative)', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-a', startSec: -10 });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PARAMS');
  });

  test('GET 400 invalid format', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-a', format: 'xml' });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PARAMS');
  });

  test('GET 401 without auth', async () => {
    const app = createTestApp(false); // No auth middleware
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-a' });
    
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  test('GET 404 unknown packId', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'nonexistent', videoId: 'video-a', format: 'json' });
    
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PACK_NOT_FOUND');
  });

  test('GET 409 videoId not in pack', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-z', format: 'json' });
    
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('VIDEO_NOT_IN_PACK');
  });

  test('GET 429 after 21st request in a minute', async () => {
    const app = createTestApp();
    
    // Make 20 successful requests
    for (let i = 0; i < 20; i++) {
      const response = await request(app)
        .get('/v1/playback/deeplink')
        .query({ packId: 'pack-001', videoId: 'video-a', format: 'json' });
      expect(response.status).toBe(200);
    }
    
    // 21st request should be rate limited
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-a', format: 'json' });
    
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.headers['retry-after']).toBeDefined();
  });

  test('GET 503 via __simulateDown(true)', async () => {
    const app = createTestApp();
    __simulateDown(true);
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-a', format: 'json' });
    
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  test('GET determinism: 3 identical JSON calls deep-equal', async () => {
    const app = createTestApp();
    
    const response1 = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-002', videoId: 'video-x', startSec: 15, format: 'json' });
    
    const response2 = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-002', videoId: 'video-x', startSec: 15, format: 'json' });
    
    const response3 = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-002', videoId: 'video-x', startSec: 15, format: 'json' });
    
    expect(response1.body).toEqual(response2.body);
    expect(response2.body).toEqual(response3.body);
    expect(response1.body).toEqual({
      url: 'https://www.youtube.com/watch?v=video-x&t=15s',
      version: 'v1',
    });
  });

  test('GET defaults startSec to 0', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-a', format: 'json' });
    
    expect(response.status).toBe(200);
    expect(response.body.url).toBe('https://www.youtube.com/watch?v=video-a&t=0s');
  });
});

// ============================================================================
// Test Suite: POST /v1/playback/complete
// ============================================================================

describe('POST /v1/playback/complete', () => {
  beforeEach(() => {
    setupTestPacks();
    __resetRate();
    __resetDone();
    __simulateDown(false);
  });

  test('POST happy: 202 accepted', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: 280,
        durationSec: 300,
        occurredAt: '2025-01-15T10:30:00.000Z',
      });
    
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ accepted: true, version: 'v1' });
  });

  test('POST 409 duplicate completion', async () => {
    const app = createTestApp();
    
    const payload = {
      packId: 'pack-001',
      videoId: 'video-b',
      watchedSec: 400,
      durationSec: 450,
      occurredAt: '2025-01-15T11:00:00.000Z',
    };
    
    // First request succeeds
    const response1 = await request(app)
      .post('/v1/playback/complete')
      .send(payload);
    expect(response1.status).toBe(202);
    
    // Second identical request returns 409
    const response2 = await request(app)
      .post('/v1/playback/complete')
      .send(payload);
    
    expect(response2.status).toBe(409);
    expect(response2.body.error.code).toBe('DUPLICATE_COMPLETION');
  });

  test('POST 400 invalid body: negative watchedSec', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: -50,
        durationSec: 300,
        occurredAt: '2025-01-15T10:30:00.000Z',
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_BODY');
  });

  test('POST 400 invalid body: durationSec <= 0', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: 100,
        durationSec: 0,
        occurredAt: '2025-01-15T10:30:00.000Z',
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_BODY');
  });

  test('POST 400 invalid body: bad ISO date', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: 100,
        durationSec: 300,
        occurredAt: 'not-a-date',
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_BODY');
  });

  test('POST 400 invalid body: missing required field', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: 100,
        // Missing durationSec
        occurredAt: '2025-01-15T10:30:00.000Z',
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_BODY');
  });

  test('POST 400 invalid body: extra field (strict mode)', async () => {
    const app = createTestApp();
    
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: 100,
        durationSec: 300,
        occurredAt: '2025-01-15T10:30:00.000Z',
        extraField: 'should-not-be-here',
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_BODY');
  });

  test('POST 401 without auth', async () => {
    const app = createTestApp(false); // No auth middleware
    
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: 100,
        durationSec: 300,
        occurredAt: '2025-01-15T10:30:00.000Z',
      });
    
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  test('POST 429 after 61st request in a minute', async () => {
    const app = createTestApp();
    
    // Make 60 successful requests
    for (let i = 0; i < 60; i++) {
      const response = await request(app)
        .post('/v1/playback/complete')
        .send({
          packId: 'pack-001',
          videoId: 'video-a',
          watchedSec: 100,
          durationSec: 300,
          occurredAt: `2025-01-15T10:30:${String(i).padStart(2, '0')}.000Z`,
        });
      expect(response.status).toBe(202);
    }
    
    // 61st request should be rate limited
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: 100,
        durationSec: 300,
        occurredAt: '2025-01-15T10:31:00.000Z',
      });
    
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.headers['retry-after']).toBe('60');
  });

  test('POST 503 via __simulateDown(true)', async () => {
    const app = createTestApp();
    __simulateDown(true);
    
    const response = await request(app)
      .post('/v1/playback/complete')
      .send({
        packId: 'pack-001',
        videoId: 'video-a',
        watchedSec: 100,
        durationSec: 300,
        occurredAt: '2025-01-15T10:30:00.000Z',
      });
    
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  test('POST idempotency only on exact match (packId, videoId, occurredAt)', async () => {
    const app = createTestApp();
    
    const basePayload = {
      packId: 'pack-001',
      videoId: 'video-c',
      watchedSec: 500,
      durationSec: 600,
      occurredAt: '2025-01-15T12:00:00.000Z',
    };
    
    // First request
    const response1 = await request(app)
      .post('/v1/playback/complete')
      .send(basePayload);
    expect(response1.status).toBe(202);
    
    // Same packId, videoId, occurredAt -> 409
    const response2 = await request(app)
      .post('/v1/playback/complete')
      .send(basePayload);
    expect(response2.status).toBe(409);
    
    // Different occurredAt -> 202
    const response3 = await request(app)
      .post('/v1/playback/complete')
      .send({ ...basePayload, occurredAt: '2025-01-15T12:00:01.000Z' });
    expect(response3.status).toBe(202);
    
    // Different videoId -> 202
    const response4 = await request(app)
      .post('/v1/playback/complete')
      .send({ ...basePayload, videoId: 'video-a' });
    expect(response4.status).toBe(202);
  });
});

// ============================================================================
// Test Suite: Error Response Format
// ============================================================================

describe('Error Response Format', () => {
  beforeEach(() => {
    setupTestPacks();
    __resetRate();
    __simulateDown(false);
  });

  test('All errors follow unified schema', async () => {
    const app = createTestApp();
    
    // Test 400 error
    const response400 = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001' }); // Missing videoId
    
    expect(response400.body).toHaveProperty('error');
    expect(response400.body.error).toHaveProperty('code');
    expect(response400.body.error).toHaveProperty('message');
    expect(response400.body.error).toHaveProperty('details');
    
    // Test 404 error
    const response404 = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'nonexistent', videoId: 'video-a', format: 'json' });
    
    expect(response404.body).toHaveProperty('error');
    expect(response404.body.error).toHaveProperty('code');
    expect(response404.body.error).toHaveProperty('message');
    expect(response404.body.error).toHaveProperty('details');
    
    // Test 409 error
    const response409 = await request(app)
      .get('/v1/playback/deeplink')
      .query({ packId: 'pack-001', videoId: 'video-z', format: 'json' });
    
    expect(response409.body).toHaveProperty('error');
    expect(response409.body.error).toHaveProperty('code');
    expect(response409.body.error).toHaveProperty('message');
    expect(response409.body.error).toHaveProperty('details');
  });
});
