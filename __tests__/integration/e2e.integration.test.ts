/**
 * End-to-End Integration Tests
 * Tests complete user journeys through the system
 */

import { buildPack } from '../../src/pack/builder.js';
import { upsertWatched, getWatchedVideoIds, clearWatched } from '../../src/history/watchHistory.js';
import { computeAchievementsFromHistory } from '../../src/achievements/service.js';
import { getUserHistory } from '../../src/history/commuteHistory.js';
import type { Candidate as OldCandidate } from '../../src/stubs/metadata.js';
import type { CommuteSession } from '../../src/history/commuteHistory.js';

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    // Clear state before each test
    clearWatched();
  });

  describe('Complete User Journey: Playlist Creation to Achievements', () => {
    test('should create playlist, track watch history, and earn achievements', () => {
      // Step 1: User requests a playlist
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 300, channelId: 'c1', topic: 'python', title: 'Python 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v2', durationSec: 360, channelId: 'c1', topic: 'python', title: 'Python 2', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v3', durationSec: 240, channelId: 'c2', topic: 'python', title: 'Python 3', channelTitle: 'Channel 2', level: 'beginner', thumbnail: '' },
      ];

      const playlist = buildPack({
        topic: 'python',
        minDurationSec: 850,
        maxDurationSec: 950,
        userMasteryLevel: 'beginner',
        candidates
      });

      expect(playlist.items.length).toBeGreaterThan(0);
      expect(playlist.underFilled).toBe(false);

      // Step 2: User watches videos
      const userId = 'testUser123';
      playlist.items.forEach((video, index) => {
        upsertWatched({
          userId,
          videoId: video.videoId,
          title: `Video ${index + 1}`,
          durationSec: video.durationSec,
          progressPct: 100,
          topicTags: ['python'],
          completedAt: new Date().toISOString()
        });
      });

      // Step 3: Verify watch history
      const watchedIds = getWatchedVideoIds(userId);
      expect(watchedIds.size).toBe(playlist.items.length);
      playlist.items.forEach(video => {
        expect(watchedIds.has(video.videoId)).toBe(true);
      });

      // Step 4: Compute achievements
      const history: CommuteSession[] = [{
        id: 's1',
        timestamp: new Date().toISOString(),
        topics: ['python'],
        durationSec: playlist.totalDurationSec,
        videosWatched: []
      }];

      const achievements = computeAchievementsFromHistory(history, []);
      
      expect(achievements.summary.totalSessions).toBe(1);
      expect(achievements.summary.totalMinutes).toBeGreaterThan(0);
      
      // Should have earned some badges
      const earnedBadges = achievements.badges.filter(b => b.earned);
      expect(earnedBadges.length).toBeGreaterThan(0);
    });

    test('should filter out watched videos in subsequent playlists', () => {
      const userId = 'testUser123';
      
      // Initial playlist
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 300, channelId: 'c1', topic: 'python', title: 'Python 1', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v2', durationSec: 300, channelId: 'c1', topic: 'python', title: 'Python 2', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v3', durationSec: 300, channelId: 'c2', topic: 'python', title: 'Python 3', channelTitle: 'Channel 2', level: 'beginner', thumbnail: '' },
      ];

      const playlist1 = buildPack({
        topic: 'python',
        minDurationSec: 250,
        maxDurationSec: 350,
        userMasteryLevel: 'beginner',
        candidates
      });

      // Mark first video as watched
      upsertWatched({
        userId,
        videoId: playlist1.items[0]!.videoId,
        title: 'Watched Video',
        durationSec: 300,
        progressPct: 100,
        topicTags: ['python']
      });

      // Get watched video IDs
      const watchedIds = getWatchedVideoIds(userId, 'python');
      
      // Build second playlist with watched videos filtered out
      const availableCandidates = candidates.filter(c => !watchedIds.has(c.videoId));
      
      const playlist2 = buildPack({
        topic: 'python',
        minDurationSec: 250,
        maxDurationSec: 350,
        userMasteryLevel: 'beginner',
        candidates: availableCandidates
      });

      // Second playlist should not include watched video
      const playlist2VideoIds = playlist2.items.map(item => item.videoId);
      expect(playlist2VideoIds).not.toContain(playlist1.items[0]!.videoId);
    });
  });

  describe('Multi-Session Learning Journey', () => {
    test('should track progress across multiple sessions', () => {
      const userId = 'testUser123';
      const sessions: CommuteSession[] = [];

      // Simulate 5 learning sessions
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (4 - i)); // 5 consecutive days

        sessions.push({
          id: `s${i}`,
          timestamp: date.toISOString(),
          topics: ['python'],
          durationSec: 600,
          videosWatched: []
        });
      }

      const achievements = computeAchievementsFromHistory(sessions, []);

      expect(achievements.summary.totalSessions).toBe(5);
      expect(achievements.summary.totalMinutes).toBe(50); // 5 * 10 minutes
      expect(achievements.summary.longestStreak).toBeGreaterThanOrEqual(5);

      // Should have earned multi-session badges
      const fiveCommutesBadge = achievements.badges.find(b => b.id === 'commute-5');
      expect(fiveCommutesBadge?.earned).toBe(true);
    });

    test('should accumulate watch time from multiple videos', () => {
      const userId = 'testUser123';
      
      // Watch 10 videos of 5 minutes each = 50 minutes
      for (let i = 0; i < 10; i++) {
        upsertWatched({
          userId,
          videoId: `v${i}`,
          title: `Video ${i}`,
          durationSec: 300,
          progressPct: 100,
          topicTags: ['python'],
          completedAt: new Date().toISOString()
        });
      }

      // Create watch history array for achievements
      const watchHistory = Array.from({ length: 10 }, (_, i) => ({
        id: `w${i}`,
        userId,
        videoId: `v${i}`,
        title: `Video ${i}`,
        durationSec: 300,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const achievements = computeAchievementsFromHistory([], watchHistory);

      expect(achievements.summary.totalMinutes).toBe(50);
      
      // Should have earned time-based badges
      const thirtyMinBadge = achievements.badges.find(b => b.id === 'minutes-30');
      expect(thirtyMinBadge?.earned).toBe(true);
    });
  });

  describe('Topic-Based Learning Path', () => {
    test('should support multiple topics in watch history', () => {
      const userId = 'testUser123';
      
      // Watch Python videos
      for (let i = 0; i < 3; i++) {
        upsertWatched({
          userId,
          videoId: `python_${i}`,
          title: `Python Video ${i}`,
          durationSec: 300,
          progressPct: 100,
          topicTags: ['python']
        });
      }

      // Watch JavaScript videos
      for (let i = 0; i < 2; i++) {
        upsertWatched({
          userId,
          videoId: `js_${i}`,
          title: `JS Video ${i}`,
          durationSec: 300,
          progressPct: 100,
          topicTags: ['javascript']
        });
      }

      // Get watched IDs by topic
      const pythonIds = getWatchedVideoIds(userId, 'python');
      const jsIds = getWatchedVideoIds(userId, 'javascript');

      expect(pythonIds.size).toBe(3);
      expect(jsIds.size).toBe(2);
    });

    test('should handle videos with multiple topic tags', () => {
      const userId = 'testUser123';
      
      upsertWatched({
        userId,
        videoId: 'multi_topic',
        title: 'Full Stack Tutorial',
        durationSec: 600,
        progressPct: 100,
        topicTags: ['python', 'javascript', 'web development']
      });

      expect(getWatchedVideoIds(userId, 'python').has('multi_topic')).toBe(true);
      expect(getWatchedVideoIds(userId, 'javascript').has('multi_topic')).toBe(true);
      expect(getWatchedVideoIds(userId, 'web development').has('multi_topic')).toBe(true);
    });
  });

  describe('Achievement Progression', () => {
    test('should show badge progress for partially completed goals', () => {
      const history: CommuteSession[] = [
        {
          id: 's1',
          timestamp: new Date().toISOString(),
          topics: ['python'],
          durationSec: 600, // 10 minutes
          videosWatched: []
        }
      ];

      const achievements = computeAchievementsFromHistory(history, []);

      // Check 30-minute badge progress
      const thirtyMinBadge = achievements.badges.find(b => b.id === 'minutes-30');
      expect(thirtyMinBadge?.earned).toBe(false);
      expect(thirtyMinBadge?.progressCurrent).toBe(10);
      expect(thirtyMinBadge?.progressTarget).toBe(30);
    });

    test('should earn multiple badges simultaneously', () => {
      const history: CommuteSession[] = Array(5).fill(null).map((_, i) => ({
        id: `s${i}`,
        timestamp: new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000).toISOString(),
        topics: ['python'],
        durationSec: 1200, // 20 minutes each
        videosWatched: []
      }));

      const achievements = computeAchievementsFromHistory(history, []);

      // Total: 5 sessions * 20 min = 100 minutes
      expect(achievements.summary.totalMinutes).toBe(100);
      expect(achievements.summary.totalSessions).toBe(5);

      // Should earn multiple badges
      const earnedBadges = achievements.badges.filter(b => b.earned);
      expect(earnedBadges.length).toBeGreaterThan(3);

      // Specific badges we expect
      expect(achievements.badges.find(b => b.id === 'minutes-30')?.earned).toBe(true);
      expect(achievements.badges.find(b => b.id === 'minutes-100')?.earned).toBe(true);
      expect(achievements.badges.find(b => b.id === 'commute-5')?.earned).toBe(true);
    });
  });

  describe('Playlist Optimization', () => {
    test('should create optimal playlists for different durations', () => {
      const candidates: OldCandidate[] = [
        { videoId: 'v1', durationSec: 180, channelId: 'c1', topic: 'python', title: 'Short', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v2', durationSec: 300, channelId: 'c1', topic: 'python', title: 'Medium', channelTitle: 'Channel 1', level: 'beginner', thumbnail: '' },
        { videoId: 'v3', durationSec: 600, channelId: 'c2', topic: 'python', title: 'Long', channelTitle: 'Channel 2', level: 'beginner', thumbnail: '' },
        { videoId: 'v4', durationSec: 360, channelId: 'c2', topic: 'python', title: 'Medium-Long', channelTitle: 'Channel 2', level: 'beginner', thumbnail: '' },
      ];

      // Test different commute durations
      const durations = [300, 600, 900]; // 5min, 10min, 15min

      durations.forEach(targetDuration => {
        const playlist = buildPack({
          topic: 'python',
          minDurationSec: targetDuration - 60,
          maxDurationSec: targetDuration + 60,
          userMasteryLevel: 'beginner',
          candidates
        });

        expect(playlist.items.length).toBeGreaterThan(0);
        expect(playlist.totalDurationSec).toBeLessThanOrEqual(targetDuration + 60);
      });
    });

    test('should handle empty candidate pool gracefully', () => {
      const playlist = buildPack({
        topic: 'python',
        minDurationSec: 540,
        maxDurationSec: 660,
        userMasteryLevel: 'beginner',
        candidates: []
      });

      expect(playlist.items).toHaveLength(0);
      expect(playlist.totalDurationSec).toBe(0);
      expect(playlist.underFilled).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    test('should maintain consistency between watch history and achievements', () => {
      const userId = 'testUser123';
      
      // Create watch history
      const videosWatched = 5;
      const minutesPerVideo = 5;
      
      for (let i = 0; i < videosWatched; i++) {
        upsertWatched({
          userId,
          videoId: `v${i}`,
          title: `Video ${i}`,
          durationSec: minutesPerVideo * 60,
          progressPct: 100,
          topicTags: ['python'],
          completedAt: new Date().toISOString()
        });
      }

      // Build watch history array for achievements
      const watchHistory = Array.from({ length: videosWatched }, (_, i) => ({
        id: `w${i}`,
        userId,
        videoId: `v${i}`,
        title: `Video ${i}`,
        durationSec: minutesPerVideo * 60,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const achievements = computeAchievementsFromHistory([], watchHistory);
      const watchedIds = getWatchedVideoIds(userId);

      // Consistency checks
      expect(watchedIds.size).toBe(videosWatched);
      expect(achievements.summary.totalMinutes).toBe(videosWatched * minutesPerVideo);
      
      const fiveVideosBadge = achievements.badges.find(b => b.id === 'video-5');
      expect(fiveVideosBadge?.earned).toBe(true);
    });
  });
});
