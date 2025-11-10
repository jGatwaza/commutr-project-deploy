import request from 'supertest';
import app from '../../src/server.js';
import { clearWatched } from '../../src/history/watchHistory.js';

const AUTH = { Authorization: 'Bearer TEST' };

beforeEach(() => {
  clearWatched();
});

describe('Watch History API Tests', () => {
  
  describe('POST /api/history/watch', () => {
    test('happy path: creates entry and returns 201', async () => {
      const res = await request(app)
        .post('/api/history/watch')
        .set(AUTH)
        .send({
          userId: 'u_123',
          videoId: 'yt_abc',
          title: 'How CPUs Work',
          durationSec: 842,
          completedAt: '2025-11-10T19:14:02.000Z',
          progressPct: 100,
          source: 'youtube'
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe('u_123');
      expect(res.body.videoId).toBe('yt_abc');
    });

    test('older completion does not override newer', async () => {
      // First: newer completion
      await request(app)
        .post('/api/history/watch')
        .set(AUTH)
        .send({
          userId: 'u_123',
          videoId: 'yt_abc',
          title: 'Test',
          durationSec: 600,
          completedAt: '2025-11-10T19:00:00.000Z',
          progressPct: 100
        });
      
      // Second: older completion
      const res = await request(app)
        .post('/api/history/watch')
        .set(AUTH)
        .send({
          userId: 'u_123',
          videoId: 'yt_abc',
          title: 'Test',
          durationSec: 600,
          completedAt: '2025-11-10T18:00:00.000Z',
          progressPct: 50
        });
      
      expect(res.status).toBe(201);
      expect(res.body.completedAt).toBe('2025-11-10T19:00:00.000Z');
      expect(res.body.progressPct).toBe(100);
    });

    test('newer completion updates existing', async () => {
      // First: older
      await request(app)
        .post('/api/history/watch')
        .set(AUTH)
        .send({
          userId: 'u_123',
          videoId: 'yt_abc',
          title: 'Test',
          durationSec: 600,
          completedAt: '2025-11-10T18:00:00.000Z',
          progressPct: 80
        });
      
      // Second: newer
      const res = await request(app)
        .post('/api/history/watch')
        .set(AUTH)
        .send({
          userId: 'u_123',
          videoId: 'yt_abc',
          title: 'Test Updated',
          durationSec: 600,
          completedAt: '2025-11-10T19:00:00.000Z',
          progressPct: 100
        });
      
      expect(res.status).toBe(201);
      expect(res.body.completedAt).toBe('2025-11-10T19:00:00.000Z');
      expect(res.body.title).toBe('Test Updated');
    });

    test('invalid body returns 400 with issues', async () => {
      const res = await request(app)
        .post('/api/history/watch')
        .set(AUTH)
        .send({
          userId: '',
          videoId: 'yt_abc',
          title: 'Test'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid input');
      expect(res.body.issues).toBeDefined();
    });

    test('missing required fields returns 400', async () => {
      const res = await request(app)
        .post('/api/history/watch')
        .set(AUTH)
        .send({
          userId: 'u_123',
          videoId: 'yt_abc'
          // missing title and durationSec
        });
      
      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    test('requires authentication', async () => {
      const res = await request(app)
        .post('/api/history/watch')
        .send({
          userId: 'u_123',
          videoId: 'yt_abc',
          title: 'Test',
          durationSec: 600
        });
      
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/history/watch', () => {
    test('returns empty items when no entries exist', async () => {
      const res = await request(app)
        .get('/api/history/watch?userId=u_123')
        .set(AUTH);
      
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.nextCursor).toBeUndefined();
    });

    test('paginates with limit=2 without duplicates', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/history/watch')
          .set(AUTH)
          .send({
            userId: 'u_123',
            videoId: `yt_${i}`,
            title: `Video ${i}`,
            durationSec: 600,
            completedAt: `2025-11-10T${19-i}:00:00.000Z`
          });
      }
      
      const page1 = await request(app)
        .get('/api/history/watch?userId=u_123&limit=2')
        .set(AUTH);
      
      expect(page1.status).toBe(200);
      expect(page1.body.items.length).toBe(2);
      expect(page1.body.nextCursor).toBeDefined();
      
      const page2 = await request(app)
        .get(`/api/history/watch?userId=u_123&limit=2&cursor=${page1.body.nextCursor}`)
        .set(AUTH);
      
      expect(page2.body.items.length).toBe(2);
      
      const allIds = [...page1.body.items, ...page2.body.items].map((i: any) => i.id);
      expect(new Set(allIds).size).toBe(4);
    });

    test('filters by title with q parameter', async () => {
      await request(app).post('/api/history/watch').set(AUTH).send({
        userId: 'u_123', videoId: 'yt_1', title: 'Python Tutorial', durationSec: 600
      });
      
      await request(app).post('/api/history/watch').set(AUTH).send({
        userId: 'u_123', videoId: 'yt_2', title: 'JavaScript Basics', durationSec: 300
      });
      
      const res = await request(app)
        .get('/api/history/watch?userId=u_123&q=python')
        .set(AUTH);
      
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].title).toContain('Python');
    });

    test('invalid userId returns 400', async () => {
      const res = await request(app)
        .get('/api/history/watch?userId=')
        .set(AUTH);
      
      expect(res.status).toBe(400);
    });

    test('missing userId returns 400', async () => {
      const res = await request(app)
        .get('/api/history/watch')
        .set(AUTH);
      
      expect(res.status).toBe(400);
    });

    test('invalid limit returns 400', async () => {
      const res = await request(app)
        .get('/api/history/watch?userId=u_123&limit=200')
        .set(AUTH);
      
      expect(res.status).toBe(400);
    });

    test('requires authentication', async () => {
      const res = await request(app)
        .get('/api/history/watch?userId=u_123');
      
      expect(res.status).toBe(401);
    });
  });
});