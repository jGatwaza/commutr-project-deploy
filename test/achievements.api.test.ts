// HW9 CTR-C4: Achievements API Tests
import request from 'supertest';
import app from '../src/server.js';
import { saveCommuteSession, type CommuteSession } from '../src/history/commuteHistory.js';
import fs from 'fs';
import path from 'path';

const AUTH = { Authorization: 'Bearer TEST' };
const TEST_USER_ID = 'testUser';
const HISTORY_FILE = path.join(process.cwd(), 'data', 'commute-history.json');

// Helper to create mock commute
function createMockCommute(overrides: Partial<CommuteSession> = {}): CommuteSession {
  return {
    id: `commute-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    topics: ['test'],
    durationSec: 300,
    videosWatched: [],
    ...overrides
  };
}

// Clear commute history before each test
beforeEach(() => {
  if (fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({}), 'utf-8');
  }
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
    test('With no commutes, returns all zeros and no earned badges', async () => {
      const res = await request(app)
        .get(`/api/achievements?userId=${TEST_USER_ID}`)
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

    test('With one commute (35 minutes), earns minutes-30 and commute-1 badges', async () => {
      // Create a commute with 35 minutes (35 * 60 seconds = 2,100 seconds)
      saveCommuteSession(TEST_USER_ID, createMockCommute({
        topics: ['python'],
        durationSec: 2_100 // 35 minutes
      }));

      const res = await request(app)
        .get(`/api/achievements?userId=${TEST_USER_ID}`)
        .set(AUTH);

      expect(res.status).toBe(200);

      // Check summary
      expect(res.body.summary.totalMinutes).toBe(35);
      expect(res.body.summary.totalSessions).toBe(1);

      // Check badges
      const badges = res.body.badges;
      const minutes30Badge = badges.find((b: any) => b.id === 'minutes-30');
      const minutes100Badge = badges.find((b: any) => b.id === 'minutes-100');
      const commute1Badge = badges.find((b: any) => b.id === 'commute-1');

      // minutes-30 should be earned
      expect(minutes30Badge.earned).toBe(true);
      expect(minutes30Badge.progressCurrent).toBe(35);
      expect(minutes30Badge.progressTarget).toBe(30);
      expect(minutes30Badge.earnedAt).toBeTruthy();

      // minutes-100 should NOT be earned yet
      expect(minutes100Badge.earned).toBe(false);
      expect(minutes100Badge.progressCurrent).toBe(35);
      expect(minutes100Badge.progressTarget).toBe(100);

      // commute-1 should be earned
      expect(commute1Badge.earned).toBe(true);
      expect(commute1Badge.progressCurrent).toBe(1);
      expect(commute1Badge.progressTarget).toBe(1);
    });

    test('With 120 minutes total, earns minutes-30 and minutes-100 badges', async () => {
      // Create three commutes totaling 120 minutes
      saveCommuteSession(TEST_USER_ID, createMockCommute({ durationSec: 40 * 60 }));
      saveCommuteSession(TEST_USER_ID, createMockCommute({ durationSec: 50 * 60 }));
      saveCommuteSession(TEST_USER_ID, createMockCommute({ durationSec: 30 * 60 }));

      const res = await request(app)
        .get(`/api/achievements?userId=${TEST_USER_ID}`)
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalMinutes).toBe(120);
      expect(res.body.summary.totalSessions).toBe(3);

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

    test('With commutes on multiple days, correctly calculates streaks', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Create commutes on 3 consecutive days
      saveCommuteSession(TEST_USER_ID, createMockCommute({
        timestamp: twoDaysAgo.toISOString(),
        durationSec: 10 * 60
      }));
      saveCommuteSession(TEST_USER_ID, createMockCommute({
        timestamp: yesterday.toISOString(),
        durationSec: 10 * 60
      }));
      saveCommuteSession(TEST_USER_ID, createMockCommute({
        timestamp: today.toISOString(),
        durationSec: 10 * 60
      }));

      const res = await request(app)
        .get(`/api/achievements?userId=${TEST_USER_ID}`)
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalSessions).toBe(3);
      // Should have at least a 3-day streak
      expect(res.body.summary.currentStreak).toBeGreaterThanOrEqual(3);
      expect(res.body.summary.longestStreak).toBeGreaterThanOrEqual(3);
    });

    test('With 5 commutes, earns commute-5 badge', async () => {
      // Create 5 commutes (MAX_COMMUTES_PER_USER limit)
      for (let i = 0; i < 5; i++) {
        saveCommuteSession(TEST_USER_ID, createMockCommute({
          durationSec: 5 * 60 // 5 minutes each
        }));
      }

      const res = await request(app)
        .get(`/api/achievements?userId=${TEST_USER_ID}`)
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalSessions).toBe(5);

      const badges = res.body.badges;
      const commute1Badge = badges.find((b: any) => b.id === 'commute-1');
      const commute5Badge = badges.find((b: any) => b.id === 'commute-5');

      expect(commute1Badge.earned).toBe(true);
      expect(commute5Badge.earned).toBe(true);
      expect(commute5Badge.progressCurrent).toBe(5);
      expect(commute5Badge.progressTarget).toBe(5);
    });

  });

  describe('Progress Tracking', () => {
    test('Progress bars show current progress toward unearned badges', async () => {
      // Create commute with 25 minutes (below 30 threshold)
      saveCommuteSession(TEST_USER_ID, createMockCommute({
        durationSec: 25 * 60
      }));

      const res = await request(app)
        .get(`/api/achievements?userId=${TEST_USER_ID}`)
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
