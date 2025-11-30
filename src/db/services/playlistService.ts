import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { Playlist, PlaylistVideo } from '../types.js';
import { generateId, generateShareToken } from '../../lib/utils.js';

/**
 * Create a new playlist
 */
export async function createPlaylist(data: {
  firebaseUid: string;
  topic: string;
  topics?: string[];
  videos: PlaylistVideo[];
  durationSec: number;
  mood?: string;
  difficultyLevel?: string;
  queryText?: string;
  intentJSON?: any;
  source?: 'wizard' | 'agent' | 'share';
}): Promise<Playlist> {
  const db = getDatabase();
  const now = new Date();

  // Get userId from firebaseUid
  const user = await db.collection('users').findOne({ firebaseUid: data.firebaseUid });
  if (!user) {
    throw new Error('User not found. Please authenticate first.');
  }

  const playlist: Playlist = {
    _id: new ObjectId(),
    playlistId: generateId(), // Legacy cuid-format ID
    userId: user._id,
    firebaseUid: data.firebaseUid,
    topic: data.topic,
    topics: data.topics || [data.topic],
    durationSec: data.durationSec,
    ...(data.mood && { mood: data.mood }),
    ...(data.difficultyLevel && { difficultyLevel: data.difficultyLevel }),
    videos: data.videos,
    totalVideos: data.videos.length,
    totalDurationSec: data.videos.reduce((sum, v) => sum + v.durationSec, 0),
    shareToken: generateShareToken(),
    isPublic: false,
    shareCount: 0,
    playCount: 0,
    ...(data.queryText && { queryText: data.queryText }),
    ...(data.intentJSON && { intentJSON: data.intentJSON }),
    source: data.source || 'wizard',
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<Playlist>('playlists').insertOne(playlist);
  console.log(`✅ Created playlist: ${playlist.playlistId}`);
  return playlist;
}

/**
 * Get playlist by ID (legacy cuid format)
 */
export async function getPlaylistById(playlistId: string): Promise<Playlist | null> {
  const db = getDatabase();
  return db.collection<Playlist>('playlists').findOne({ playlistId });
}

/**
 * Get playlist by share token
 */
export async function getPlaylistByShareToken(shareToken: string): Promise<Playlist | null> {
  const db = getDatabase();
  const playlist = await db.collection<Playlist>('playlists').findOne({ shareToken });
  
  if (playlist) {
    // Increment share count
    await db.collection<Playlist>('playlists').updateOne(
      { _id: playlist._id },
      { $inc: { shareCount: 1 } }
    );
  }
  
  return playlist;
}

/**
 * Get user's playlists
 */
export async function getUserPlaylists(
  firebaseUid: string,
  options: {
    limit?: number;
    skip?: number;
    topic?: string;
  } = {}
): Promise<Playlist[]> {
  const db = getDatabase();
  const { limit = 20, skip = 0, topic } = options;

  const query: any = { firebaseUid };
  if (topic) {
    query.topics = topic;
  }

  return db
    .collection<Playlist>('playlists')
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

/**
 * Update playlist play count and last played timestamp
 */
export async function recordPlaylistPlay(playlistId: string): Promise<void> {
  const db = getDatabase();
  await db.collection<Playlist>('playlists').updateOne(
    { playlistId },
    {
      $inc: { playCount: 1 },
      $set: { lastPlayedAt: new Date() },
    }
  );
}

/**
 * Update playlist completion rate
 */
export async function updatePlaylistCompletionRate(
  playlistId: string,
  completionRate: number
): Promise<void> {
  const db = getDatabase();
  await db.collection<Playlist>('playlists').updateOne(
    { playlistId },
    {
      $set: {
        completionRate,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Search playlists by topic
 */
export async function searchPlaylistsByTopic(
  topic: string,
  options: { limit?: number } = {}
): Promise<Playlist[]> {
  const db = getDatabase();
  const { limit = 20 } = options;

  return db
    .collection<Playlist>('playlists')
    .find({
      $or: [
        { topic: new RegExp(topic, 'i') },
        { topics: new RegExp(topic, 'i') },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get playlist statistics for a user
 */
export async function getPlaylistStats(firebaseUid: string): Promise<{
  totalPlaylists: number;
  totalVideos: number;
  totalDurationSec: number;
  topTopics: Array<{ topic: string; count: number }>;
}> {
  const db = getDatabase();

  const stats = await db
    .collection<Playlist>('playlists')
    .aggregate([
      { $match: { firebaseUid } },
      {
        $group: {
          _id: null,
          totalPlaylists: { $sum: 1 },
          totalVideos: { $sum: '$totalVideos' },
          totalDurationSec: { $sum: '$totalDurationSec' },
          allTopics: { $push: '$topic' },
        },
      },
    ])
    .toArray();

  if (stats.length === 0) {
    return {
      totalPlaylists: 0,
      totalVideos: 0,
      totalDurationSec: 0,
      topTopics: [],
    };
  }

  const result = stats[0]!; // Safe assertion - we checked length above

  // Count topic frequencies
  const topicCounts: Record<string, number> = {};
  result.allTopics.forEach((topic: string) => {
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });

  const topTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalPlaylists: result.totalPlaylists,
    totalVideos: result.totalVideos,
    totalDurationSec: result.totalDurationSec,
    topTopics,
  };
}

/**
 * Delete playlist
 */
export async function deletePlaylist(playlistId: string, firebaseUid: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.collection<Playlist>('playlists').deleteOne({
    playlistId,
    firebaseUid, // Ensure user owns the playlist
  });
  return result.deletedCount > 0;
}
