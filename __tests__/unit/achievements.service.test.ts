/**
 * Unit tests for Achievements Service
 * Tests: Badge computation, streak calculation, and achievement tracking
 */

import { computeAchievementsFromHistory, type AchievementSummary, type Badge } from '../../src/achievements/service.js';
import type { CommuteSession } from '../../src/history/commuteHistory.js';
import type { WatchedEntry } from '../../src/history/watchHistory.js';

describe('Achievements Service', () => {
  describe('computeAchievementsFromHistory', () => {
    test('should return empty achievements for no history', () => {
      const result = computeAchievementsFromHistory([], []);

      expect(result.summary.totalMinutes).toBe(0);
      expect(result.summary.totalSessions).toBe(0);
      expect(result.summary.longestStreak).toBe(0);
      expect(result.summary.currentStreak).toBe(0);
      expect(result.badges.length).toBeGreaterThan(0); // Should have badge definitions
      expect(result.badges.every(b => !b.earned)).toBe(true); // None earned
    });

    test('should calculate total minutes from commute history', () => {
      const history: CommuteSession[] = [
        {
          id: 's1',
          timestamp: '2024-01-01T10:00:00Z',
          topics: ['python'],
          durationSec: 600, // 10 minutes
          videosWatched: []
        },
        {
          id: 's2',
          timestamp: '2024-01-02T10:00:00Z',
          topics: ['javascript'],
          durationSec: 1200, // 20 minutes
          videosWatched: []
        }
      ];

      const result = computeAchievementsFromHistory(history, []);

      expect(result.summary.totalMinutes).toBe(30);
      expect(result.summary.totalSessions).toBe(2);
    });

    test('should calculate total minutes from watch history', () => {
      const watchedVideos: WatchedEntry[] = [
        {
          id: 'w1',
          userId: 'user1',
          videoId: 'v1',
          title: 'Video 1',
          durationSec: 300, // 5 minutes
          completedAt: '2024-01-01T10:00:00Z',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        },
        {
          id: 'w2',
          userId: 'user1',
          videoId: 'v2',
          title: 'Video 2',
          durationSec: 600, // 10 minutes
          completedAt: '2024-01-01T10:05:00Z',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:05:00Z'
        }
      ];

      const result = computeAchievementsFromHistory([], watchedVideos);

      expect(result.summary.totalMinutes).toBe(15);
    });

    test('should combine minutes from both sources', () => {
      const history: CommuteSession[] = [
        {
          id: 's1',
          timestamp: '2024-01-01T10:00:00Z',
          topics: ['python'],
          durationSec: 600, // 10 minutes
          videosWatched: []
        }
      ];

      const watchedVideos: WatchedEntry[] = [
        {
          id: 'w1',
          userId: 'user1',
          videoId: 'v1',
          title: 'Video 1',
          durationSec: 300, // 5 minutes
          completedAt: '2024-01-01T10:00:00Z',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ];

      const result = computeAchievementsFromHistory(history, watchedVideos);

      expect(result.summary.totalMinutes).toBe(15);
    });

    test('should earn video watch badges', () => {
      const watchedVideos: WatchedEntry[] = [
        { id: 'w1', userId: 'user1', videoId: 'v1', title: 'V1', durationSec: 300, completedAt: '2024-01-01T10:00:00Z', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
        { id: 'w2', userId: 'user1', videoId: 'v2', title: 'V2', durationSec: 300, completedAt: '2024-01-01T10:05:00Z', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:05:00Z' },
        { id: 'w3', userId: 'user1', videoId: 'v3', title: 'V3', durationSec: 300, completedAt: '2024-01-01T10:10:00Z', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:10:00Z' },
        { id: 'w4', userId: 'user1', videoId: 'v4', title: 'V4', durationSec: 300, completedAt: '2024-01-01T10:15:00Z', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:15:00Z' },
        { id: 'w5', userId: 'user1', videoId: 'v5', title: 'V5', durationSec: 300, completedAt: '2024-01-01T10:20:00Z', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:20:00Z' },
      ];

      const result = computeAchievementsFromHistory([], watchedVideos);

      const firstVideoBadge = result.badges.find(b => b.id === 'video-1');
      const fiveVideosBadge = result.badges.find(b => b.id === 'video-5');
      const tenVideosBadge = result.badges.find(b => b.id === 'video-10');

      expect(firstVideoBadge?.earned).toBe(true);
      expect(fiveVideosBadge?.earned).toBe(true);
      expect(tenVideosBadge?.earned).toBe(false);
    });

    test('should earn commute badges', () => {
      const history: CommuteSession[] = Array(10).fill(null).map((_, i) => ({
        id: `s${i}`,
        timestamp: `2024-01-0${i + 1}T10:00:00Z`,
        topics: ['python'],
        durationSec: 600,
        videosWatched: []
      }));

      const result = computeAchievementsFromHistory(history, []);

      const firstCommute = result.badges.find(b => b.id === 'commute-1');
      const fiveCommutes = result.badges.find(b => b.id === 'commute-5');
      const tenCommutes = result.badges.find(b => b.id === 'commute-10');
      const twentyFiveCommutes = result.badges.find(b => b.id === 'commute-25');

      expect(firstCommute?.earned).toBe(true);
      expect(fiveCommutes?.earned).toBe(true);
      expect(tenCommutes?.earned).toBe(true);
      expect(twentyFiveCommutes?.earned).toBe(false);
    });

    test('should earn minutes badges', () => {
      const history: CommuteSession[] = [
        {
          id: 's1',
          timestamp: '2024-01-01T10:00:00Z',
          topics: ['python'],
          durationSec: 6000, // 100 minutes
          videosWatched: []
        }
      ];

      const result = computeAchievementsFromHistory(history, []);

      const thirtyMin = result.badges.find(b => b.id === 'minutes-30');
      const hundredMin = result.badges.find(b => b.id === 'minutes-100');
      const threeHundredMin = result.badges.find(b => b.id === 'minutes-300');

      expect(thirtyMin?.earned).toBe(true);
      expect(hundredMin?.earned).toBe(true);
      expect(threeHundredMin?.earned).toBe(false);
    });

    test('should calculate current streak correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const history: CommuteSession[] = [
        {
          id: 's1',
          timestamp: today.toISOString(),
          topics: ['python'],
          durationSec: 600,
          videosWatched: []
        },
        {
          id: 's2',
          timestamp: yesterday.toISOString(),
          topics: ['python'],
          durationSec: 600,
          videosWatched: []
        },
        {
          id: 's3',
          timestamp: twoDaysAgo.toISOString(),
          topics: ['python'],
          durationSec: 600,
          videosWatched: []
        }
      ];

      const result = computeAchievementsFromHistory(history, []);

      expect(result.summary.currentStreak).toBeGreaterThanOrEqual(3);
    });

    test('should calculate longest streak correctly', () => {
      const history: CommuteSession[] = [
        { id: 's1', timestamp: '2024-01-01T10:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
        { id: 's2', timestamp: '2024-01-02T10:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
        { id: 's3', timestamp: '2024-01-03T10:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
        { id: 's4', timestamp: '2024-01-04T10:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
        { id: 's5', timestamp: '2024-01-05T10:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
        // Gap
        { id: 's6', timestamp: '2024-01-10T10:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
        { id: 's7', timestamp: '2024-01-11T10:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
      ];

      const result = computeAchievementsFromHistory(history, []);

      expect(result.summary.longestStreak).toBe(5);
    });

    test('should earn streak badges', () => {
      const history: CommuteSession[] = Array(7).fill(null).map((_, i) => ({
        id: `s${i}`,
        timestamp: `2024-01-0${i + 1}T10:00:00Z`,
        topics: ['python'],
        durationSec: 600,
        videosWatched: []
      }));

      const result = computeAchievementsFromHistory(history, []);

      const threeDayStreak = result.badges.find(b => b.id === 'streak-3');
      const sevenDayStreak = result.badges.find(b => b.id === 'streak-7');

      expect(threeDayStreak?.earned).toBe(true);
      expect(sevenDayStreak?.earned).toBe(true);
    });

    test('should include progress towards badges', () => {
      const history: CommuteSession[] = [
        {
          id: 's1',
          timestamp: '2024-01-01T10:00:00Z',
          topics: ['python'],
          durationSec: 600, // 10 minutes
          videosWatched: []
        }
      ];

      const result = computeAchievementsFromHistory(history, []);

      const thirtyMinBadge = result.badges.find(b => b.id === 'minutes-30');
      
      expect(thirtyMinBadge?.progressCurrent).toBe(10);
      expect(thirtyMinBadge?.progressTarget).toBe(30);
      expect(thirtyMinBadge?.earned).toBe(false);
    });

    test('should set earnedAt timestamp for earned badges', () => {
      const watchedVideos: WatchedEntry[] = [
        {
          id: 'w1',
          userId: 'user1',
          videoId: 'v1',
          title: 'Video 1',
          durationSec: 300,
          completedAt: '2024-01-01T10:00:00Z',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ];

      const result = computeAchievementsFromHistory([], watchedVideos);

      const firstVideoBadge = result.badges.find(b => b.id === 'video-1');
      
      expect(firstVideoBadge?.earned).toBe(true);
      expect(firstVideoBadge?.earnedAt).toBeDefined();
      expect(firstVideoBadge?.earnedAt).toBe('2024-01-01T10:00:00Z');
    });

    test('should handle multiple commutes on same day for streak', () => {
      const history: CommuteSession[] = [
        { id: 's1', timestamp: '2024-01-01T08:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
        { id: 's2', timestamp: '2024-01-01T17:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
        { id: 's3', timestamp: '2024-01-02T08:00:00Z', topics: ['python'], durationSec: 600, videosWatched: [] },
      ];

      const result = computeAchievementsFromHistory(history, []);

      // Should count as 2-day streak, not 3 (multiple commutes on same day count as 1)
      expect(result.summary.longestStreak).toBe(2);
    });

    test('should have correct badge catalog structure', () => {
      const result = computeAchievementsFromHistory([], []);

      result.badges.forEach(badge => {
        expect(badge).toHaveProperty('id');
        expect(badge).toHaveProperty('title');
        expect(badge).toHaveProperty('description');
        expect(badge).toHaveProperty('icon');
        expect(badge).toHaveProperty('earned');
        expect(badge).toHaveProperty('progressCurrent');
        expect(badge).toHaveProperty('progressTarget');
      });
    });
  });
});
