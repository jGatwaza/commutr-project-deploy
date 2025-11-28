// HW9 CTR-C4: Achievements Service Unit Tests
import { computeAchievementsFromHistory } from '../src/achievements/service.js';
import type { CommuteSession } from '../src/history/commuteHistory.js';
import type { WatchedEntry } from '../src/history/watchHistory.js';

// Helper to create mock commute sessions
function createMockCommute(overrides: Partial<CommuteSession> = {}): CommuteSession {
  return {
    id: `commute-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    topics: ['test'],
    durationSec: 300, // 5 minutes default
    videosWatched: [],
    ...overrides
  };
}

// Helper to create mock watched videos
function createMockWatched(overrides: Partial<WatchedEntry> = {}): WatchedEntry {
  const now = new Date().toISOString();
  return {
    id: `w${Date.now()}-${Math.random()}`,
    userId: 'testUser',
    videoId: `vid-${Math.random()}`,
    title: 'Test Video',
    durationSec: 300, // 5 minutes default
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    ...overrides
  };
}

describe('HW9 CTR-C4: Achievements Service Unit Tests - Watch & Commute History', () => {
  
  describe('computeAchievementsFromHistory() - Basic Functionality', () => {
    test('Returns correct structure with summary and badges', () => {
      const history: CommuteSession[] = [createMockCommute()];
      const result = computeAchievementsFromHistory(history);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('badges');
      
      expect(result.summary).toHaveProperty('totalMinutes');
      expect(result.summary).toHaveProperty('totalSessions');
      expect(result.summary).toHaveProperty('longestStreak');
      expect(result.summary).toHaveProperty('currentStreak');

      expect(Array.isArray(result.badges)).toBe(true);
      expect(result.badges.length).toBeGreaterThan(0);
    });

    test('Each badge has required fields', () => {
      const history: CommuteSession[] = [createMockCommute()];
      const result = computeAchievementsFromHistory(history);

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

  describe('Summary Stats - Zero State (Empty History)', () => {
    test('With no commutes or videos, returns all zeros', () => {
      const history: CommuteSession[] = [];
      const watched: WatchedEntry[] = [];
      const result = computeAchievementsFromHistory(history, watched);

      expect(result.summary).toEqual({
        totalMinutes: 0,
        totalSessions: 0,
        longestStreak: 0,
        currentStreak: 0
      });
    });

    test('With no commutes or videos, all badges are locked', () => {
      const history: CommuteSession[] = [];
      const watched: WatchedEntry[] = [];
      const result = computeAchievementsFromHistory(history, watched);

      result.badges.forEach(badge => {
        expect(badge.earned).toBe(false);
        expect(badge.earnedAt).toBeUndefined();
      });
    });
  });

  describe('Summary Stats - With Commute History', () => {
    test('Correctly calculates totalMinutes from durationSec', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 15 * 60 }), // 15 minutes
        createMockCommute({ durationSec: 25 * 60 })  // 25 minutes
      ];

      const result = computeAchievementsFromHistory(history);

      expect(result.summary.totalMinutes).toBe(40);
      expect(result.summary.totalSessions).toBe(2);
    });

    test('Rounds down partial minutes', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 10.5 * 60 }) // 10 minutes 30 seconds = 630 seconds
      ];

      const result = computeAchievementsFromHistory(history);

      // Should round down to 10
      expect(result.summary.totalMinutes).toBe(10);
    });
  });

  describe('Badge Thresholds - Minutes Badges (Combined)', () => {
    test('minutes-30 badge unlocks with 30 minutes from commutes', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 30 * 60 })
      ];
      const watched: WatchedEntry[] = [];

      const result = computeAchievementsFromHistory(history, watched);
      const badge = result.badges.find(b => b.id === 'minutes-30');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(30);
      expect(badge?.progressTarget).toBe(30);
    });

    test('minutes-30 badge unlocks with 30 minutes from watched videos', () => {
      const history: CommuteSession[] = [];
      const watched: WatchedEntry[] = [
        createMockWatched({ durationSec: 30 * 60 })
      ];

      const result = computeAchievementsFromHistory(history, watched);
      const badge = result.badges.find(b => b.id === 'minutes-30');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(30);
      expect(badge?.progressTarget).toBe(30);
    });

    test('minutes-30 badge unlocks with combined time from both sources', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 15 * 60 })
      ];
      const watched: WatchedEntry[] = [
        createMockWatched({ durationSec: 15 * 60 })
      ];

      const result = computeAchievementsFromHistory(history, watched);
      const badge = result.badges.find(b => b.id === 'minutes-30');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(30);
    });

    test('minutes-30 badge locked below 30 minutes', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 29 * 60 })
      ];
      const watched: WatchedEntry[] = [];

      const result = computeAchievementsFromHistory(history, watched);
      const badge = result.badges.find(b => b.id === 'minutes-30');

      expect(badge?.earned).toBe(false);
      expect(badge?.progressCurrent).toBe(29);
      expect(badge?.progressTarget).toBe(30);
    });

    test('minutes-100 badge unlocks at 100+ minutes', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 50 * 60 }),
        createMockCommute({ durationSec: 55 * 60 })
      ];

      const result = computeAchievementsFromHistory(history);
      const badge = result.badges.find(b => b.id === 'minutes-100');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(105);
    });

    test('minutes-300 badge unlocks at 300+ minutes', () => {
      const history: CommuteSession[] = [];
      // Create 31 commutes of 10 minutes each = 310 minutes total
      for (let i = 0; i < 31; i++) {
        history.push(createMockCommute({ durationSec: 10 * 60 }));
      }

      const result = computeAchievementsFromHistory(history);
      const badge = result.badges.find(b => b.id === 'minutes-300');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(310);
    });
  });

  describe('Badge Thresholds - Video Watch Badges', () => {
    test('video-1 badge (First Video) unlocks with first watched video', () => {
      const history: CommuteSession[] = [];
      const watched: WatchedEntry[] = [
        createMockWatched({ durationSec: 5 * 60 })
      ];

      const result = computeAchievementsFromHistory(history, watched);
      const badge = result.badges.find(b => b.id === 'video-1');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(1);
      expect(badge?.title).toBe('First Video');
    });

    test('video-5 badge unlocks with 5 watched videos', () => {
      const history: CommuteSession[] = [];
      const watched: WatchedEntry[] = [];
      for (let i = 0; i < 5; i++) {
        watched.push(createMockWatched());
      }

      const result = computeAchievementsFromHistory(history, watched);
      const badge = result.badges.find(b => b.id === 'video-5');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(5);
    });

    test('video-10 badge unlocks with 10+ watched videos', () => {
      const history: CommuteSession[] = [];
      const watched: WatchedEntry[] = [];
      for (let i = 0; i < 12; i++) {
        watched.push(createMockWatched());
      }

      const result = computeAchievementsFromHistory(history, watched);
      const badge = result.badges.find(b => b.id === 'video-10');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(12);
    });
  });

  describe('Badge Thresholds - Commute Badges', () => {
    test('commute-1 badge (First Commute) unlocks with first commute', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 5 * 60 })
      ];

      const result = computeAchievementsFromHistory(history);
      const badge = result.badges.find(b => b.id === 'commute-1');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(1);
      expect(badge?.title).toBe('First Commute');
    });

    test('commute-5 badge unlocks with 5 commutes', () => {
      const history: CommuteSession[] = [];
      for (let i = 0; i < 5; i++) {
        history.push(createMockCommute());
      }

      const result = computeAchievementsFromHistory(history);
      const badge = result.badges.find(b => b.id === 'commute-5');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(5);
    });

    test('commute-10 badge unlocks with 10+ commutes', () => {
      const history: CommuteSession[] = [];
      for (let i = 0; i < 12; i++) {
        history.push(createMockCommute());
      }

      const result = computeAchievementsFromHistory(history);
      const badge = result.badges.find(b => b.id === 'commute-10');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(12);
    });

    test('commute-10 badge locked with 9 commutes', () => {
      const history: CommuteSession[] = [];
      for (let i = 0; i < 9; i++) {
        history.push(createMockCommute());
      }

      const result = computeAchievementsFromHistory(history);
      const badge = result.badges.find(b => b.id === 'commute-10');

      expect(badge?.earned).toBe(false);
      expect(badge?.progressCurrent).toBe(9);
    });

    test('commute-25 badge unlocks with 25+ commutes', () => {
      const history: CommuteSession[] = [];
      for (let i = 0; i < 25; i++) {
        history.push(createMockCommute());
      }

      const result = computeAchievementsFromHistory(history);
      const badge = result.badges.find(b => b.id === 'commute-25');

      expect(badge?.earned).toBe(true);
      expect(badge?.progressCurrent).toBe(25);
    });
  });


  describe('Badge Thresholds - Streak Badges', () => {
    test('streak badges use longestStreak for progress', () => {
      const today = new Date();
      const history: CommuteSession[] = [
        createMockCommute({ timestamp: today.toISOString() })
      ];

      const result = computeAchievementsFromHistory(history);
      const streak3Badge = result.badges.find(b => b.id === 'streak-3');
      const streak7Badge = result.badges.find(b => b.id === 'streak-7');

      // With only today's commute, longest streak should be 1
      expect(result.summary.longestStreak).toBeGreaterThanOrEqual(1);
      expect(streak3Badge?.progressCurrent).toBe(result.summary.longestStreak);
      expect(streak7Badge?.progressCurrent).toBe(result.summary.longestStreak);
    });

    test('streak-3 badge unlocks with 3 consecutive days', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const history: CommuteSession[] = [
        createMockCommute({ timestamp: twoDaysAgo.toISOString() }),
        createMockCommute({ timestamp: yesterday.toISOString() }),
        createMockCommute({ timestamp: today.toISOString() })
      ];

      const result = computeAchievementsFromHistory(history);
      const streak3Badge = result.badges.find(b => b.id === 'streak-3');

      expect(result.summary.longestStreak).toBeGreaterThanOrEqual(3);
      expect(streak3Badge?.earned).toBe(true);
    });

    test('streak-7 badge unlocks with 7 consecutive days', () => {
      const history: CommuteSession[] = [];
      const today = new Date();
      
      // Create commutes for 7 consecutive days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        history.push(createMockCommute({ timestamp: date.toISOString() }));
      }

      const result = computeAchievementsFromHistory(history);
      const streak7Badge = result.badges.find(b => b.id === 'streak-7');

      expect(result.summary.longestStreak).toBeGreaterThanOrEqual(7);
      expect(streak7Badge?.earned).toBe(true);
    });
  });

  describe('earnedAt Timestamps', () => {
    test('Earned badges have earnedAt timestamp', () => {
      const testTimestamp = '2024-01-15T10:30:00.000Z';
      const history: CommuteSession[] = [
        createMockCommute({ 
          durationSec: 35 * 60, 
          timestamp: testTimestamp 
        })
      ];

      const result = computeAchievementsFromHistory(history);
      const minutes30Badge = result.badges.find(b => b.id === 'minutes-30');
      const commute1Badge = result.badges.find(b => b.id === 'commute-1');

      expect(minutes30Badge?.earned).toBe(true);
      expect(minutes30Badge?.earnedAt).toBeTruthy();
      expect(typeof minutes30Badge?.earnedAt).toBe('string');

      expect(commute1Badge?.earned).toBe(true);
      expect(commute1Badge?.earnedAt).toBeTruthy();
    });

    test('Unearned badges have no earnedAt timestamp', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 15 * 60 })
      ];

      const result = computeAchievementsFromHistory(history);
      const minutes30Badge = result.badges.find(b => b.id === 'minutes-30');

      expect(minutes30Badge?.earned).toBe(false);
      expect(minutes30Badge?.earnedAt).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('Handles commutes with 0 duration', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 0 })
      ];

      const result = computeAchievementsFromHistory(history);

      expect(result.summary.totalMinutes).toBe(0);
      expect(result.summary.totalSessions).toBe(1);
    });

    test('Handles very large duration values', () => {
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 1000 * 60 }) // 1000 minutes
      ];

      const result = computeAchievementsFromHistory(history);

      expect(result.summary.totalMinutes).toBe(1000);
      
      // Should earn all minutes badges
      const minutes30Badge = result.badges.find(b => b.id === 'minutes-30');
      const minutes100Badge = result.badges.find(b => b.id === 'minutes-100');
      const minutes300Badge = result.badges.find(b => b.id === 'minutes-300');

      expect(minutes30Badge?.earned).toBe(true);
      expect(minutes100Badge?.earned).toBe(true);
      expect(minutes300Badge?.earned).toBe(true);
    });

    test('earnedAt timestamp is set to the commute that crossed threshold', () => {
      const timestamp1 = '2024-01-01T10:00:00.000Z';
      const timestamp2 = '2024-01-02T10:00:00.000Z';
      const timestamp3 = '2024-01-03T10:00:00.000Z';

      // Create history with commutes in chronological order
      const history: CommuteSession[] = [
        createMockCommute({ durationSec: 10 * 60, timestamp: timestamp1 }),
        createMockCommute({ durationSec: 15 * 60, timestamp: timestamp2 }),
        createMockCommute({ durationSec: 10 * 60, timestamp: timestamp3 })
      ];

      const result = computeAchievementsFromHistory(history);
      const minutes30Badge = result.badges.find(b => b.id === 'minutes-30');

      // Total is 35 minutes
      // After first commute: 10 minutes (not crossed)
      // After second commute: 25 minutes (not crossed yet)
      // After third commute: 35 minutes (crossed 30!)
      expect(minutes30Badge?.earned).toBe(true);
      expect(minutes30Badge?.earnedAt).toBe(timestamp3);
    });
  });
});
