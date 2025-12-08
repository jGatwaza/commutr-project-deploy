/**
 * Unit tests for History Service
 * Tests: Watch history and commute history management
 */

import { upsertWatched, listWatched, getWatchedVideoIds, clearWatched, type WatchedEntryInput } from '../../src/history/watchHistory.js';

describe('History Service - Watch History', () => {
  beforeEach(() => {
    // Clear watch history before each test
    clearWatched();
  });

  describe('upsertWatched', () => {
    test('should create new watch entry', () => {
      const input: WatchedEntryInput = {
        userId: 'user1',
        videoId: 'v1',
        title: 'Test Video',
        durationSec: 300,
        progressPct: 50
      };

      const result = upsertWatched(input);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user1');
      expect(result.videoId).toBe('v1');
      expect(result.title).toBe('Test Video');
      expect(result.durationSec).toBe(300);
      expect(result.progressPct).toBe(50);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    test('should update existing entry with newer completion', () => {
      const input1: WatchedEntryInput = {
        userId: 'user1',
        videoId: 'v1',
        title: 'Test Video',
        durationSec: 300,
        progressPct: 50,
        completedAt: '2024-01-01T10:00:00Z'
      };

      const input2: WatchedEntryInput = {
        userId: 'user1',
        videoId: 'v1',
        title: 'Test Video',
        durationSec: 300,
        progressPct: 100,
        completedAt: '2024-01-02T10:00:00Z'
      };

      const result1 = upsertWatched(input1);
      const result2 = upsertWatched(input2);

      expect(result1.id).toBe(result2.id); // Same ID
      expect(result2.progressPct).toBe(100);
      expect(result2.completedAt).toBe('2024-01-02T10:00:00Z');
    });

    test('should not replace newer completion with older one', () => {
      const input1: WatchedEntryInput = {
        userId: 'user1',
        videoId: 'v1',
        title: 'Test Video',
        durationSec: 300,
        progressPct: 100,
        completedAt: '2024-01-02T10:00:00Z'
      };

      const input2: WatchedEntryInput = {
        userId: 'user1',
        videoId: 'v1',
        title: 'Test Video',
        durationSec: 300,
        progressPct: 50,
        completedAt: '2024-01-01T10:00:00Z'
      };

      const result1 = upsertWatched(input1);
      const result2 = upsertWatched(input2);

      expect(result2.progressPct).toBe(100); // Keep newer completion
      expect(result2.completedAt).toBe('2024-01-02T10:00:00Z');
    });

    test('should handle optional fields', () => {
      const input: WatchedEntryInput = {
        userId: 'user1',
        videoId: 'v1',
        title: 'Test Video',
        durationSec: 300,
        progressPct: 100,
        topicTags: ['python', 'programming'],
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: '2024-01-01T10:05:00Z',
        source: 'youtube'
      };

      const result = upsertWatched(input);

      expect(result.topicTags).toEqual(['python', 'programming']);
      expect(result.startedAt).toBe('2024-01-01T10:00:00Z');
      expect(result.completedAt).toBe('2024-01-01T10:05:00Z');
      expect(result.source).toBe('youtube');
    });
  });

  describe('listWatched', () => {
    test('should return empty list for user with no history', () => {
      const result = listWatched({ userId: 'user1' });

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });

    test('should list watched videos for user', () => {
      upsertWatched({
        userId: 'user1',
        videoId: 'v1',
        title: 'Video 1',
        durationSec: 300,
        progressPct: 100,
        completedAt: '2024-01-01T10:00:00Z'
      });

      upsertWatched({
        userId: 'user1',
        videoId: 'v2',
        title: 'Video 2',
        durationSec: 300,
        progressPct: 100,
        completedAt: '2024-01-01T11:00:00Z'
      });

      const result = listWatched({ userId: 'user1' });

      expect(result.items).toHaveLength(2);
    });

    test('should filter by user ID', () => {
      upsertWatched({
        userId: 'user1',
        videoId: 'v1',
        title: 'Video 1',
        durationSec: 300,
        progressPct: 100
      });

      upsertWatched({
        userId: 'user2',
        videoId: 'v2',
        title: 'Video 2',
        durationSec: 300,
        progressPct: 100
      });

      const result = listWatched({ userId: 'user1' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.videoId).toBe('v1');
    });

    test('should sort by completedAt descending', () => {
      upsertWatched({
        userId: 'user1',
        videoId: 'v1',
        title: 'Video 1',
        durationSec: 300,
        progressPct: 100,
        completedAt: '2024-01-01T10:00:00Z'
      });

      upsertWatched({
        userId: 'user1',
        videoId: 'v2',
        title: 'Video 2',
        durationSec: 300,
        progressPct: 100,
        completedAt: '2024-01-02T10:00:00Z'
      });

      const result = listWatched({ userId: 'user1' });

      expect(result.items[0]?.videoId).toBe('v2'); // Most recent first
      expect(result.items[1]?.videoId).toBe('v1');
    });

    test('should support search by title', () => {
      upsertWatched({
        userId: 'user1',
        videoId: 'v1',
        title: 'Python Tutorial',
        durationSec: 300,
        progressPct: 100
      });

      upsertWatched({
        userId: 'user1',
        videoId: 'v2',
        title: 'JavaScript Tutorial',
        durationSec: 300,
        progressPct: 100
      });

      const result = listWatched({ userId: 'user1', q: 'python' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.videoId).toBe('v1');
    });

    test('should respect limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        upsertWatched({
          userId: 'user1',
          videoId: `v${i}`,
          title: `Video ${i}`,
          durationSec: 300,
          progressPct: 100
        });
      }

      const result = listWatched({ userId: 'user1', limit: 3 });

      expect(result.items).toHaveLength(3);
      expect(result.nextCursor).toBeDefined();
    });

    test('should support pagination with cursor', () => {
      for (let i = 0; i < 5; i++) {
        upsertWatched({
          userId: 'user1',
          videoId: `v${i}`,
          title: `Video ${i}`,
          durationSec: 300,
          progressPct: 100,
          completedAt: `2024-01-0${i + 1}T10:00:00Z`
        });
      }

      const page1 = listWatched({ userId: 'user1', limit: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).toBeDefined();

      const page2 = listWatched({ userId: 'user1', limit: 2, cursor: page1.nextCursor! });
      expect(page2.items).toHaveLength(2);
      expect(page2.items[0]?.videoId).not.toBe(page1.items[0]?.videoId);
    });
  });

  describe('getWatchedVideoIds', () => {
    test('should return empty set for user with no history', () => {
      const result = getWatchedVideoIds('user1');

      expect(result.size).toBe(0);
    });

    test('should return set of watched video IDs', () => {
      upsertWatched({
        userId: 'user1',
        videoId: 'v1',
        title: 'Video 1',
        durationSec: 300,
        progressPct: 100
      });

      upsertWatched({
        userId: 'user1',
        videoId: 'v2',
        title: 'Video 2',
        durationSec: 300,
        progressPct: 100
      });

      const result = getWatchedVideoIds('user1');

      expect(result.size).toBe(2);
      expect(result.has('v1')).toBe(true);
      expect(result.has('v2')).toBe(true);
    });

    test('should filter by topic', () => {
      upsertWatched({
        userId: 'user1',
        videoId: 'v1',
        title: 'Video 1',
        durationSec: 300,
        progressPct: 100,
        topicTags: ['python']
      });

      upsertWatched({
        userId: 'user1',
        videoId: 'v2',
        title: 'Video 2',
        durationSec: 300,
        progressPct: 100,
        topicTags: ['javascript']
      });

      const result = getWatchedVideoIds('user1', 'python');

      expect(result.size).toBe(1);
      expect(result.has('v1')).toBe(true);
      expect(result.has('v2')).toBe(false);
    });

    test('should be case-insensitive for topic matching', () => {
      upsertWatched({
        userId: 'user1',
        videoId: 'v1',
        title: 'Video 1',
        durationSec: 300,
        progressPct: 100,
        topicTags: ['Python']
      });

      const result = getWatchedVideoIds('user1', 'python');

      expect(result.size).toBe(1);
      expect(result.has('v1')).toBe(true);
    });
  });
});
