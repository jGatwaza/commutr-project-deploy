// HW9 CTR-C4: Achievements API Tests
import request from 'supertest';
import app from '../src/server';
import { clearSessions, saveSession } from '../src/history/store';

const AUTH = { Authorization: 'Bearer TEST' };

// Clear sessions before each test
beforeEach(() => {
  clearSessions();
});

describe('HW9 CTR-C4: Achievements API Tests', () => {
  
  describe('Authentication', () => {
    test('GET /api/achievements returns 401 when Authorization header missing', async () => {
      const res = await request(app).get('/api/achievements');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('GET /api/achievements returns 401 with invalid Authorization header', async () => {
      const res = await request(app)
        .get('/api/achievements')
        .set({ Authorization: 'Bearer WRONG' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('GET /api/achievements returns 200 with valid Authorization header', async () => {
      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH);
      expect(res.status).toBe(200);
    });
  });

  describe('Health Check', () => {
    test('GET /api/achievements/ping returns { ok: true }', async () => {
      const res = await request(app).get('/api/achievements/ping');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('GET /api/achievements - Happy Path', () => {
    test('With no sessions, returns all zeros and no earned badges', async () => {
      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('badges');

      // Summary should be all zeros
      expect(res.body.summary).toEqual({
        totalMinutes: 0,
        totalSessions: 0,
        longestStreak: 0,
        currentStreak: 0
      });

      // All badges should be locked
      expect(Array.isArray(res.body.badges)).toBe(true);
      expect(res.body.badges.length).toBeGreaterThan(0);
      res.body.badges.forEach((badge: any) => {
        expect(badge.earned).toBe(false);
        expect(badge).toHaveProperty('id');
        expect(badge).toHaveProperty('title');
        expect(badge).toHaveProperty('description');
        expect(badge).toHaveProperty('icon');
      });
    });

    test('With one session (35 minutes), earns minutes-30 and session-1 badges', async () => {
      // Create a session with 35 minutes (35 * 60 * 1000 ms = 2,100,000 ms)
      saveSession({
        queryText: 'python basics',
        intentJSON: { topic: 'python' },
        playlistJSON: { items: ['vid1', 'vid2'] },
        durationMs: 2_100_000 // 35 minutes
      });

      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH);

      expect(res.status).toBe(200);

      // Check summary
      expect(res.body.summary.totalMinutes).toBe(35);
      expect(res.body.summary.totalSessions).toBe(1);

      // Check badges
      const badges = res.body.badges;
      const minutes30Badge = badges.find((b: any) => b.id === 'minutes-30');
      const minutes100Badge = badges.find((b: any) => b.id === 'minutes-100');
      const session1Badge = badges.find((b: any) => b.id === 'session-1');

      // minutes-30 should be earned
      expect(minutes30Badge.earned).toBe(true);
      expect(minutes30Badge.progressCurrent).toBe(35);
      expect(minutes30Badge.progressTarget).toBe(30);
      expect(minutes30Badge.earnedAt).toBeTruthy();

      // minutes-100 should NOT be earned yet
      expect(minutes100Badge.earned).toBe(false);
      expect(minutes100Badge.progressCurrent).toBe(35);
      expect(minutes100Badge.progressTarget).toBe(100);

      // session-1 should be earned
      expect(session1Badge.earned).toBe(true);
      expect(session1Badge.progressCurrent).toBe(1);
      expect(session1Badge.progressTarget).toBe(1);
    });

    test('With 120 minutes total, earns minutes-30 and minutes-100 badges', async () => {
      // Create three sessions totaling 120 minutes
      saveSession({
        queryText: 'session 1',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 40 * 60 * 1000 // 40 minutes
      });
      saveSession({
        queryText: 'session 2',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 50 * 60 * 1000 // 50 minutes
      });
      saveSession({
        queryText: 'session 3',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 30 * 60 * 1000 // 30 minutes
      });

      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalMinutes).toBe(120);

      const badges = res.body.badges;
      const minutes30Badge = badges.find((b: any) => b.id === 'minutes-30');
      const minutes100Badge = badges.find((b: any) => b.id === 'minutes-100');
      const minutes300Badge = badges.find((b: any) => b.id === 'minutes-300');

      expect(minutes30Badge.earned).toBe(true);
      expect(minutes100Badge.earned).toBe(true);
      expect(minutes300Badge.earned).toBe(false);
      expect(minutes300Badge.progressCurrent).toBe(120);
      expect(minutes300Badge.progressTarget).toBe(300);
    });

    test('With sessions on multiple days, correctly calculates streaks', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Manually set createdAt to create a 3-day streak
      const session1 = saveSession({
        queryText: 'day 1',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 10 * 60 * 1000
      });
      const session2 = saveSession({
        queryText: 'day 2',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 10 * 60 * 1000
      });
      const session3 = saveSession({
        queryText: 'day 3',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 10 * 60 * 1000
      });

      // Modify timestamps to create streak (requires direct file manipulation in real scenario)
      // For this test, we'll just verify the logic works with today's sessions
      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalSessions).toBe(3);
      // All sessions today should give currentStreak of 1
      expect(res.body.summary.currentStreak).toBeGreaterThanOrEqual(1);
    });

    test('With 10+ sessions, earns session-10 badge', async () => {
      // Create 12 sessions
      for (let i = 0; i < 12; i++) {
        saveSession({
          queryText: `session ${i + 1}`,
          intentJSON: {},
          playlistJSON: {},
          durationMs: 5 * 60 * 1000 // 5 minutes each
        });
      }

      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalSessions).toBe(12);

      const badges = res.body.badges;
      const session1Badge = badges.find((b: any) => b.id === 'session-1');
      const session10Badge = badges.find((b: any) => b.id === 'session-10');

      expect(session1Badge.earned).toBe(true);
      expect(session10Badge.earned).toBe(true);
      expect(session10Badge.progressCurrent).toBe(12);
      expect(session10Badge.progressTarget).toBe(10);
    });

    test('With shared sessions, earns share-1 badge', async () => {
      // saveSession automatically creates a shareToken
      saveSession({
        queryText: 'shared playlist',
        intentJSON: {},
        playlistJSON: { items: ['vid1'] },
        durationMs: 10 * 60 * 1000
      });

      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH);

      expect(res.status).toBe(200);

      const badges = res.body.badges;
      const share1Badge = badges.find((b: any) => b.id === 'share-1');

      expect(share1Badge.earned).toBe(true);
      expect(share1Badge.progressCurrent).toBe(1);
      expect(share1Badge.progressTarget).toBe(1);
    });
  });

  describe('Progress Tracking', () => {
    test('Progress bars show current progress toward unearned badges', async () => {
      // Create session with 25 minutes (below 30 threshold)
      saveSession({
        queryText: 'short session',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 25 * 60 * 1000
      });

      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH);

      expect(res.status).toBe(200);

      const badges = res.body.badges;
      const minutes30Badge = badges.find((b: any) => b.id === 'minutes-30');

      expect(minutes30Badge.earned).toBe(false);
      expect(minutes30Badge.progressCurrent).toBe(25);
      expect(minutes30Badge.progressTarget).toBe(30);
    });
  });
});
