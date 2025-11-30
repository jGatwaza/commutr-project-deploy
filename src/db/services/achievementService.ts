import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { Achievement } from '../types.js';
import { getWatchHistory } from './watchHistoryService.js';
import { getUserCommuteHistory, calculateStreak } from './commuteSessionService.js';

// Badge catalog (matching existing achievement service)
const BADGE_CATALOG = [
  // Video milestones
  { id: 'video-1', type: 'videos', threshold: 1, title: 'First Video', description: 'Watched your first video', icon: '🎬' },
  { id: 'video-10', type: 'videos', threshold: 10, title: 'Getting Started', description: 'Watched 10 videos', icon: '🎥' },
  { id: 'video-50', type: 'videos', threshold: 50, title: 'Dedicated Learner', description: 'Watched 50 videos', icon: '📚' },
  { id: 'video-100', type: 'videos', threshold: 100, title: 'Century Club', description: 'Watched 100 videos', icon: '💯' },
  { id: 'video-500', type: 'videos', threshold: 500, title: 'Knowledge Seeker', description: 'Watched 500 videos', icon: '🔍' },
  
  // Watch time milestones (minutes)
  { id: 'time-60', type: 'minutes', threshold: 60, title: 'First Hour', description: 'Watched 1 hour of content', icon: '⏱️' },
  { id: 'time-300', type: 'minutes', threshold: 300, title: '5 Hour Club', description: 'Watched 5 hours of content', icon: '⏰' },
  { id: 'time-600', type: 'minutes', threshold: 600, title: 'Time Traveler', description: 'Watched 10 hours of content', icon: '🕰️' },
  { id: 'time-1800', type: 'minutes', threshold: 1800, title: 'Marathon Watcher', description: 'Watched 30 hours of content', icon: '🏃' },
  
  // Streak milestones
  { id: 'streak-3', type: 'streak', threshold: 3, title: 'On a Roll', description: '3 day streak', icon: '🔥' },
  { id: 'streak-7', type: 'streak', threshold: 7, title: 'Week Warrior', description: '7 day streak', icon: '⚡' },
  { id: 'streak-14', type: 'streak', threshold: 14, title: 'Fortnight Force', description: '14 day streak', icon: '💪' },
  { id: 'streak-30', type: 'streak', threshold: 30, title: 'Monthly Master', description: '30 day streak', icon: '👑' },
  
  // Commute milestones
  { id: 'commute-1', type: 'commute', threshold: 1, title: 'First Commute', description: 'Completed your first commute session', icon: '🚗' },
  { id: 'commute-10', type: 'commute', threshold: 10, title: 'Regular Rider', description: 'Completed 10 commute sessions', icon: '🚌' },
  { id: 'commute-50', type: 'commute', threshold: 50, title: 'Daily Driver', description: 'Completed 50 commute sessions', icon: '🚙' },
  { id: 'commute-100', type: 'commute', threshold: 100, title: 'Road Warrior', description: 'Completed 100 commute sessions', icon: '🏎️' },
] as const;

type BadgeType = 'minutes' | 'streak' | 'commute' | 'videos';

/**
 * Compute and update achievements for a user
 */
export async function computeAchievements(firebaseUid: string): Promise<{
  summary: {
    totalMinutes: number;
    totalSessions: number;
    totalVideos: number;
    currentStreak: number;
    longestStreak: number;
  };
  badges: Achievement[];
}> {
  const db = getDatabase();

  // Get userId
  const user = await db.collection('users').findOne({ firebaseUid });
  if (!user) {
    throw new Error('User not found');
  }

  // Fetch user data
  const [watchHistory, commuteHistory, streakData] = await Promise.all([
    getWatchHistory(firebaseUid, { limit: 10000 }),
    getUserCommuteHistory(firebaseUid, { limit: 1000 }),
    calculateStreak(firebaseUid),
  ]);

  // Calculate summary statistics
  const totalVideos = watchHistory.length;
  const totalWatchTimeSec = watchHistory.reduce((sum, w) => sum + w.durationSec, 0);
  const totalCommuteTimeSec = commuteHistory.reduce((sum, c) => sum + (c.actualDurationSec || c.durationSec), 0);
  const totalMinutes = Math.floor((totalWatchTimeSec + totalCommuteTimeSec) / 60);
  const totalSessions = commuteHistory.length;

  const summary = {
    totalMinutes,
    totalSessions,
    totalVideos,
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
  };

  // Process each badge
  const badges: Achievement[] = [];

  for (const badgeDef of BADGE_CATALOG) {
    let progressCurrent = 0;
    let earned = false;
    let earnedAt: Date | undefined;

    switch (badgeDef.type) {
      case 'minutes':
        progressCurrent = totalMinutes;
        earned = totalMinutes >= badgeDef.threshold;
        break;
      case 'commute':
        progressCurrent = totalSessions;
        earned = totalSessions >= badgeDef.threshold;
        if (earned && commuteHistory.length >= badgeDef.threshold) {
          earnedAt = commuteHistory[commuteHistory.length - badgeDef.threshold]!.timestamp;
        }
        break;
      case 'videos':
        progressCurrent = totalVideos;
        earned = totalVideos >= badgeDef.threshold;
        if (earned && watchHistory.length >= badgeDef.threshold) {
          earnedAt = watchHistory[watchHistory.length - badgeDef.threshold]!.completedAt || watchHistory[watchHistory.length - badgeDef.threshold]!.createdAt;
        }
        break;
      case 'streak':
        progressCurrent = streakData.longestStreak;
        earned = streakData.longestStreak >= badgeDef.threshold;
        if (earned && streakData.lastCommuteDate) {
          earnedAt = streakData.lastCommuteDate;
        }
        break;
    }

    const progressPct = (progressCurrent / badgeDef.threshold) * 100;

    // Check if badge already exists
    const existingBadge = await db.collection<Achievement>('achievements').findOne({
      userId: user._id,
      badgeId: badgeDef.id,
    });

    const achievement: Achievement = {
      _id: existingBadge?._id || new ObjectId(),
      userId: user._id,
      firebaseUid,
      badgeId: badgeDef.id,
      type: badgeDef.type as BadgeType,
      title: badgeDef.title,
      description: badgeDef.description,
      icon: badgeDef.icon,
      earned,
      ...(earnedAt && { earnedAt }),
      progressCurrent,
      progressTarget: badgeDef.threshold,
      progressPct: Math.min(progressPct, 100),
      createdAt: existingBadge?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // Upsert badge
    await db.collection<Achievement>('achievements').updateOne(
      { userId: user._id, badgeId: badgeDef.id },
      { $set: achievement },
      { upsert: true }
    );

    badges.push(achievement);
  }

  console.log(`✅ Updated ${badges.length} achievements for ${firebaseUid}`);
  return { summary, badges };
}

/**
 * Get user's achievements
 */
export async function getUserAchievements(firebaseUid: string): Promise<Achievement[]> {
  const db = getDatabase();
  return db
    .collection<Achievement>('achievements')
    .find({ firebaseUid })
    .sort({ earned: -1, progressPct: -1 })
    .toArray();
}

/**
 * Get earned badges only
 */
export async function getEarnedBadges(firebaseUid: string): Promise<Achievement[]> {
  const db = getDatabase();
  return db
    .collection<Achievement>('achievements')
    .find({ firebaseUid, earned: true })
    .sort({ earnedAt: -1 })
    .toArray();
}

/**
 * Get badges in progress (not earned yet, closest to completion)
 */
export async function getBadgesInProgress(firebaseUid: string, limit: number = 5): Promise<Achievement[]> {
  const db = getDatabase();
  return db
    .collection<Achievement>('achievements')
    .find({ firebaseUid, earned: false })
    .sort({ progressPct: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get recently earned badges
 */
export async function getRecentlyEarnedBadges(
  firebaseUid: string,
  limit: number = 10
): Promise<Achievement[]> {
  const db = getDatabase();
  return db
    .collection<Achievement>('achievements')
    .find({ firebaseUid, earned: true })
    .sort({ earnedAt: -1 })
    .limit(limit)
    .toArray();
}
