/**
 * Unit tests for Analytics Service
 * Tests: getWatchAnalytics function and analytics calculations
 */

import { getWatchAnalytics } from '../../src/db/services/watchHistoryService.js';
import { getDatabase } from '../../src/db/connection.js';
import { ObjectId } from 'mongodb';
import type { WatchHistory } from '../../src/db/types.js';

// Mock the database connection
jest.mock('../../src/db/connection.js');

describe('Analytics Service', () => {
  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      countDocuments: jest.fn(),
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWatchAnalytics', () => {
    test('should calculate basic analytics with no watch history', async () => {
      mockCollection.toArray.mockResolvedValue([]);

      const result = await getWatchAnalytics('testUser', 'all');

      expect(result.totalVideos).toBe(0);
      expect(result.totalTimeSec).toBe(0);
      expect(result.completionRate.completionRate).toBe(0);
      expect(result.streak).toBe(0);
    });

    test('should calculate total videos and duration', async () => {
      const now = new Date();
      const mockHistory: WatchHistory[] = [
        {
          _id: new ObjectId(),
          watchId: 'w1',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v1',
          title: 'Video 1',
          durationSec: 300,
          progressPct: 100,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: new ObjectId(),
          watchId: 'w2',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v2',
          title: 'Video 2',
          durationSec: 240,
          progressPct: 100,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockCollection.toArray.mockResolvedValueOnce(mockHistory).mockResolvedValueOnce(mockHistory);

      const result = await getWatchAnalytics('testUser', 'all');

      expect(result.totalVideos).toBe(2);
      expect(result.totalTimeSec).toBe(540);
    });

    test('should calculate completion rate correctly', async () => {
      const now = new Date();
      const mockHistory: WatchHistory[] = [
        {
          _id: new ObjectId(),
          watchId: 'w1',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v1',
          title: 'Video 1',
          durationSec: 300,
          progressPct: 100,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: new ObjectId(),
          watchId: 'w2',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v2',
          title: 'Video 2',
          durationSec: 240,
          progressPct: 50,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: new ObjectId(),
          watchId: 'w3',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v3',
          title: 'Video 3',
          durationSec: 360,
          progressPct: 95,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockCollection.toArray.mockResolvedValueOnce(mockHistory).mockResolvedValueOnce(mockHistory);

      const result = await getWatchAnalytics('testUser', 'all');

      expect(result.completionRate.totalVideos).toBe(3);
      expect(result.completionRate.completedVideos).toBe(2); // >= 90% progress
      expect(result.completionRate.completionRate).toBeCloseTo(66.67, 1);
    });

    test('should group analytics by topic', async () => {
      const now = new Date();
      const mockHistory: WatchHistory[] = [
        {
          _id: new ObjectId(),
          watchId: 'w1',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v1',
          title: 'Python Video',
          durationSec: 300,
          progressPct: 100,
          topicTags: ['python'],
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: new ObjectId(),
          watchId: 'w2',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v2',
          title: 'Python Video 2',
          durationSec: 240,
          progressPct: 90,
          topicTags: ['python'],
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: new ObjectId(),
          watchId: 'w3',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v3',
          title: 'JS Video',
          durationSec: 180,
          progressPct: 100,
          topicTags: ['javascript'],
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockCollection.toArray.mockResolvedValueOnce(mockHistory).mockResolvedValueOnce(mockHistory);

      const result = await getWatchAnalytics('testUser', 'all');

      expect(result.byTopic).toHaveLength(2);
      
      const pythonTopic = result.byTopic.find(t => t.topic === 'python');
      expect(pythonTopic).toBeDefined();
      expect(pythonTopic?.videoCount).toBe(2);
      expect(pythonTopic?.totalDuration).toBe(540);
      expect(pythonTopic?.avgCompletion).toBe(95);

      const jsTopic = result.byTopic.find(t => t.topic === 'javascript');
      expect(jsTopic).toBeDefined();
      expect(jsTopic?.videoCount).toBe(1);
      expect(jsTopic?.totalDuration).toBe(180);
    });

    test('should categorize by time of day', async () => {
      const morning = new Date('2024-01-01T08:00:00Z');
      const afternoon = new Date('2024-01-01T14:00:00Z');
      const evening = new Date('2024-01-01T20:00:00Z');

      const mockHistory: WatchHistory[] = [
        {
          _id: new ObjectId(),
          watchId: 'w1',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v1',
          title: 'Morning Video',
          durationSec: 300,
          progressPct: 100,
          completedAt: morning,
          createdAt: morning,
          updatedAt: morning,
        },
        {
          _id: new ObjectId(),
          watchId: 'w2',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v2',
          title: 'Afternoon Video',
          durationSec: 240,
          progressPct: 100,
          completedAt: afternoon,
          createdAt: afternoon,
          updatedAt: afternoon,
        },
        {
          _id: new ObjectId(),
          watchId: 'w3',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v3',
          title: 'Evening Video',
          durationSec: 180,
          progressPct: 100,
          completedAt: evening,
          createdAt: evening,
          updatedAt: evening,
        },
      ];

      mockCollection.toArray.mockResolvedValueOnce(mockHistory).mockResolvedValueOnce(mockHistory);

      const result = await getWatchAnalytics('testUser', 'all');

      const morningStats = result.byTimeOfDay.find(t => t.timePeriod === 'morning');
      const afternoonStats = result.byTimeOfDay.find(t => t.timePeriod === 'afternoon');
      const eveningStats = result.byTimeOfDay.find(t => t.timePeriod === 'evening');

      expect(morningStats?.videoCount).toBe(1);
      expect(morningStats?.totalDuration).toBe(300);
      expect(afternoonStats?.videoCount).toBe(1);
      expect(afternoonStats?.totalDuration).toBe(240);
      expect(eveningStats?.videoCount).toBe(1);
      expect(eveningStats?.totalDuration).toBe(180);
    });

    test('should categorize by commute length', async () => {
      const now = new Date();
      const mockHistory: WatchHistory[] = [
        {
          _id: new ObjectId(),
          watchId: 'w1',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v1',
          title: 'Short Video',
          durationSec: 360, // 6 min
          progressPct: 100,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: new ObjectId(),
          watchId: 'w2',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v2',
          title: 'Medium Video',
          durationSec: 660, // 11 min
          progressPct: 100,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: new ObjectId(),
          watchId: 'w3',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v3',
          title: 'Long Video',
          durationSec: 900, // 15 min
          progressPct: 100,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockCollection.toArray.mockResolvedValueOnce(mockHistory).mockResolvedValueOnce(mockHistory);

      const result = await getWatchAnalytics('testUser', 'all');

      const short = result.byCommuteLength.find(c => c.commuteLength === '5min');
      const medium = result.byCommuteLength.find(c => c.commuteLength === '10min');
      const long = result.byCommuteLength.find(c => c.commuteLength === '15min');

      expect(short?.videoCount).toBe(1);
      expect(medium?.videoCount).toBe(1);
      expect(long?.videoCount).toBe(1);
    });

    test('should filter by timeframe (week)', async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);

      const mockHistory: WatchHistory[] = [
        {
          _id: new ObjectId(),
          watchId: 'w1',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v1',
          title: 'Recent Video',
          durationSec: 300,
          progressPct: 100,
          completedAt: weekAgo,
          createdAt: weekAgo,
          updatedAt: weekAgo,
        },
      ];

      mockCollection.toArray.mockResolvedValueOnce(mockHistory).mockResolvedValueOnce(mockHistory);

      const result = await getWatchAnalytics('testUser', 'week');

      expect(mockDb.collection).toHaveBeenCalledWith('watch_history');
      expect(result.totalVideos).toBe(1);
    });

    test('should calculate streak correctly for consecutive days', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const mockHistory: WatchHistory[] = [
        {
          _id: new ObjectId(),
          watchId: 'w1',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v1',
          title: 'Video Today',
          durationSec: 300,
          progressPct: 100,
          completedAt: today,
          createdAt: today,
          updatedAt: today,
        },
        {
          _id: new ObjectId(),
          watchId: 'w2',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v2',
          title: 'Video Yesterday',
          durationSec: 300,
          progressPct: 100,
          completedAt: yesterday,
          createdAt: yesterday,
          updatedAt: yesterday,
        },
        {
          _id: new ObjectId(),
          watchId: 'w3',
          userId: new ObjectId(),
          firebaseUid: 'testUser',
          videoId: 'v3',
          title: 'Video Two Days Ago',
          durationSec: 300,
          progressPct: 100,
          completedAt: twoDaysAgo,
          createdAt: twoDaysAgo,
          updatedAt: twoDaysAgo,
        },
      ];

      mockCollection.toArray.mockResolvedValueOnce(mockHistory).mockResolvedValueOnce(mockHistory);

      const result = await getWatchAnalytics('testUser', 'all');

      expect(result.streak).toBeGreaterThan(0);
    });
  });
});
