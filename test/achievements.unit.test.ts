// HW9 CTR-C4: Achievements Service Unit Tests
import { computeAchievements } from '../src/achievements/service';
import { clearSessions, saveSession } from '../src/history/store';

// Clear sessions before each test
beforeEach(() => {
  clearSessions();
});

describe('HW9 CTR-C4: Achievements Service Unit Tests', () => {
  
  describe('computeAchievements() - Basic Functionality', () => {
    test('Returns correct structure with summary and badges', async () => {
      const result = await computeAchievements();

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('badges');
      
      expect(result.summary).toHaveProperty('totalMinutes');
      expect(result.summary).toHaveProperty('totalSessions');
      expect(result.summary).toHaveProperty('longestStreak');
      expect(result.summary).toHaveProperty('currentStreak');

      expect(Array.isArray(result.badges)).toBe(true);
      expect(result.badges.length).toBeGreaterThan(0);
    });

    test('Each badge has required fields', async () => {
      const result = await computeAchievements();

      result.badges.forEach(badge => {
        expect(badge).toHaveProperty('id');
        expect(badge).toHaveProperty('title');
        expect(badge).toHaveProperty('description');
        expect(badge).toHaveProperty('icon');
        expect(badge).toHaveProperty('earned');
        expect(typeof badge.earned).toBe('boolean');
        
        if (badge.earned) {
          expect(badge).toHaveProperty('earnedAt');
        }
        
        expect(badge).toHaveProperty('progressCurrent');
        expect(badge).toHaveProperty('progressTarget');
      });
    });
  });

  describe('Summary Stats - Zero State', () => {
    test('With no sessions, returns all zeros', async () => {
      const result = await computeAchievements();

      expect(result.summary).toEqual({
        totalMinutes: 0,
        totalSessions: 0,
        longestStreak: 0,
        currentStreak: 0
      });
    });

    test('With no sessions, all badges are locked', async () => {
      const result = await computeAchievements();

      result.badges.forEach(badge => {
        expect(badge.earned).toBe(false);
        expect(badge.earnedAt).toBeUndefined();
      });
    });
  });

  describe('Summary Stats - With Sessions', () => {
    test('Correctly calculates totalMinutes from durationMs', async () => {
      // Create sessions with known durations
      saveSession({
        queryText: 'test1',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 15 * 60 * 1000 // 15 minutes
      });
      saveSession({
        queryText: 'test2',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 25 * 60 * 1000 // 25 minutes
      });

      const result = await computeAchievements();

      expect(result.summary.totalMinutes).toBe(40);
      expect(result.summary.totalSessions).toBe(2);
    });

    test('Rounds down partial minutes', async () => {
      // Create session with 10.5 minutes worth of milliseconds
      saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 10.5 * 60 * 1000 // 10 minutes 30 seconds
      });

      const result = await computeAchievements();

      // Should round down to 10
      expect(result.summary.totalMinutes).toBe(10);
    });
  });

  describe('Badge Thresholds - Minutes Badges', () => {
    test('minutes-30 badge unlocks at exactly 30 minutes', async () => {
      saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 30 * 60 * 1000
      });

      const result = await computeAchievements();
      const badge = result.badges.find(b => b.id === 'minutes-30');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(30);
      expect(badge?.progressTarget).toBe(30);
    });

    test('minutes-30 badge locked below 30 minutes', async () => {
      saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 29 * 60 * 1000
      });

      const result = await computeAchievements();
      const badge = result.badges.find(b => b.id === 'minutes-30');

      expect(badge?.earned).toBe(false);
      expect(badge?.progressCurrent).toBe(29);
      expect(badge?.progressTarget).toBe(30);
    });

    test('minutes-100 badge unlocks at 100+ minutes', async () => {
      // Create multiple sessions totaling 105 minutes
      saveSession({ queryText: 'test1', intentJSON: {}, playlistJSON: {}, durationMs: 50 * 60 * 1000 });
      saveSession({ queryText: 'test2', intentJSON: {}, playlistJSON: {}, durationMs: 55 * 60 * 1000 });

      const result = await computeAchievements();
      const badge = result.badges.find(b => b.id === 'minutes-100');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(105);
    });

    test('minutes-300 badge unlocks at 300+ minutes', async () => {
      // Create sessions totaling 310 minutes
      for (let i = 0; i < 31; i++) {
        saveSession({
          queryText: `test${i}`,
          intentJSON: {},
          playlistJSON: {},
          durationMs: 10 * 60 * 1000 // 10 minutes each
        });
      }

      const result = await computeAchievements();
      const badge = result.badges.find(b => b.id === 'minutes-300');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(310);
    });
  });

  describe('Badge Thresholds - Session Badges', () => {
    test('session-1 badge unlocks with first session', async () => {
      saveSession({
        queryText: 'first',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 5 * 60 * 1000
      });

      const result = await computeAchievements();
      const badge = result.badges.find(b => b.id === 'session-1');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(1);
    });

    test('session-10 badge unlocks with 10+ sessions', async () => {
      for (let i = 0; i < 10; i++) {
        saveSession({
          queryText: `session${i}`,
          intentJSON: {},
          playlistJSON: {},
          durationMs: 5 * 60 * 1000
        });
      }

      const result = await computeAchievements();
      const badge = result.badges.find(b => b.id === 'session-10');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(10);
    });

    test('session-10 badge locked with 9 sessions', async () => {
      for (let i = 0; i < 9; i++) {
        saveSession({
          queryText: `session${i}`,
          intentJSON: {},
          playlistJSON: {},
          durationMs: 5 * 60 * 1000
        });
      }

      const result = await computeAchievements();
      const badge = result.badges.find(b => b.id === 'session-10');

      expect(badge?.earned).toBe(false);
      expect(badge?.progressCurrent).toBe(9);
    });
  });

  describe('Badge Thresholds - Share Badge', () => {
    test('share-1 badge unlocks when session has shareToken', async () => {
      // saveSession automatically creates a shareToken
      saveSession({
        queryText: 'shared',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 5 * 60 * 1000
      });

      const result = await computeAchievements();
      const badge = result.badges.find(b => b.id === 'share-1');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(1);
    });
  });

  describe('Badge Thresholds - Streak Badges', () => {
    test('streak badges use longestStreak for progress', async () => {
      // Create one session (streak of 1 day if today)
      saveSession({
        queryText: 'today',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 10 * 60 * 1000
      });

      const result = await computeAchievements();
      const streak3Badge = result.badges.find(b => b.id === 'streak-3');
      const streak7Badge = result.badges.find(b => b.id === 'streak-7');

      // With only today's session, longest streak should be 1
      expect(result.summary.longestStreak).toBeGreaterThanOrEqual(1);
      expect(streak3Badge?.progressCurrent).toBe(result.summary.longestStreak);
      expect(streak7Badge?.progressCurrent).toBe(result.summary.longestStreak);
    });
  });

  describe('earnedAt Timestamps', () => {
    test('Earned badges have earnedAt timestamp', async () => {
      saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 35 * 60 * 1000 // Earns minutes-30 and session-1
      });

      const result = await computeAchievements();
      const minutes30Badge = result.badges.find(b => b.id === 'minutes-30');
      const session1Badge = result.badges.find(b => b.id === 'session-1');

      expect(minutes30Badge?.earned).toBe(true);
      expect(minutes30Badge?.earnedAt).toBeTruthy();
      expect(typeof minutes30Badge?.earnedAt).toBe('string');

      expect(session1Badge?.earned).toBe(true);
      expect(session1Badge?.earnedAt).toBeTruthy();
    });

    test('Unearned badges have no earnedAt timestamp', async () => {
      saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 15 * 60 * 1000 // Below 30 minute threshold
      });

      const result = await computeAchievements();
      const minutes30Badge = result.badges.find(b => b.id === 'minutes-30');

      expect(minutes30Badge?.earned).toBe(false);
      expect(minutes30Badge?.earnedAt).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('Handles sessions with 0 duration', async () => {
      saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 0
      });

      const result = await computeAchievements();

      expect(result.summary.totalMinutes).toBe(0);
      expect(result.summary.totalSessions).toBe(1);
    });

    test('Handles very large duration values', async () => {
      // 1000 minutes
      saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000 * 60 * 1000
      });

      const result = await computeAchievements();

      expect(result.summary.totalMinutes).toBe(1000);
      
      // Should earn all minutes badges
      const minutes30Badge = result.badges.find(b => b.id === 'minutes-30');
      const minutes100Badge = result.badges.find(b => b.id === 'minutes-100');
      const minutes300Badge = result.badges.find(b => b.id === 'minutes-300');

      expect(minutes30Badge?.earned).toBe(true);
      expect(minutes100Badge?.earned).toBe(true);
      expect(minutes300Badge?.earned).toBe(true);
    });
  });
});
