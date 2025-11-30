import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { Mastery } from '../types.js';

/**
 * Get or create mastery record for a topic
 */
export async function getOrCreateMastery(
  firebaseUid: string,
  topic: string
): Promise<Mastery> {
  const db = getDatabase();

  // Get userId from firebaseUid
  const user = await db.collection('users').findOne({ firebaseUid });
  if (!user) {
    throw new Error('User not found. Please authenticate first.');
  }

  // Check for existing mastery
  let mastery = await db.collection<Mastery>('mastery').findOne({
    userId: user._id,
    topic,
  });

  if (!mastery) {
    // Create new mastery record
    const now = new Date();
    mastery = {
      _id: new ObjectId(),
      userId: user._id,
      firebaseUid,
      topic,
      level: 'beginner',
      experiencePoints: 0,
      videosWatched: 0,
      totalTimeSec: 0,
      completionRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      beginnerVideosWatched: 0,
      intermediateVideosWatched: 0,
      advancedVideosWatched: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<Mastery>('mastery').insertOne(mastery);
    console.log(`✅ Created mastery record: ${topic} for ${firebaseUid}`);
  }

  return mastery;
}

/**
 * Update mastery after watching a video
 */
export async function updateMastery(data: {
  firebaseUid: string;
  topic: string;
  videoDurationSec: number;
  completedPct: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}): Promise<Mastery> {
  const mastery = await getOrCreateMastery(data.firebaseUid, data.topic);
  const db = getDatabase();

  // Calculate experience points (complete videos worth more)
  const xpGain = data.completedPct >= 90
    ? Math.floor(data.videoDurationSec / 60) * 10 // 10 XP per minute for completed
    : Math.floor(data.videoDurationSec / 60) * 5;  // 5 XP per minute for partial

  const newXP = mastery.experiencePoints + xpGain;
  const newVideosWatched = data.completedPct >= 90 ? mastery.videosWatched + 1 : mastery.videosWatched;
  const newTotalTime = mastery.totalTimeSec + data.videoDurationSec;

  // Update difficulty-specific counters
  const difficultyUpdate: any = {};
  if (data.difficulty === 'beginner') {
    difficultyUpdate.beginnerVideosWatched = mastery.beginnerVideosWatched + 1;
  } else if (data.difficulty === 'intermediate') {
    difficultyUpdate.intermediateVideosWatched = mastery.intermediateVideosWatched + 1;
  } else if (data.difficulty === 'advanced') {
    difficultyUpdate.advancedVideosWatched = mastery.advancedVideosWatched + 1;
  }

  // Determine new level based on XP
  let newLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  if (newXP >= 500) {
    newLevel = 'advanced';
  } else if (newXP >= 200) {
    newLevel = 'intermediate';
  }

  // Determine recommended difficulty
  let recommendedDifficulty: string | undefined;
  if (newLevel === 'beginner') {
    recommendedDifficulty = 'beginner';
  } else if (newLevel === 'intermediate') {
    recommendedDifficulty = 'intermediate';
  } else {
    recommendedDifficulty = 'advanced';
  }

  // Update mastery record
  await db.collection<Mastery>('mastery').updateOne(
    { _id: mastery._id },
    {
      $set: {
        level: newLevel,
        experiencePoints: newXP,
        videosWatched: newVideosWatched,
        totalTimeSec: newTotalTime,
        lastWatchedAt: new Date(),
        recommendedDifficulty,
        updatedAt: new Date(),
        ...difficultyUpdate,
      },
    }
  );

  return getOrCreateMastery(data.firebaseUid, data.topic);
}

/**
 * Get all mastery records for a user
 */
export async function getUserMastery(firebaseUid: string): Promise<Mastery[]> {
  const db = getDatabase();
  return db
    .collection<Mastery>('mastery')
    .find({ firebaseUid })
    .sort({ experiencePoints: -1 })
    .toArray();
}

/**
 * Get mastery for a specific topic
 */
export async function getTopicMastery(
  firebaseUid: string,
  topic: string
): Promise<{ level: 'beginner' | 'intermediate' | 'advanced'; streak: number }> {
  const mastery = await getOrCreateMastery(firebaseUid, topic);
  return {
    level: mastery.level,
    streak: mastery.currentStreak,
  };
}

/**
 * Update streak information
 */
export async function updateMasteryStreak(
  firebaseUid: string,
  topic: string,
  currentStreak: number,
  longestStreak: number
): Promise<void> {
  const db = getDatabase();

  // Get userId from firebaseUid
  const user = await db.collection('users').findOne({ firebaseUid });
  if (!user) return;

  await db.collection<Mastery>('mastery').updateOne(
    { userId: user._id, topic },
    {
      $set: {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Get mastery leaderboard (top topics by XP)
 */
export async function getMasteryLeaderboard(
  firebaseUid: string,
  limit: number = 10
): Promise<Mastery[]> {
  const db = getDatabase();
  return db
    .collection<Mastery>('mastery')
    .find({ firebaseUid })
    .sort({ experiencePoints: -1 })
    .limit(limit)
    .toArray();
}
