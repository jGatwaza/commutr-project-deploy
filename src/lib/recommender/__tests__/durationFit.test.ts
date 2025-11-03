/**
 * Duration-fit and de-duplication selector tests
 * These tests are the source of truth - do not modify them, fix implementation instead
 */

import { describe, it, expect } from '@jest/globals';

// Video type definition for tests
export interface Video {
  id: string;
  url: string;
  title: string;
  durationSec: number;
  topicTags?: string[];
  creatorId?: string;
  publishedAt?: string; // ISO 8601
}

// Import the function we'll implement
import { selectVideos } from '../durationFit.js';

describe('selectVideos - Duration Fit & De-duplication', () => {
  // Realistic test fixtures
  const fixtures: Video[] = [
    {
      id: 'vid1',
      url: 'https://youtube.com/watch?v=abc123',
      title: 'Introduction to TypeScript',
      durationSec: 300,
      topicTags: ['typescript', 'programming'],
      creatorId: 'creator1',
      publishedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'vid2',
      url: 'https://youtube.com/watch?v=def456',
      title: 'Advanced React Patterns',
      durationSec: 600,
      topicTags: ['react', 'javascript', 'programming'],
      creatorId: 'creator2',
      publishedAt: '2024-02-20T14:30:00Z',
    },
    {
      id: 'vid3',
      url: 'https://youtube.com/watch?v=ghi789',
      title: 'Node.js Best Practices',
      durationSec: 450,
      topicTags: ['nodejs', 'javascript', 'backend'],
      creatorId: 'creator1',
      publishedAt: '2024-03-10T09:15:00Z',
    },
    {
      id: 'vid4',
      url: 'https://youtube.com/watch?v=jkl012',
      title: 'CSS Grid Layout',
      durationSec: 200,
      topicTags: ['css', 'frontend'],
      creatorId: 'creator3',
      publishedAt: '2024-01-05T16:45:00Z',
    },
    {
      id: 'vid5',
      url: 'https://youtube.com/watch?v=mno345',
      title: 'Docker Fundamentals',
      durationSec: 500,
      topicTags: ['docker', 'devops'],
      creatorId: 'creator2',
      publishedAt: '2024-02-28T11:20:00Z',
    },
    {
      id: 'vid6',
      url: 'https://youtube.com/watch?v=pqr678',
      title: 'Quick CSS Tips',
      durationSec: 150,
      topicTags: ['css', 'frontend'],
      creatorId: 'creator4',
      publishedAt: '2024-03-15T13:00:00Z',
    },
    {
      id: 'vid7',
      url: 'https://youtube.com/watch?v=stu901',
      title: 'React Hooks Deep Dive',
      durationSec: 700,
      topicTags: ['react', 'javascript'],
      creatorId: 'creator5',
      publishedAt: '2024-03-20T10:30:00Z',
    },
    {
      id: 'vid8',
      url: 'https://youtube.com/watch?v=vwx234',
      title: 'TypeScript Generics',
      durationSec: 400,
      topicTags: ['typescript', 'programming'],
      creatorId: 'creator1',
      publishedAt: '2024-03-25T15:00:00Z',
    },
  ];

  describe('Time fit & cap', () => {
    it('should fit videos within remainingSeconds without exceeding 3% overbook cap', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 900,
      });

      expect(result.items).toBeDefined();
      expect(result.totalSec).toBeDefined();
      expect(result.totalSec).toBeGreaterThan(0);
      expect(result.totalSec).toBeLessThanOrEqual(900 * 1.03); // 3% overbook cap = 927
    });

    it('should get as close as possible to remainingSeconds', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 1000,
      });

      // Should be close to 1000, definitely not way under
      expect(result.totalSec).toBeGreaterThan(800);
      expect(result.totalSec).toBeLessThanOrEqual(1030); // 1000 * 1.03
    });

    it('should respect custom overbookPct', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 500,
        overbookPct: 0.05, // 5% overbook
      });

      expect(result.totalSec).toBeLessThanOrEqual(500 * 1.05); // 525
    });

    it('should handle small remainingSeconds', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 250,
      });

      expect(result.totalSec).toBeGreaterThan(0);
      expect(result.totalSec).toBeLessThanOrEqual(250 * 1.03); // 257.5
    });

    it('should handle large remainingSeconds', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 5000,
      });

      // Should select multiple videos
      expect(result.items.length).toBeGreaterThan(1);
      expect(result.totalSec).toBeLessThanOrEqual(5000 * 1.03);
    });
  });

  describe('De-duplication', () => {
    it('should never return any ID from excludeIds', () => {
      const excludeIds = ['vid2', 'vid5', 'vid7'];
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 2000,
        excludeIds,
      });

      const selectedIds = result.items.map((v: Video) => v.id);
      excludeIds.forEach((excludedId) => {
        expect(selectedIds).not.toContain(excludedId);
      });
    });

    it('should handle empty excludeIds', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 1000,
        excludeIds: [],
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should select at most one video when candidates share same canonical id', () => {
      // Create duplicates with same id but different URLs
      const duplicates: Video[] = [
        {
          id: 'canonical1',
          url: 'https://youtube.com/watch?v=aaa',
          title: 'Video A',
          durationSec: 300,
        },
        {
          id: 'canonical1',
          url: 'https://vimeo.com/123',
          title: 'Video A Mirror',
          durationSec: 300,
        },
        {
          id: 'canonical2',
          url: 'https://youtube.com/watch?v=bbb',
          title: 'Video B',
          durationSec: 400,
        },
        {
          id: 'canonical2',
          url: 'https://dailymotion.com/456',
          title: 'Video B Mirror',
          durationSec: 400,
        },
      ];

      const result = selectVideos({
        candidates: duplicates,
        remainingSeconds: 1000,
      });

      // Count occurrences of each canonical id
      const idCounts = result.items.reduce((acc: Record<string, number>, video: Video) => {
        acc[video.id] = (acc[video.id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.values(idCounts).forEach((count) => {
        expect(count).toBe(1);
      });
    });
  });

  describe('Topic filter', () => {
    it('should only return videos matching topic (case-insensitive)', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 2000,
        topic: 'react',
      });

      result.items.forEach((video: Video) => {
        expect(video.topicTags).toBeDefined();
        const hasReactTag = video.topicTags!.some(
          (tag: string) => tag.toLowerCase() === 'react'
        );
        expect(hasReactTag).toBe(true);
      });
    });

    it('should be case-insensitive for topic matching', () => {
      const resultLower = selectVideos({
        candidates: fixtures,
        remainingSeconds: 2000,
        topic: 'typescript',
      });

      const resultUpper = selectVideos({
        candidates: fixtures,
        remainingSeconds: 2000,
        topic: 'TYPESCRIPT',
      });

      const resultMixed = selectVideos({
        candidates: fixtures,
        remainingSeconds: 2000,
        topic: 'TypeScript',
      });

      expect(resultLower.items.length).toBe(resultUpper.items.length);
      expect(resultLower.items.length).toBe(resultMixed.items.length);
      expect(resultLower.items.length).toBeGreaterThan(0);
    });

    it('should filter multiple videos by topic', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 2000,
        topic: 'javascript',
      });

      expect(result.items.length).toBeGreaterThan(1);
      result.items.forEach((video: Video) => {
        const hasJsTag = video.topicTags!.some(
          (tag: string) => tag.toLowerCase() === 'javascript'
        );
        expect(hasJsTag).toBe(true);
      });
    });

    it('should work with topic and excludeIds together', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 2000,
        topic: 'react',
        excludeIds: ['vid2'],
      });

      const selectedIds = result.items.map((v: Video) => v.id);
      expect(selectedIds).not.toContain('vid2');
      result.items.forEach((video: Video) => {
        const hasReactTag = video.topicTags!.some(
          (tag: string) => tag.toLowerCase() === 'react'
        );
        expect(hasReactTag).toBe(true);
      });
    });
  });

  describe('Empty scenarios', () => {
    it('should return empty array when candidates is empty', () => {
      const result = selectVideos({
        candidates: [],
        remainingSeconds: 1000,
      });

      expect(result.items).toEqual([]);
      expect(result.totalSec).toBe(0);
    });

    it('should return empty array when topic has zero matches', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 1000,
        topic: 'nonexistent-topic',
      });

      expect(result.items).toEqual([]);
      expect(result.totalSec).toBe(0);
    });

    it('should return empty array when all candidates are excluded', () => {
      const allIds = fixtures.map((v) => v.id);
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 1000,
        excludeIds: allIds,
      });

      expect(result.items).toEqual([]);
      expect(result.totalSec).toBe(0);
    });

    it('should return empty array when remainingSeconds is zero', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 0,
      });

      expect(result.items).toEqual([]);
      expect(result.totalSec).toBe(0);
    });

    it('should return empty array when remainingSeconds is negative', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: -100,
      });

      expect(result.items).toEqual([]);
      expect(result.totalSec).toBe(0);
    });
  });

  describe('Tie-breakers', () => {
    it('should prefer selection with more distinct creators when durations are equal', () => {
      // Create scenario where two selections have same total duration
      const candidates: Video[] = [
        {
          id: 'a1',
          url: 'https://example.com/a1',
          title: 'Video A1',
          durationSec: 500,
          creatorId: 'creator1',
          publishedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'a2',
          url: 'https://example.com/a2',
          title: 'Video A2',
          durationSec: 500,
          creatorId: 'creator1', // Same creator as a1
          publishedAt: '2024-01-02T00:00:00Z',
        },
        {
          id: 'b1',
          url: 'https://example.com/b1',
          title: 'Video B1',
          durationSec: 500,
          creatorId: 'creator2',
          publishedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'b2',
          url: 'https://example.com/b2',
          title: 'Video B2',
          durationSec: 500,
          creatorId: 'creator3', // Different creator
          publishedAt: '2024-01-02T00:00:00Z',
        },
      ];

      const result = selectVideos({
        candidates,
        remainingSeconds: 1000,
      });

      // Should prefer b1+b2 (2 creators) over a1+a2 (1 creator)
      const creatorIds = result.items
        .map((v: Video) => v.creatorId)
        .filter((id: string | undefined): id is string => id !== undefined);
      const uniqueCreators = new Set(creatorIds);
      
      // When total duration is same, should maximize creator diversity
      if (result.totalSec === 1000) {
        expect(uniqueCreators.size).toBeGreaterThanOrEqual(2);
      }
    });

    it('should prefer newer content when creator diversity is equal', () => {
      // Create scenario where selections have same duration and creator diversity
      const candidates: Video[] = [
        {
          id: 'old1',
          url: 'https://example.com/old1',
          title: 'Old Video 1',
          durationSec: 500,
          creatorId: 'creator1',
          publishedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'old2',
          url: 'https://example.com/old2',
          title: 'Old Video 2',
          durationSec: 500,
          creatorId: 'creator2',
          publishedAt: '2023-01-02T00:00:00Z',
        },
        {
          id: 'new1',
          url: 'https://example.com/new1',
          title: 'New Video 1',
          durationSec: 500,
          creatorId: 'creator3',
          publishedAt: '2024-06-01T00:00:00Z',
        },
        {
          id: 'new2',
          url: 'https://example.com/new2',
          title: 'New Video 2',
          durationSec: 500,
          creatorId: 'creator4',
          publishedAt: '2024-06-02T00:00:00Z',
        },
      ];

      const result = selectVideos({
        candidates,
        remainingSeconds: 1000,
      });

      // Should prefer newer videos (new1+new2) over older ones
      const avgPublishDate =
        result.items.reduce((sum: number, v: Video) => {
          return sum + (v.publishedAt ? new Date(v.publishedAt).getTime() : 0);
        }, 0) / result.items.length;

      // Average should be closer to 2024 than 2023
      const year2024 = new Date('2024-01-01T00:00:00Z').getTime();
      const year2023 = new Date('2023-01-01T00:00:00Z').getTime();
      
      if (result.items.length === 2 && result.totalSec === 1000) {
        expect(avgPublishDate).toBeGreaterThan((year2023 + year2024) / 2);
      }
    });

    it('should handle videos without creatorId gracefully', () => {
      const candidates: Video[] = [
        {
          id: 'v1',
          url: 'https://example.com/v1',
          title: 'Video 1',
          durationSec: 300,
          // No creatorId
        },
        {
          id: 'v2',
          url: 'https://example.com/v2',
          title: 'Video 2',
          durationSec: 300,
          creatorId: 'creator1',
        },
        {
          id: 'v3',
          url: 'https://example.com/v3',
          title: 'Video 3',
          durationSec: 300,
          // No creatorId
        },
      ];

      const result = selectVideos({
        candidates,
        remainingSeconds: 600,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalSec).toBeLessThanOrEqual(600 * 1.03);
    });

    it('should handle videos without publishedAt gracefully', () => {
      const candidates: Video[] = [
        {
          id: 'v1',
          url: 'https://example.com/v1',
          title: 'Video 1',
          durationSec: 300,
          // No publishedAt
        },
        {
          id: 'v2',
          url: 'https://example.com/v2',
          title: 'Video 2',
          durationSec: 300,
          publishedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result = selectVideos({
        candidates,
        remainingSeconds: 600,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalSec).toBeLessThanOrEqual(600 * 1.03);
    });
  });

  describe('Return value structure', () => {
    it('should return items, totalSec, and strategy', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 1000,
      });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('totalSec');
      expect(result).toHaveProperty('strategy');
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.totalSec).toBe('number');
      expect(typeof result.strategy).toBe('string');
    });

    it('should have totalSec equal to sum of selected video durations', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 1000,
      });

      const calculatedTotal = result.items.reduce(
        (sum: number, video: Video) => sum + video.durationSec,
        0
      );
      expect(result.totalSec).toBe(calculatedTotal);
    });

    it('should return valid strategy string', () => {
      const result = selectVideos({
        candidates: fixtures,
        remainingSeconds: 1000,
      });

      expect(result.strategy).toBeTruthy();
      expect(result.strategy.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle single candidate', () => {
      const firstFixture = fixtures[0];
      if (!firstFixture) throw new Error('No fixtures available');
      
      const result = selectVideos({
        candidates: [firstFixture],
        remainingSeconds: 500,
      });

      expect(result.items.length).toBeLessThanOrEqual(1);
      if (result.items.length === 1) {
        expect(result.items[0]!.id).toBe(firstFixture.id);
      }
    });

    it('should handle candidates with no topicTags', () => {
      const candidates: Video[] = [
        {
          id: 'v1',
          url: 'https://example.com/v1',
          title: 'Video 1',
          durationSec: 300,
          // No topicTags
        },
        {
          id: 'v2',
          url: 'https://example.com/v2',
          title: 'Video 2',
          durationSec: 400,
          // No topicTags
        },
      ];

      const result = selectVideos({
        candidates,
        remainingSeconds: 1000,
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should handle very small video durations', () => {
      const candidates: Video[] = [
        {
          id: 'v1',
          url: 'https://example.com/v1',
          title: 'Short 1',
          durationSec: 10,
        },
        {
          id: 'v2',
          url: 'https://example.com/v2',
          title: 'Short 2',
          durationSec: 15,
        },
        {
          id: 'v3',
          url: 'https://example.com/v3',
          title: 'Short 3',
          durationSec: 20,
        },
      ];

      const result = selectVideos({
        candidates,
        remainingSeconds: 50,
      });

      expect(result.totalSec).toBeLessThanOrEqual(50 * 1.03);
    });

    it('should handle all videos exceeding remainingSeconds', () => {
      const candidates: Video[] = [
        {
          id: 'v1',
          url: 'https://example.com/v1',
          title: 'Long Video',
          durationSec: 2000,
        },
      ];

      const result = selectVideos({
        candidates,
        remainingSeconds: 100,
      });

      // Should return empty since no video fits
      expect(result.items).toEqual([]);
      expect(result.totalSec).toBe(0);
    });
  });
});
