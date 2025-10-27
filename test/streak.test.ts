import request from 'supertest';
import app from '../src/server';
import { resetSessions, calculateStreak } from '../src/web/streak';

const AUTH = { Authorization: 'Bearer TEST' };

// Reset sessions before each test
beforeEach(() => {
  resetSessions();
});

describe('Streak Service Tests', () => {
  
  describe('Authentication', () => {
    test('POST /api/session returns 401 when Authorization header missing', async () => {
      const res = await request(app)
        .post('/api/session')
        .send({ topic: 'science', minutes: 15 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('GET /api/streak returns 401 when Authorization header missing', async () => {
      const res = await request(app).get('/api/streak');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('POST /api/session returns 401 with invalid Authorization header', async () => {
      const res = await request(app)
        .post('/api/session')
        .set({ Authorization: 'Bearer WRONG' })
        .send({ topic: 'science', minutes: 15 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });
  });

  describe('POST /api/session', () => {
    test('POST /api/session with valid body returns { ok: true }', async () => {
      const res = await request(app)
        .post('/api/session')
        .set(AUTH)
        .send({ topic: 'science', minutes: 15 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    test('POST /api/session validates topic is non-empty', async () => {
      const res = await request(app)
        .post('/api/session')
        .set(AUTH)
        .send({ topic: '', minutes: 15 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('non-empty');
    });

    test('POST /api/session validates minutes is integer', async () => {
      const res = await request(app)
        .post('/api/session')
        .set(AUTH)
        .send({ topic: 'math', minutes: 15.5 });
      expect(res.status).toBe(400);
    });

    test('POST /api/session validates minutes is between 1 and 180', async () => {
      const res1 = await request(app)
        .post('/api/session')
        .set(AUTH)
        .send({ topic: 'math', minutes: 0 });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/session')
        .set(AUTH)
        .send({ topic: 'math', minutes: 181 });
      expect(res2.status).toBe(400);
    });
  });

  describe('GET /api/streak', () => {
    test('GET /api/streak with no sessions returns zeros', async () => {
      const res = await request(app)
        .get('/api/streak')
        .set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalSessions: 0,
        totalMinutes: 0,
        currentStreakDays: 0,
        lastSessionISO: null
      });
    });

    test('After two valid POSTs, GET /api/streak returns correct totalSessions and totalMinutes', async () => {
      // Post first session
      await request(app)
        .post('/api/session')
        .set(AUTH)
        .send({ topic: 'science', minutes: 15 });

      // Post second session
      await request(app)
        .post('/api/session')
        .set(AUTH)
        .send({ topic: 'math', minutes: 20 });

      // Get streak
      const res = await request(app)
        .get('/api/streak')
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.totalSessions).toBe(2);
      expect(res.body.totalMinutes).toBe(35);
      expect(res.body.lastSessionISO).toBeTruthy();
      expect(typeof res.body.lastSessionISO).toBe('string');
    });
  });

  describe('Streak Calculation - Bug Fix CTR-202', () => {
    test('Scenario A: One session today and one yesterday → streak = 2', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const sessions = [
        {
          ts: yesterday.toISOString(),
          topic: 'science',
          minutes: 10
        },
        {
          ts: today.toISOString(),
          topic: 'math',
          minutes: 15
        }
      ];

      const stats = calculateStreak(sessions);
      expect(stats.currentStreakDays).toBe(2);
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalMinutes).toBe(25);
    });

    test('Scenario B: One session today and one two days ago (skip yesterday) → streak = 1', () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const sessions = [
        {
          ts: twoDaysAgo.toISOString(),
          topic: 'science',
          minutes: 10
        },
        {
          ts: today.toISOString(),
          topic: 'math',
          minutes: 15
        }
      ];

      const stats = calculateStreak(sessions);
      // Streak should be 1 because yesterday was missing (gap in streak)
      expect(stats.currentStreakDays).toBe(1);
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalMinutes).toBe(25);
    });

    test('No session today → streak = 0', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const sessions = [
        {
          ts: twoDaysAgo.toISOString(),
          topic: 'history',
          minutes: 10
        },
        {
          ts: yesterday.toISOString(),
          topic: 'science',
          minutes: 15
        }
      ];

      const stats = calculateStreak(sessions);
      // Streak should be 0 because there's no session today
      expect(stats.currentStreakDays).toBe(0);
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalMinutes).toBe(25);
    });

    test('Multiple sessions on same day count as one streak day', () => {
      const today = new Date();

      const sessions = [
        {
          ts: today.toISOString(),
          topic: 'science',
          minutes: 10
        },
        {
          ts: new Date(today.getTime() + 3600000).toISOString(), // 1 hour later
          topic: 'math',
          minutes: 15
        }
      ];

      const stats = calculateStreak(sessions);
      expect(stats.currentStreakDays).toBe(1);
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalMinutes).toBe(25);
    });

    test('Three consecutive days calculates correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const sessions = [
        {
          ts: twoDaysAgo.toISOString(),
          topic: 'history',
          minutes: 10
        },
        {
          ts: yesterday.toISOString(),
          topic: 'science',
          minutes: 15
        },
        {
          ts: today.toISOString(),
          topic: 'math',
          minutes: 20
        }
      ];

      const stats = calculateStreak(sessions);
      expect(stats.currentStreakDays).toBe(3);
      expect(stats.totalSessions).toBe(3);
      expect(stats.totalMinutes).toBe(45);
    });
  });
});
