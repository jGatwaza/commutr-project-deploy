import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { WatchHistory } from '../types.js';
import { generateWatchId } from '../../lib/utils.js';

/**
 * Upsert watch history (create or update existing entry)
 * Implements deduplication logic: one entry per (userId, videoId)
 */
export async function upsertWatchHistory(data: {
  firebaseUid: string;
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnail?: string;
  durationSec: number;
  topicTags?: string[];
  difficulty?: string;
  progressPct: number;
  startedAt?: Date;
  completedAt?: Date;
  playlistId?: string;
  commuteSessionId?: string;
  source?: string;
}): Promise<WatchHistory> {
  const db = getDatabase();
  const now = new Date();

  // Get userId from firebaseUid
  const user = await db.collection('users').findOne({ firebaseUid: data.firebaseUid });
  if (!user) {
    throw new Error('User not found. Please authenticate first.');
  }

  // Check for existing entry
  const existing = await db.collection<WatchHistory>('watch_history').findOne({
    userId: user._id,
    videoId: data.videoId,
  });

  if (existing) {
    // Update existing entry (prefer newer completion timestamp)
    const shouldUpdate = 
      data.completedAt && 
      (!existing.completedAt || data.completedAt >= existing.completedAt);

    if (shouldUpdate || data.progressPct > (existing.progressPct || 0)) {
      const updateDoc: Partial<WatchHistory> = {
        title: data.title,
        ...(data.channelTitle && { channelTitle: data.channelTitle }),
        ...(data.thumbnail && { thumbnail: data.thumbnail }),
        durationSec: data.durationSec,
        ...(data.topicTags && { topicTags: data.topicTags }),
        ...(data.difficulty && { difficulty: data.difficulty }),
        progressPct: Math.max(data.progressPct, existing.progressPct || 0),
        ...(data.startedAt && { startedAt: data.startedAt }),
        ...(data.completedAt && { completedAt: data.completedAt }),
        ...(data.source && { source: data.source }),
        updatedAt: now,
      };

      await db.collection<WatchHistory>('watch_history').updateOne(
        { _id: existing._id },
        { $set: updateDoc }
      );

      return { ...existing, ...updateDoc };
    }

    return existing;
  }

  // Create new entry
  const watchHistory: WatchHistory = {
    _id: new ObjectId(),
    watchId: generateWatchId(),
    userId: user._id,
    firebaseUid: data.firebaseUid,
    videoId: data.videoId,
    title: data.title,
    ...(data.channelTitle && { channelTitle: data.channelTitle }),
    ...(data.thumbnail && { thumbnail: data.thumbnail }),
    durationSec: data.durationSec,
    ...(data.topicTags && { topicTags: data.topicTags }),
    ...(data.difficulty && { difficulty: data.difficulty }),
    progressPct: data.progressPct,
    ...(data.startedAt && { startedAt: data.startedAt }),
    ...(data.completedAt && { completedAt: data.completedAt }),
    ...(data.source && { source: data.source }),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<WatchHistory>('watch_history').insertOne(watchHistory);
  console.log(`✅ Recorded watch: ${data.videoId} (${data.progressPct}%)`);
  return watchHistory;
}

/**
 * Get user's watch history
 */
export async function getWatchHistory(
  firebaseUid: string,
  options: {
    limit?: number;
    skip?: number;
    completedOnly?: boolean;
    searchQuery?: string;
  } = {}
): Promise<WatchHistory[]> {
  const db = getDatabase();
  const { limit = 50, skip = 0, completedOnly = false, searchQuery } = options;

  const query: any = { firebaseUid };
  if (completedOnly) {
    query.progressPct = { $gte: 90 };
  }
  
  // Add case-insensitive title search if query provided
  if (searchQuery && searchQuery.trim()) {
    query.title = { $regex: searchQuery.trim(), $options: 'i' };
  }

  return db
    .collection<WatchHistory>('watch_history')
    .find(query)
    .sort({ completedAt: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

/**
 * Get watched video IDs for a user
 */
export async function getWatchedVideoIds(firebaseUid: string): Promise<string[]> {
  const db = getDatabase();
  const watched = await db
    .collection<WatchHistory>('watch_history')
    .find({ firebaseUid }, { projection: { videoId: 1 } })
    .toArray();

  return watched.map(w => w.videoId);
}

/**
 * Get watch analytics for a user
 */
export async function getWatchAnalytics(
  firebaseUid: string,
  timeframe: 'week' | 'month' | 'all' = 'month'
): Promise<{
  streak: number;
  completionRate: {
    completionRate: number;
    totalVideos: number;
    completedVideos: number;
  };
  byTopic: Array<{ 
    topic: string; 
    videoCount: number; 
    totalDuration: number;
    avgCompletion: number;
  }>;
  byCommuteLength: Array<{
    commuteLength: string;
    videoCount: number;
    totalDuration: number;
  }>;
  byTimeOfDay: Array<{
    timePeriod: string;
    videoCount: number;
    totalDuration: number;
  }>;
  recentVideos: WatchHistory[];
  totalVideos: number;
  totalTimeSec: number;
}> {
  const db = getDatabase();

  // Calculate date filter
  let dateFilter = {};
  if (timeframe !== 'all') {
    const daysAgo = timeframe === 'week' ? 7 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    dateFilter = { completedAt: { $gte: cutoffDate } };
  }

  // Get all watch history for timeframe
  const watchHistory = await db
    .collection<WatchHistory>('watch_history')
    .find({ firebaseUid, ...dateFilter })
    .toArray();

  const getReferenceDate = (entry: WatchHistory): Date | undefined =>
    entry.startedAt || entry.completedAt || entry.updatedAt || entry.createdAt;

  const getWatchDurationSec = (entry: WatchHistory): number => {
    if (entry.startedAt && entry.completedAt) {
      return Math.max(0, Math.round((entry.completedAt.getTime() - entry.startedAt.getTime()) / 1000));
    }
    return entry.durationSec || 0;
  };

  const totalVideos = watchHistory.length;
  const totalTimeSec = watchHistory.reduce((sum, w) => sum + getWatchDurationSec(w), 0);
  const completedCount = watchHistory.filter(w => w.progressPct >= 90).length;
  const completionRate = totalVideos > 0 ? (completedCount / totalVideos) * 100 : 0;

  // By topic statistics
  const topicMap = new Map<string, { count: number; totalDuration: number }>();
  watchHistory.forEach(entry => {
    if (entry.topicTags) {
      entry.topicTags.forEach(topic => {
        const existing = topicMap.get(topic) || { count: 0, totalDuration: 0 };
        topicMap.set(topic, {
          count: existing.count + 1,
          totalDuration: existing.totalDuration + getWatchDurationSec(entry),
        });
      });
    }
  });

  const byTopic = Array.from(topicMap.entries())
    .map(([topic, stats]) => {
      // Calculate average completion for this topic
      const topicVideos = watchHistory.filter(w => w.topicTags?.includes(topic));
      const avgCompletion = topicVideos.length > 0
        ? topicVideos.reduce((sum, w) => sum + w.progressPct, 0) / topicVideos.length
        : 0;

      return {
        topic,
        videoCount: stats.count,
        totalDuration: stats.totalDuration,
        avgCompletion,
      };
    })
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 10);

  // Calculate streak (consecutive days with watch activity)
  const uniqueDays = new Set(
    watchHistory
      .map(w => getReferenceDate(w))
      .filter(Boolean)
      .map(date => date!.toDateString())
  );
  
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    if (uniqueDays.has(checkDate.toDateString())) {
      streak++;
    } else if (i > 0) {
      break; // Streak broken
    }
  }

  // By commute length (approximate based on video duration)
  const byCommuteLength = [
    { commuteLength: '5min', videoCount: 0, totalDuration: 0 },
    { commuteLength: '10min', videoCount: 0, totalDuration: 0 },
    { commuteLength: '15min', videoCount: 0, totalDuration: 0 },
  ];

  watchHistory.forEach(w => {
    const watchDuration = getWatchDurationSec(w);
    const mins = Math.ceil(watchDuration / 60);
    if (mins <= 7) {
      byCommuteLength[0]!.videoCount++;
      byCommuteLength[0]!.totalDuration += watchDuration;
    } else if (mins <= 12) {
      byCommuteLength[1]!.videoCount++;
      byCommuteLength[1]!.totalDuration += watchDuration;
    } else if (mins <= 20) {
      byCommuteLength[2]!.videoCount++;
      byCommuteLength[2]!.totalDuration += watchDuration;
    }
  });

  // By time of day
  const byTimeOfDay = [
    { timePeriod: 'morning', videoCount: 0, totalDuration: 0 },
    { timePeriod: 'afternoon', videoCount: 0, totalDuration: 0 },
    { timePeriod: 'evening', videoCount: 0, totalDuration: 0 },
  ];

  watchHistory.forEach(w => {
    const referenceDate = w.completedAt || w.startedAt;
    if (!referenceDate) return;

    const hour = new Date(referenceDate).getHours();
    const watchDuration = getWatchDurationSec(w);

    if (hour >= 5 && hour < 12) {
      byTimeOfDay[0]!.videoCount++;
      byTimeOfDay[0]!.totalDuration += watchDuration;
    } else if (hour >= 12 && hour < 18) {
      byTimeOfDay[1]!.videoCount++;
      byTimeOfDay[1]!.totalDuration += watchDuration;
    } else {
      byTimeOfDay[2]!.videoCount++;
      byTimeOfDay[2]!.totalDuration += watchDuration;
    }
  });

  // Recent videos
  const recentVideos = await db
    .collection<WatchHistory>('watch_history')
    .find({ firebaseUid })
    .sort({ completedAt: -1, updatedAt: -1 })
    .limit(10)
    .toArray();

  return {
    streak,
    completionRate: {
      completionRate,
      totalVideos,
      completedVideos: completedCount,
    },
    byTopic,
    byCommuteLength,
    byTimeOfDay,
    recentVideos,
    totalVideos,
    totalTimeSec,
  };
}

/**
 * Check if video is watched
 */
export async function isVideoWatched(
  firebaseUid: string,
  videoId: string
): Promise<boolean> {
  const db = getDatabase();
  const watch = await db.collection<WatchHistory>('watch_history').findOne({
    firebaseUid,
    videoId,
    progressPct: { $gte: 90 },
  });
  return watch !== null;
}

/**
 * Get watch count for a specific topic
 */
export async function getTopicWatchCount(
  firebaseUid: string,
  topic: string
): Promise<number> {
  const db = getDatabase();
  return db.collection<WatchHistory>('watch_history').countDocuments({
    firebaseUid,
    topicTags: topic,
  });
}

/**
 * Delete watch history entry
 */
export async function deleteWatchHistory(
  watchId: string,
  firebaseUid: string
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.collection<WatchHistory>('watch_history').deleteOne({
    watchId,
    firebaseUid, // Ensure user owns the watch history
  });
  return result.deletedCount > 0;
}
