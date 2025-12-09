import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'commutr_db';
const POOL_SIZE = parseInt(process.env.MONGODB_POOL_SIZE || '10', 10);

/**
 * Connect to MongoDB with connection pooling
 */
export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: POOL_SIZE,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      w: 'majority',
    });

    await client.connect();
    console.log('✅ Connected to MongoDB');

    db = client.db(DB_NAME);
    
    // Create indexes in background (non-blocking for faster startup)
    createIndexes(db).catch(err => {
      console.error('Warning: Index creation failed:', err);
    });
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get database instance (must be connected first)
 */
export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ Disconnected from MongoDB');
  }
}

/**
 * Create indexes for all collections
 * These indexes optimize query performance for common access patterns
 * Runs in background and skips if indexes already exist
 */
async function createIndexes(db: Db): Promise<void> {
  try {
    // Create indexes with background option for non-blocking operation
    // MongoDB will skip if indexes already exist
    const indexOpts = { background: true };

    // Users indexes - Firebase UID is primary lookup
    await db.collection('users').createIndex({ firebaseUid: 1 }, { unique: true, ...indexOpts });
    await db.collection('users').createIndex({ createdAt: -1 }, indexOpts);
    await db.collection('users').createIndex({ lastLoginAt: -1 }, indexOpts);

    // Playlists indexes
    await db.collection('playlists').createIndex({ playlistId: 1 }, { unique: true, ...indexOpts });
    await db.collection('playlists').createIndex({ firebaseUid: 1, createdAt: -1 }, indexOpts);
    await db.collection('playlists').createIndex({ shareToken: 1 }, { unique: true, sparse: true, ...indexOpts });
    await db.collection('playlists').createIndex({ topic: 1 }, indexOpts);

    // Watch history indexes - userId+videoId ensures no duplicates
    await db.collection('watch_history').createIndex({ watchId: 1 }, { unique: true, ...indexOpts });
    await db.collection('watch_history').createIndex({ userId: 1, videoId: 1 }, { unique: true, ...indexOpts });
    await db.collection('watch_history').createIndex({ firebaseUid: 1, completedAt: -1 }, indexOpts);
    await db.collection('watch_history').createIndex({ topicTags: 1 }, indexOpts);

    // Commute sessions indexes
    await db.collection('commute_sessions').createIndex({ sessionId: 1 }, { unique: true, ...indexOpts });
    await db.collection('commute_sessions').createIndex({ firebaseUid: 1, timestamp: -1 }, indexOpts);
    await db.collection('commute_sessions').createIndex({ topics: 1 }, indexOpts);

    // Mastery indexes - one record per user+topic
    await db.collection('mastery').createIndex({ userId: 1, topic: 1 }, { unique: true, ...indexOpts });
    await db.collection('mastery').createIndex({ firebaseUid: 1, topic: 1 }, indexOpts);
    await db.collection('mastery').createIndex({ lastWatchedAt: -1 }, indexOpts);

    // Achievements indexes - one record per user+badge
    await db.collection('achievements').createIndex({ userId: 1, badgeId: 1 }, { unique: true, ...indexOpts });
    await db.collection('achievements').createIndex({ firebaseUid: 1, earned: 1 }, indexOpts);
    await db.collection('achievements').createIndex({ earnedAt: -1 }, indexOpts);
  } catch (error) {
    // Silently fail - indexes may already exist or operation may be in progress
    // This is fine, the app will still work
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!db) return false;
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
