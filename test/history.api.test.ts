import request from 'supertest';
import app from '../src/server';
import { clearSessions } from '../src/history/store';

const AUTH = { Authorization: 'Bearer TEST' };

// Clear sessions before each test
beforeEach(() => {
  clearSessions();
});

describe('History API Tests', () => {
  
  describe('Authentication', () => {
    test('POST /api/history returns 401 when Authorization header missing', async () => {
      const res = await request(app)
        .post('/api/history')
        .send({ queryText: 'test', intent: {}, playlist: {}, durationMs: 1000 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('GET /api/history returns 401 when Authorization header missing', async () => {
      const res = await request(app).get('/api/history');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('GET /api/history/:id returns 401 when Authorization header missing', async () => {
      const res = await request(app).get('/api/history/test-id');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('POST /api/history returns 401 with invalid Authorization header', async () => {
      const res = await request(app)
        .post('/api/history')
        .set({ Authorization: 'Bearer WRONG' })
        .send({ queryText: 'test', intent: {}, playlist: {}, durationMs: 1000 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });
  });

  describe('POST /api/history', () => {
    test('POST /api/history with valid body returns id and shareToken', async () => {
      const res = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'science 10 min',
          intent: { topic: 'science', duration: 600 },
          playlist: { items: [] },
          durationMs: 4200
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('shareToken');
      expect(typeof res.body.id).toBe('string');
      expect(typeof res.body.shareToken).toBe('string');
      expect(res.body.id.length).toBeGreaterThan(0);
      expect(res.body.shareToken.length).toBeGreaterThan(0);
    });

    test('POST /api/history validates queryText is non-empty', async () => {
      const res = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: '',
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('queryText');
    });

    test('POST /api/history validates durationMs is positive integer', async () => {
      const res = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'test',
          intent: {},
          playlist: {},
          durationMs: -100
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('positive');
    });

    test('POST /api/history validates durationMs is an integer', async () => {
      const res = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'test',
          intent: {},
          playlist: {},
          durationMs: 100.5
        });
      
      expect(res.status).toBe(400);
    });

    test('POST /api/history returns 400 when queryText is missing', async () => {
      const res = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      expect(res.status).toBe(400);
    });

    test('POST /api/history returns 400 when durationMs is missing', async () => {
      const res = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'test',
          intent: {},
          playlist: {}
        });
      
      expect(res.status).toBe(400);
    });

    test('POST /api/history accepts intent as unknown type', async () => {
      const res = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'test',
          intent: { complex: { nested: 'object' } },
          playlist: {},
          durationMs: 1000
        });
      
      expect(res.status).toBe(200);
    });

    test('POST /api/history accepts playlist as unknown type', async () => {
      const res = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'test',
          intent: {},
          playlist: { items: [{ id: 1 }, { id: 2 }] },
          durationMs: 1000
        });
      
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/history', () => {
    test('GET /api/history returns empty array when no sessions', async () => {
      const res = await request(app)
        .get('/api/history')
        .set(AUTH);
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('GET /api/history returns new session after POST', async () => {
      // Create a session
      const postRes = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'python tutorial',
          intent: {},
          playlist: {},
          durationMs: 5000
        });
      
      const { id } = postRes.body;
      
      // List sessions
      const getRes = await request(app)
        .get('/api/history')
        .set(AUTH);
      
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBe(1);
      expect(getRes.body[0]).toMatchObject({
        id,
        queryText: 'python tutorial'
      });
      expect(getRes.body[0]).toHaveProperty('createdAt');
    });

    test('GET /api/history returns sessions in newest-first order', async () => {
      // Create multiple sessions
      await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'first session',
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'second session',
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      const res = await request(app)
        .get('/api/history')
        .set(AUTH);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].queryText).toBe('second session');
      expect(res.body[1].queryText).toBe('first session');
    });

    test('GET /api/history respects limit parameter', async () => {
      // Create 3 sessions
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/history')
          .set(AUTH)
          .send({
            queryText: `session ${i}`,
            intent: {},
            playlist: {},
            durationMs: 1000
          });
      }
      
      const res = await request(app)
        .get('/api/history?limit=2')
        .set(AUTH);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    test('GET /api/history filters by query text with q parameter', async () => {
      // Create sessions with different queries
      await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'python tutorial',
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'javascript basics',
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      const res = await request(app)
        .get('/api/history?q=python')
        .set(AUTH);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].queryText).toBe('python tutorial');
    });

    test('GET /api/history filters by since parameter', async () => {
      // Create a session
      await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'old session',
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get current time after waiting
      const now = new Date().toISOString();
      
      // Wait again to ensure new session is after timestamp
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Create another session
      await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'new session',
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      const res = await request(app)
        .get(`/api/history?since=${now}`)
        .set(AUTH);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].queryText).toBe('new session');
    });
  });

  describe('GET /api/history/:id', () => {
    test('GET /api/history/:id returns full session details', async () => {
      // Create a session
      const postRes = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'cooking tutorial',
          intent: { topic: 'cooking', duration: 600 },
          playlist: { items: [{ id: 1 }] },
          durationMs: 7500
        });
      
      const { id } = postRes.body;
      
      // Get details
      const getRes = await request(app)
        .get(`/api/history/${id}`)
        .set(AUTH);
      
      expect(getRes.status).toBe(200);
      expect(getRes.body).toMatchObject({
        id,
        queryText: 'cooking tutorial',
        intent: { topic: 'cooking', duration: 600 },
        playlist: { items: [{ id: 1 }] }
      });
      expect(getRes.body).toHaveProperty('createdAt');
      expect(getRes.body).toHaveProperty('shareToken');
    });

    test('GET /api/history/:id returns 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/history/non-existent-id')
        .set(AUTH);
      
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('GET /api/share/:token', () => {
    test('GET /api/share/:token returns public data without auth', async () => {
      // Create a session
      const postRes = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'shared playlist',
          intent: {},
          playlist: { items: [{ videoId: 'abc123' }] },
          durationMs: 3000
        });
      
      const { shareToken } = postRes.body;
      
      // Access via share token (no auth)
      const shareRes = await request(app)
        .get(`/api/share/${shareToken}`);
      
      expect(shareRes.status).toBe(200);
      expect(shareRes.body).toEqual({
        queryText: 'shared playlist',
        playlist: { items: [{ videoId: 'abc123' }] }
      });
    });

    test('GET /api/share/:token returns 404 for invalid token', async () => {
      const res = await request(app)
        .get('/api/share/invalid-token-xyz');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    test('GET /api/share/:token does not require authentication', async () => {
      // Create a session
      const postRes = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'public share',
          intent: {},
          playlist: {},
          durationMs: 1000
        });
      
      const { shareToken } = postRes.body;
      
      // Try to access without auth header
      const res = await request(app)
        .get(`/api/share/${shareToken}`);
      
      expect(res.status).toBe(200);
    });
  });

  describe('Integration: Full workflow', () => {
    test('Complete workflow: create, list, get detail, share', async () => {
      // 1. Create a session
      const createRes = await request(app)
        .post('/api/history')
        .set(AUTH)
        .send({
          queryText: 'machine learning basics',
          intent: { topic: 'ml', duration: 900 },
          playlist: { items: [{ id: 1 }, { id: 2 }], totalDurationSec: 900 },
          durationMs: 15000
        });
      
      expect(createRes.status).toBe(200);
      const { id, shareToken } = createRes.body;
      
      // 2. List sessions
      const listRes = await request(app)
        .get('/api/history')
        .set(AUTH);
      
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].id).toBe(id);
      
      // 3. Get full details
      const detailRes = await request(app)
        .get(`/api/history/${id}`)
        .set(AUTH);
      
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.queryText).toBe('machine learning basics');
      expect(detailRes.body.intent).toEqual({ topic: 'ml', duration: 900 });
      
      // 4. Access via share token
      const shareRes = await request(app)
        .get(`/api/share/${shareToken}`);
      
      expect(shareRes.status).toBe(200);
      expect(shareRes.body.queryText).toBe('machine learning basics');
      expect(shareRes.body.playlist).toEqual({ items: [{ id: 1 }, { id: 2 }], totalDurationSec: 900 });
    });
  });
});
