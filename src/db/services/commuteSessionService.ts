import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { CommuteSession, SessionVideo } from '../types.js';
import { generateSessionId } from '../../lib/utils.js';

/**
 * Save a commute session
 */
export async function saveCommuteSession(data: {
  firebaseUid: string;
  topics: string[];
  durationSec: number;
  actualDurationSec?: number;
  playlistId?: string;
  videosWatched: SessionVideo[];
  completionRate?: number;
  satisfactionRating?: number;
}): Promise<CommuteSession> {
  const db = getDatabase();
  const now = new Date();

  // Get userId from firebaseUid
  const user = await db.collection('users').findOne({ firebaseUid: data.firebaseUid });
  if (!user) {
    throw new Error('User not found. Please authenticate first.');
  }

  // Get playlist ObjectId if provided
  let playlistObjectId: ObjectId | undefined;
  if (data.playlistId) {
    const playlist = await db.collection('playlists').findOne({ playlistId: data.playlistId });
    playlistObjectId = playlist?._id;
  }

  const session: CommuteSession = {
    _id: new ObjectId(),
    sessionId: generateSessionId(),
    userId: user._id,
    firebaseUid: data.firebaseUid,
    topics: data.topics,
    durationSec: data.durationSec,
    ...(data.actualDurationSec && { actualDurationSec: data.actualDurationSec }),
    ...(playlistObjectId && { playlistId: playlistObjectId }),
    videosWatched: data.videosWatched,
    totalVideosWatched: data.videosWatched.length,
    totalTimeWatchedSec: data.videosWatched.reduce((sum, v) => sum + v.durationSec, 0),
    ...(data.completionRate !== undefined && { completionRate: data.completionRate }),
    ...(data.satisfactionRating && { satisfactionRating: data.satisfactionRating }),
    timestamp: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<CommuteSession>('commute_sessions').insertOne(session);
  console.log(`✅ Saved commute session: ${session.sessionId}`);

  // Keep only last 5 sessions per user
  await limitUserSessions(data.firebaseUid, 5);

  return session;
}

/**
 * Limit number of sessions per user (keeps most recent)
 */
async function limitUserSessions(firebaseUid: string, maxSessions: number): Promise<void> {
  const db = getDatabase();

  const sessions = await db
    .collection<CommuteSession>('commute_sessions')
    .find({ firebaseUid })
    .sort({ timestamp: -1 })
    .toArray();

  if (sessions.length > maxSessions) {
    const sessionsToDelete = sessions.slice(maxSessions);
    const idsToDelete = sessionsToDelete.map(s => s._id);

    await db.collection<CommuteSession>('commute_sessions').deleteMany({
      _id: { $in: idsToDelete },
    });

    console.log(`🗑️  Deleted ${idsToDelete.length} old sessions for ${firebaseUid}`);
  }
}

/**
 * Get user's commute history
 */
export async function getUserCommuteHistory(
  firebaseUid: string,
  options: { limit?: number; skip?: number } = {}
): Promise<CommuteSession[]> {
  const db = getDatabase();
  const { limit = 10, skip = 0 } = options;

  return db
    .collection<CommuteSession>('commute_sessions')
    .find({ firebaseUid })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

/**
 * Get a specific commute session
 */
export async function getCommuteSession(sessionId: string): Promise<CommuteSession | null> {
  const db = getDatabase();
  return db.collection<CommuteSession>('commute_sessions').findOne({ sessionId });
}

/**
 * Get topic watch count from commute sessions
 */
export async function getTopicWatchCountFromSessions(
  firebaseUid: string,
  topic: string
): Promise<number> {
  const db = getDatabase();

  const sessions = await db
    .collection<CommuteSession>('commute_sessions')
    .find({
      firebaseUid,
      topics: topic,
    })
    .toArray();

  return sessions.reduce((sum, session) => sum + session.totalVideosWatched, 0);
}

/**
 * Calculate user's learning streak from commute sessions
 */
export async function calculateStreak(firebaseUid: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastCommuteDate: Date | null;
}> {
  const db = getDatabase();

  const sessions = await db
    .collection<CommuteSession>('commute_sessions')
    .find({ firebaseUid })
    .sort({ timestamp: 1 }) // Oldest first
    .toArray();

  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCommuteDate: null };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  let lastDate: Date | null = null;

  for (let i = 0; i < sessions.length; i++) {
    const currentDate = new Date(sessions[i]!.timestamp);
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day

    if (lastDate) {
      const daysDiff = Math.floor(
        (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        tempStreak++;
      } else if (daysDiff > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    lastDate = currentDate;
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak
  const lastSession = sessions[sessions.length - 1]!;
  const lastSessionDate = new Date(lastSession.timestamp);
  lastSessionDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysSinceLastSession = Math.floor(
    (today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastSession <= 1) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }

  return {
    currentStreak,
    longestStreak,
    lastCommuteDate: lastSession.timestamp,
  };
}

/**
 * Delete commute session
 */
export async function deleteCommuteSession(
  sessionId: string,
  firebaseUid: string
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.collection<CommuteSession>('commute_sessions').deleteOne({
    sessionId,
    firebaseUid, // Ensure user owns the session
  });
  return result.deletedCount > 0;
}

/**
 * Get commute session statistics
 */
export async function getCommuteStats(firebaseUid: string): Promise<{
  totalSessions: number;
  totalMinutes: number;
  averageSessionMinutes: number;
  topTopics: Array<{ topic: string; count: number }>;
}> {
  const db = getDatabase();

  const sessions = await db
    .collection<CommuteSession>('commute_sessions')
    .find({ firebaseUid })
    .toArray();

  const totalSessions = sessions.length;
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.actualDurationSec || s.durationSec), 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const averageSessionMinutes = totalSessions > 0 ? Math.floor(totalMinutes / totalSessions) : 0;

  // Count topic frequencies
  const topicCounts: Record<string, number> = {};
  sessions.forEach(session => {
    session.topics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });

  const topTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSessions,
    totalMinutes,
    averageSessionMinutes,
    topTopics,
  };
}
