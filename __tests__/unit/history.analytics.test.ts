import {
  upsertWatched,
  clearWatched,
  getWatchAnalytics,
  WatchedEntryInput
} from '../../src/history/watchHistory.js';

// Clear watched entries before each test
beforeEach(() => {
  clearWatched();
});

describe('Watch History Analytics Tests', () => {
  
  describe('getWatchAnalytics', () => {
    test('returns empty analytics for user with no watch history', () => {
      const analytics = getWatchAnalytics('u_empty', 'month');
      
      expect(analytics.byTopic).toEqual([]);
      expect(analytics.byCommuteLength).toEqual([]);
      expect(analytics.byTimeOfDay).toEqual([]);
      expect(analytics.completionRate.completionRate).toBe(0);
      expect(analytics.completionRate.totalVideos).toBe(0);
      expect(analytics.streak).toBe(0);
      expect(analytics.weeklyTrend).toEqual([]);
    });

    test('aggregates videos by topic correctly', () => {
      // Add videos with different topics
      upsertWatched({
        userId: 'u_123',
        videoId: 'v1',
        title: 'Python Basics',
        durationSec: 600,
        topicTags: ['python', 'programming'],
        completedAt: new Date().toISOString(),
        progressPct: 100
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v2',
        title: 'Python Advanced',
        durationSec: 900,
        topicTags: ['python'],
        completedAt: new Date().toISOString(),
        progressPct: 95
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v3',
        title: 'JavaScript Intro',
        durationSec: 500,
        topicTags: ['javascript', 'programming'],
        completedAt: new Date().toISOString(),
        progressPct: 80
      });
      
      const analytics = getWatchAnalytics('u_123', 'all');
      
      expect(analytics.byTopic.length).toBe(3);
      
      // Python should be first (most duration)
      const pythonTopic = analytics.byTopic.find(t => t.topic === 'python');
      expect(pythonTopic).toBeDefined();
      expect(pythonTopic!.videoCount).toBe(2);
      expect(pythonTopic!.totalDuration).toBe(1500);
      expect(pythonTopic!.avgCompletion).toBeCloseTo(97.5, 1);
      
      // Programming should have 2 videos
      const programmingTopic = analytics.byTopic.find(t => t.topic === 'programming');
      expect(programmingTopic).toBeDefined();
      expect(programmingTopic!.videoCount).toBe(2);
    });

    test('aggregates videos by commute length correctly', () => {
      // Add videos of different lengths
      upsertWatched({
        userId: 'u_123',
        videoId: 'v1',
        title: 'Short Video',
        durationSec: 250, // 5min bucket
        completedAt: new Date().toISOString(),
        progressPct: 100
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v2',
        title: 'Medium Video',
        durationSec: 550, // 10min bucket
        completedAt: new Date().toISOString(),
        progressPct: 100
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v3',
        title: 'Long Video',
        durationSec: 850, // 15min bucket
        completedAt: new Date().toISOString(),
        progressPct: 100
      });
      
      const analytics = getWatchAnalytics('u_123', 'all');
      
      expect(analytics.byCommuteLength.length).toBe(3);
      
      // Check 5min bucket
      const fiveMin = analytics.byCommuteLength.find(c => c.commuteLength === '5min');
      expect(fiveMin).toBeDefined();
      expect(fiveMin!.videoCount).toBe(1);
      expect(fiveMin!.totalDuration).toBe(250);
      
      // Check 10min bucket
      const tenMin = analytics.byCommuteLength.find(c => c.commuteLength === '10min');
      expect(tenMin).toBeDefined();
      expect(tenMin!.videoCount).toBe(1);
      
      // Check 15min bucket
      const fifteenMin = analytics.byCommuteLength.find(c => c.commuteLength === '15min');
      expect(fifteenMin).toBeDefined();
      expect(fifteenMin!.videoCount).toBe(1);
    });

    test('aggregates videos by time of day correctly', () => {
      const morning = new Date();
      morning.setHours(9, 0, 0, 0);
      
      const afternoon = new Date();
      afternoon.setHours(14, 0, 0, 0);
      
      const evening = new Date();
      evening.setHours(20, 0, 0, 0);
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v1',
        title: 'Morning Video',
        durationSec: 300,
        completedAt: morning.toISOString(),
        progressPct: 100
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v2',
        title: 'Afternoon Video',
        durationSec: 400,
        completedAt: afternoon.toISOString(),
        progressPct: 100
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v3',
        title: 'Evening Video',
        durationSec: 500,
        completedAt: evening.toISOString(),
        progressPct: 100
      });
      
      const analytics = getWatchAnalytics('u_123', 'all');
      
      expect(analytics.byTimeOfDay.length).toBe(3);
      
      const morningPeriod = analytics.byTimeOfDay.find(t => t.timePeriod === 'morning');
      expect(morningPeriod).toBeDefined();
      expect(morningPeriod!.videoCount).toBe(1);
      
      const afternoonPeriod = analytics.byTimeOfDay.find(t => t.timePeriod === 'afternoon');
      expect(afternoonPeriod).toBeDefined();
      expect(afternoonPeriod!.videoCount).toBe(1);
      
      const eveningPeriod = analytics.byTimeOfDay.find(t => t.timePeriod === 'evening');
      expect(eveningPeriod).toBeDefined();
      expect(eveningPeriod!.videoCount).toBe(1);
    });

    test('calculates completion rate correctly', () => {
      // Add videos with different completion rates
      upsertWatched({
        userId: 'u_123',
        videoId: 'v1',
        title: 'Completed Video',
        durationSec: 300,
        completedAt: new Date().toISOString(),
        progressPct: 100
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v2',
        title: 'Almost Completed',
        durationSec: 300,
        completedAt: new Date().toISOString(),
        progressPct: 95
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v3',
        title: 'Partially Watched',
        durationSec: 300,
        completedAt: new Date().toISOString(),
        progressPct: 50
      });
      
      const analytics = getWatchAnalytics('u_123', 'all');
      
      // 2 out of 3 videos >= 90% completion
      expect(analytics.completionRate.completionRate).toBeCloseTo(66.67, 1);
      expect(analytics.completionRate.totalVideos).toBe(3);
    });

    test('calculates learning streak correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      // Add videos for consecutive days
      upsertWatched({
        userId: 'u_123',
        videoId: 'v1',
        title: 'Today Video',
        durationSec: 300,
        completedAt: today.toISOString(),
        progressPct: 100
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v2',
        title: 'Yesterday Video',
        durationSec: 300,
        completedAt: yesterday.toISOString(),
        progressPct: 100
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'v3',
        title: 'Two Days Ago Video',
        durationSec: 300,
        completedAt: twoDaysAgo.toISOString(),
        progressPct: 100
      });
      
      const analytics = getWatchAnalytics('u_123', 'all');
      
      expect(analytics.streak).toBe(3);
    });

    test('respects timeframe filter', () => {
      const now = new Date();
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      // Add recent video
      upsertWatched({
        userId: 'u_123',
        videoId: 'v1',
        title: 'Recent Video',
        durationSec: 300,
        topicTags: ['recent'],
        completedAt: now.toISOString(),
        progressPct: 100
      });
      
      // Add old video
      upsertWatched({
        userId: 'u_123',
        videoId: 'v2',
        title: 'Old Video',
        durationSec: 300,
        topicTags: ['old'],
        completedAt: twoWeeksAgo.toISOString(),
        progressPct: 100
      });
      
      // Week timeframe should only include recent video
      const weekAnalytics = getWatchAnalytics('u_123', 'week');
      expect(weekAnalytics.completionRate.totalVideos).toBe(1);
      expect(weekAnalytics.byTopic.find(t => t.topic === 'recent')).toBeDefined();
      expect(weekAnalytics.byTopic.find(t => t.topic === 'old')).toBeUndefined();
      
      // All timeframe should include both
      const allAnalytics = getWatchAnalytics('u_123', 'all');
      expect(allAnalytics.completionRate.totalVideos).toBe(2);
    });
  });
});
