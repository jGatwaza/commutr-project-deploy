/**
 * Unit tests for Playlist Creation API
 * Tests: /v1/playlist endpoint and buildPack algorithm
 */

import { buildPack, buildPackV2, type Candidate, type PackReq } from '../../src/pack/builder.js';
import type { Candidate as OldCandidate } from '../../src/stubs/metadata.js';

describe('Playlist Creation API - buildPack Algorithm', () => {
  describe('buildPack (Legacy API)', () => {
    test('should build playlist within duration bounds', () => {
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 300, channelId: 'c1', topic: 'python', title: 'Python 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v2', durationSec: 360, channelId: 'c1', topic: 'python', title: 'Python 2', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v3', durationSec: 240, channelId: 'c2', topic: 'python', title: 'Python 3', channelTitle: 'Channel 2', level: 'beginner', thumbnail: '' },
      ];

      const result = buildPack({
        topic: 'python',
        minDurationSec: 850,
        maxDurationSec: 950,
        userMasteryLevel: 'beginner',
        candidates
      });

      expect(result.totalDurationSec).toBeGreaterThanOrEqual(850);
      expect(result.totalDurationSec).toBeLessThanOrEqual(950);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.underFilled).toBe(false);
    });

    test('should mark underFilled when insufficient content', () => {
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 120, channelId: 'c1', topic: 'rust', title: 'Rust 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' }
      ];

      const result = buildPack({
        topic: 'rust',
        minDurationSec: 600,
        maxDurationSec: 720,
        userMasteryLevel: 'beginner',
        candidates
      });

      expect(result.underFilled).toBe(true);
      expect(result.totalDurationSec).toBeLessThan(600);
    });

    test('should filter by topic', () => {
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 300, channelId: 'c1', topic: 'python', title: 'Python 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v2', durationSec: 300, channelId: 'c1', topic: 'javascript', title: 'JS 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
      ];

      const result = buildPack({
        topic: 'python',
        minDurationSec: 200,
        maxDurationSec: 400,
        userMasteryLevel: 'beginner',
        candidates
      });

      expect(result.items.every(item => {
        const candidate = candidates.find(c => c.videoId === item.videoId);
        return candidate?.topic === 'python';
      })).toBe(true);
    });

    test('should respect blocked channel IDs', () => {
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 300, channelId: 'c1', topic: 'python', title: 'Python 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v2', durationSec: 300, channelId: 'c2', topic: 'python', title: 'Python 2', channelTitle: 'Channel 2', level: 'beginner', thumbnail: '' },
      ];

      const result = buildPack({
        topic: 'python',
        minDurationSec: 250,
        maxDurationSec: 350,
        userMasteryLevel: 'beginner',
        candidates,
        blockedChannelIds: ['c1']
      });

      expect(result.items.every(item => item.channelId !== 'c1')).toBe(true);
    });

    test('should not exceed max duration', () => {
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 300, channelId: 'c1', topic: 'python', title: 'Python 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v2', durationSec: 400, channelId: 'c1', topic: 'python', title: 'Python 2', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v3', durationSec: 500, channelId: 'c2', topic: 'python', title: 'Python 3', channelTitle: 'Channel 2', level: 'beginner', thumbnail: '' },
      ];

      const result = buildPack({
        topic: 'python',
        minDurationSec: 600,
        maxDurationSec: 700,
        userMasteryLevel: 'beginner',
        candidates
      });

      expect(result.totalDurationSec).toBeLessThanOrEqual(700);
    });

    test('should return empty items when no candidates match topic', () => {
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 300, channelId: 'c1', topic: 'javascript', title: 'JS 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' }
      ];

      const result = buildPack({
        topic: 'python',
        minDurationSec: 250,
        maxDurationSec: 350,
        userMasteryLevel: 'beginner',
        candidates
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalDurationSec).toBe(0);
      expect(result.underFilled).toBe(true);
    });
  });

  describe('buildPackV2 (New API)', () => {
    test('should build playlist with exact topic and level match', () => {
      const candidates: Candidate[] = [
        { videoId: 'v1', durationSec: 300, level: 'beginner', topicTags: ['python'] },
        { videoId: 'v2', durationSec: 360, level: 'beginner', topicTags: ['python'] },
        { videoId: 'v3', durationSec: 240, level: 'intermediate', topicTags: ['python'] },
      ];

      const req: PackReq = {
        topic: 'python',
        level: 'beginner',
        targetSeconds: 600
      };

      const result = buildPackV2(candidates, req);

      expect(result.totalDurationSec).toBeGreaterThanOrEqual(540);
      expect(result.totalDurationSec).toBeLessThanOrEqual(660);
      expect(result.items.length).toBeGreaterThan(0);
    });

    test('should handle case-insensitive topic matching', () => {
      const candidates: Candidate[] = [
        { videoId: 'v1', durationSec: 300, level: 'beginner', topicTags: ['Python'] },
        { videoId: 'v2', durationSec: 300, level: 'beginner', topicTags: ['PYTHON'] },
      ];

      const req: PackReq = {
        topic: 'python',
        level: 'beginner',
        targetSeconds: 600
      };

      const result = buildPackV2(candidates, req);

      expect(result.items.length).toBe(2);
      expect(result.totalDurationSec).toBe(600);
    });

    test('should sort deterministically by duration then videoId', () => {
      const candidates: Candidate[] = [
        { videoId: 'v3', durationSec: 300, level: 'beginner', topicTags: ['python'] },
        { videoId: 'v1', durationSec: 300, level: 'beginner', topicTags: ['python'] },
        { videoId: 'v2', durationSec: 200, level: 'beginner', topicTags: ['python'] },
      ];

      const req: PackReq = {
        topic: 'python',
        level: 'beginner',
        targetSeconds: 800
      };

      const result = buildPackV2(candidates, req);

      // Should pick v2 (200s) first, then v1 (300s) over v3 (300s) due to alphabetical order
      expect(result.items[0]?.videoId).toBe('v2');
      expect(result.items[1]?.videoId).toBe('v1');
    });

    test('should not include duplicates', () => {
      const candidates: Candidate[] = [
        { videoId: 'v1', durationSec: 300, level: 'beginner', topicTags: ['python'] },
        { videoId: 'v1', durationSec: 300, level: 'beginner', topicTags: ['python'] }, // duplicate
        { videoId: 'v2', durationSec: 300, level: 'beginner', topicTags: ['python'] },
      ];

      const req: PackReq = {
        topic: 'python',
        level: 'beginner',
        targetSeconds: 600
      };

      const result = buildPackV2(candidates, req);

      const videoIds = result.items.map(item => item.videoId);
      const uniqueIds = [...new Set(videoIds)];
      expect(videoIds.length).toBe(uniqueIds.length);
    });

    test('should mark underFilled when target not met', () => {
      const candidates: Candidate[] = [
        { videoId: 'v1', durationSec: 100, level: 'beginner', topicTags: ['python'] },
      ];

      const req: PackReq = {
        topic: 'python',
        level: 'beginner',
        targetSeconds: 600
      };

      const result = buildPackV2(candidates, req);

      expect(result.underFilled).toBe(true);
      expect(result.totalDurationSec).toBeLessThan(540); // minDuration = 600-60
    });

    test('should filter out videos that exceed max duration when added', () => {
      const candidates: Candidate[] = [
        { videoId: 'v1', durationSec: 300, level: 'beginner', topicTags: ['python'] },
        { videoId: 'v2', durationSec: 500, level: 'beginner', topicTags: ['python'] },
      ];

      const req: PackReq = {
        topic: 'python',
        level: 'beginner',
        targetSeconds: 600
      };

      const result = buildPackV2(candidates, req);

      // Should only pick v1 (300s), not v2 (500s) since 300+500 > 660
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.videoId).toBe('v1');
    });
  });
});
