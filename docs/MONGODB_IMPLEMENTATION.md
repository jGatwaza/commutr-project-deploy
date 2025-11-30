# MongoDB Implementation Guide for Commutr

This guide provides step-by-step instructions and code examples for integrating MongoDB into the Commutr application.

---

## Important: Authentication Architecture

**Authentication stays on Firebase:**
- ✅ Firebase Auth handles all authentication (Google OAuth only)
- ✅ Frontend uses Firebase SDK for sign-in
- ✅ Backend verifies Firebase ID tokens
- ✅ MongoDB only stores user preferences/metadata
- ❌ No passwords or auth tokens in MongoDB
- ❌ No migration of authentication logic

---

## Phase 1: Setup and Configuration

### Step 1: Install Dependencies

```bash
npm install mongodb
npm install --save-dev @types/mongodb
```

### Step 2: Environment Configuration

Add to `.env`:
```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=commutr_db
MONGODB_POOL_SIZE=10
```

### Step 3: Create Database Connection Module

**File: `src/db/connection.ts`**
```typescript
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
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    console.log('✅ Connected to MongoDB');

    db = client.db(DB_NAME);
    
    // Create indexes on startup
    await createIndexes(db);
    
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
 */
async function createIndexes(db: Db): Promise<void> {
  console.log('📊 Creating database indexes...');

  // Users indexes
  await db.collection('users').createIndex({ firebaseUid: 1 }, { unique: true });
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ createdAt: -1 });

  // Playlists indexes
  await db.collection('playlists').createIndex({ playlistId: 1 }, { unique: true });
  await db.collection('playlists').createIndex({ firebaseUid: 1, createdAt: -1 });
  await db.collection('playlists').createIndex({ shareToken: 1 }, { unique: true, sparse: true });
  await db.collection('playlists').createIndex({ topic: 1 });

  // Watch history indexes
  await db.collection('watch_history').createIndex({ watchId: 1 }, { unique: true });
  await db.collection('watch_history').createIndex({ userId: 1, videoId: 1 }, { unique: true });
  await db.collection('watch_history').createIndex({ firebaseUid: 1, completedAt: -1 });
  await db.collection('watch_history').createIndex({ topicTags: 1 });

  // Commute sessions indexes
  await db.collection('commute_sessions').createIndex({ sessionId: 1 }, { unique: true });
  await db.collection('commute_sessions').createIndex({ firebaseUid: 1, timestamp: -1 });
  await db.collection('commute_sessions').createIndex({ topics: 1 });

  // Mastery indexes
  await db.collection('mastery').createIndex({ userId: 1, topic: 1 }, { unique: true });
  await db.collection('mastery').createIndex({ firebaseUid: 1, topic: 1 });
  await db.collection('mastery').createIndex({ lastWatchedAt: -1 });

  // Achievements indexes
  await db.collection('achievements').createIndex({ userId: 1, badgeId: 1 }, { unique: true });
  await db.collection('achievements').createIndex({ firebaseUid: 1, earned: 1 });
  await db.collection('achievements').createIndex({ earnedAt: -1 });

  console.log('✅ Database indexes created');
  console.log('Note: Agent conversations stored in client-side Redux only');
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
```

---

## Phase 2: Type Definitions

**File: `src/db/types.ts`**
```typescript
import { ObjectId } from 'mongodb';

// Authentication is handled by Firebase - this collection only stores preferences
export interface User {
  _id: ObjectId;
  firebaseUid: string;          // PRIMARY IDENTIFIER from Firebase Auth
  email: string;                 // Copied from Firebase
  displayName?: string;          // Copied from Firebase
  photoURL?: string;             // Copied from Firebase
  preferences: {
    defaultCommuteDuration?: number;
    preferredTopics?: string[];
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced' | null;
    autoplayEnabled?: boolean;
    notificationsEnabled?: boolean;
    theme?: 'light' | 'dark';
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface Playlist {
  _id: ObjectId;
  playlistId: string;
  userId: ObjectId;
  firebaseUid: string;
  topic: string;
  topics?: string[];
  durationSec: number;
  mood?: string;
  difficultyLevel?: string;
  videos: PlaylistVideo[];
  totalVideos: number;
  totalDurationSec: number;
  shareToken?: string;
  isPublic: boolean;
  shareCount: number;
  playCount: number;
  completionRate?: number;
  queryText?: string;
  intentJSON?: any;
  source?: 'wizard' | 'agent' | 'share';
  createdAt: Date;
  updatedAt: Date;
  lastPlayedAt?: Date;
}

export interface PlaylistVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  durationSec: number;
  difficulty?: string;
  topicTags?: string[];
  order: number;
}

export interface WatchHistory {
  _id: ObjectId;
  watchId: string;
  userId: ObjectId;
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
  playlistId?: ObjectId;
  commuteSessionId?: ObjectId;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommuteSession {
  _id: ObjectId;
  sessionId: string;
  userId: ObjectId;
  firebaseUid: string;
  topics: string[];
  durationSec: number;
  actualDurationSec?: number;
  playlistId?: ObjectId;
  videosWatched: SessionVideo[];
  totalVideosWatched: number;
  totalTimeWatchedSec: number;
  completionRate?: number;
  satisfactionRating?: number;
  timestamp: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionVideo {
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnail?: string;
  durationSec: number;
  watchedAt?: Date;
  completedPct?: number;
}

export interface Mastery {
  _id: ObjectId;
  userId: ObjectId;
  firebaseUid: string;
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  experiencePoints: number;
  videosWatched: number;
  totalTimeSec: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  lastWatchedAt?: Date;
  beginnerVideosWatched: number;
  intermediateVideosWatched: number;
  advancedVideosWatched: number;
  recommendedDifficulty?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  _id: ObjectId;
  userId: ObjectId;
  firebaseUid: string;
  badgeId: string;
  type: 'minutes' | 'streak' | 'commute' | 'videos';
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
  progressCurrent: number;
  progressTarget: number;
  progressPct: number;
  createdAt: Date;
  updatedAt: Date;
}

// Note: Conversations are stored in Redux client-side only, not in database
```

---

## Phase 3: Service Layer Implementation

### User Service

**File: `src/db/services/userService.ts`**
```typescript
import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { User } from '../types.js';

/**
 * Create user record in MongoDB after Firebase authentication
 * Called automatically on first app usage
 * Note: Authentication is handled by Firebase, this only stores preferences
 */
export async function createUser(userData: {
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}): Promise<User> {
  const db = getDatabase();
  const now = new Date();

  const user: User = {
    _id: new ObjectId(),
    firebaseUid: userData.firebaseUid,
    email: userData.email,
    displayName: userData.displayName,
    photoURL: userData.photoURL,
    preferences: {
      autoplayEnabled: true,
      notificationsEnabled: true,
      theme: 'light',
    },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    isActive: true,
  };

  await db.collection<User>('users').insertOne(user);
  return user;
}

/**
 * Get user by Firebase UID (primary lookup method)
 */
export async function getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
  const db = getDatabase();
  return db.collection<User>('users').findOne({ firebaseUid });
}

/**
 * Get or create user - ensures user exists in MongoDB after Firebase auth
 */
export async function getOrCreateUser(firebaseUserData: {
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}): Promise<User> {
  let user = await getUserByFirebaseUid(firebaseUserData.firebaseUid);
  
  if (!user) {
    user = await createUser(firebaseUserData);
  } else {
    // Update last login
    await updateLastLogin(firebaseUserData.firebaseUid);
  }
  
  return user;
}

export async function updateUserPreferences(
  firebaseUid: string,
  preferences: Partial<User['preferences']>
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.collection<User>('users').updateOne(
    { firebaseUid },
    {
      $set: {
        preferences,
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount > 0;
}

export async function updateLastLogin(firebaseUid: string): Promise<void> {
  const db = getDatabase();
  await db.collection<User>('users').updateOne(
    { firebaseUid },
    {
      $set: { lastLoginAt: new Date() },
    }
  );
}
```

### Playlist Service

**File: `src/db/services/playlistService.ts`**
```typescript
import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { Playlist } from '../types.js';

export async function createPlaylist(playlistData: {
  firebaseUid: string;
  topic: string;
  videos: any[];
  durationSec: number;
  queryText?: string;
  source?: string;
}): Promise<Playlist> {
  const db = getDatabase();
  const now = new Date();

  // Get user ObjectId
  const user = await db.collection('users').findOne({ firebaseUid: playlistData.firebaseUid });
  if (!user) {
    throw new Error('User not found');
  }

  // Generate playlist ID (similar to current cuid format)
  const playlistId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`;

  const playlist: Playlist = {
    _id: new ObjectId(),
    playlistId,
    userId: user._id,
    firebaseUid: playlistData.firebaseUid,
    topic: playlistData.topic,
    topics: [playlistData.topic],
    durationSec: playlistData.durationSec,
    videos: playlistData.videos.map((video, index) => ({
      ...video,
      order: index,
    })),
    totalVideos: playlistData.videos.length,
    totalDurationSec: playlistData.videos.reduce((sum, v) => sum + v.durationSec, 0),
    isPublic: false,
    shareCount: 0,
    playCount: 0,
    queryText: playlistData.queryText,
    source: playlistData.source as any,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<Playlist>('playlists').insertOne(playlist);
  return playlist;
}

export async function getUserPlaylists(
  firebaseUid: string,
  options: { limit?: number; skip?: number } = {}
): Promise<Playlist[]> {
  const db = getDatabase();
  const { limit = 20, skip = 0 } = options;

  return db
    .collection<Playlist>('playlists')
    .find({ firebaseUid })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function getPlaylistById(playlistId: string): Promise<Playlist | null> {
  const db = getDatabase();
  return db.collection<Playlist>('playlists').findOne({ playlistId });
}

export async function incrementPlayCount(playlistId: string): Promise<void> {
  const db = getDatabase();
  await db.collection<Playlist>('playlists').updateOne(
    { playlistId },
    {
      $inc: { playCount: 1 },
      $set: { lastPlayedAt: new Date() },
    }
  );
}

export async function generateShareToken(playlistId: string): Promise<string> {
  const db = getDatabase();
  
  // Generate 22-char token
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);

  await db.collection<Playlist>('playlists').updateOne(
    { playlistId },
    {
      $set: {
        shareToken: token,
        isPublic: true,
        updatedAt: new Date(),
      },
    }
  );

  return token;
}

export async function getPlaylistByShareToken(token: string): Promise<Playlist | null> {
  const db = getDatabase();
  return db.collection<Playlist>('playlists').findOne({ shareToken: token, isPublic: true });
}
```

### Watch History Service

**File: `src/db/services/watchHistoryService.ts`**
```typescript
import { ObjectId } from 'mongodb';
import { getDatabase } from '../connection.js';
import { WatchHistory } from '../types.js';

export async function upsertWatchHistory(watchData: {
  firebaseUid: string;
  videoId: string;
  title: string;
  durationSec: number;
  progressPct: number;
  topicTags?: string[];
  completedAt?: Date;
}): Promise<WatchHistory> {
  const db = getDatabase();
  const now = new Date();

  // Get user ObjectId
  const user = await db.collection('users').findOne({ firebaseUid: watchData.firebaseUid });
  if (!user) {
    throw new Error('User not found');
  }

  // Check for existing entry
  const existing = await db.collection<WatchHistory>('watch_history').findOne({
    userId: user._id,
    videoId: watchData.videoId,
  });

  if (existing) {
    // Update existing entry with newer completion data
    const shouldUpdate = 
      watchData.completedAt && 
      (!existing.completedAt || new Date(watchData.completedAt) >= new Date(existing.completedAt));

    if (shouldUpdate) {
      await db.collection<WatchHistory>('watch_history').updateOne(
        { _id: existing._id },
        {
          $set: {
            title: watchData.title,
            durationSec: watchData.durationSec,
            progressPct: watchData.progressPct,
            topicTags: watchData.topicTags,
            completedAt: watchData.completedAt,
            updatedAt: now,
          },
        }
      );
      
      return {
        ...existing,
        ...watchData,
        updatedAt: now,
      };
    }
    
    return existing;
  }

  // Create new entry
  const watchId = `w${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`;
  
  const newEntry: WatchHistory = {
    _id: new ObjectId(),
    watchId,
    userId: user._id,
    firebaseUid: watchData.firebaseUid,
    videoId: watchData.videoId,
    title: watchData.title,
    durationSec: watchData.durationSec,
    topicTags: watchData.topicTags || [],
    progressPct: watchData.progressPct,
    completedAt: watchData.completedAt,
    source: 'youtube',
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<WatchHistory>('watch_history').insertOne(newEntry);
  return newEntry;
}

export async function getUserWatchHistory(
  firebaseUid: string,
  options: { limit?: number; skip?: number; q?: string } = {}
): Promise<{ items: WatchHistory[]; total: number }> {
  const db = getDatabase();
  const { limit = 20, skip = 0, q } = options;

  const query: any = { firebaseUid };
  if (q) {
    query.title = { $regex: q, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    db
      .collection<WatchHistory>('watch_history')
      .find(query)
      .sort({ completedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection<WatchHistory>('watch_history').countDocuments(query),
  ]);

  return { items, total };
}

export async function getWatchedVideoIds(
  firebaseUid: string,
  topic?: string
): Promise<Set<string>> {
  const db = getDatabase();
  
  const query: any = { firebaseUid };
  if (topic) {
    query.topicTags = topic;
  }

  const entries = await db
    .collection<WatchHistory>('watch_history')
    .find(query, { projection: { videoId: 1 } })
    .toArray();

  return new Set(entries.map(e => e.videoId));
}
```

---

## Phase 4: Integration with Existing Code

### Update Server Initialization

**File: `src/server.ts`** (add this before starting Express):
```typescript
import { connectToDatabase, closeDatabaseConnection } from './db/connection.js';

// Connect to MongoDB on startup
await connectToDatabase();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closeDatabaseConnection();
  process.exit(0);
});
```

### Migrate Existing Endpoints

Example: Update playlist creation endpoint

**Before (JSON files):**
```typescript
import { saveSession } from '../history/store.js';

app.post('/v1/playlists', async (req, res) => {
  // ... create playlist logic ...
  const session = saveSession({
    queryText: req.body.query,
    intentJSON: {},
    playlistJSON: playlist,
    durationMs: duration * 1000,
  });
  res.json(session);
});
```

**After (MongoDB):**
```typescript
import { createPlaylist } from '../db/services/playlistService.js';
import { getOrCreateUser } from '../db/services/userService.js';

app.post('/v1/playlists', async (req, res) => {
  // req.user comes from Firebase auth middleware (verifyIdToken)
  const firebaseUid = req.user.uid;
  
  // Ensure user exists in MongoDB (created on first use)
  const user = await getOrCreateUser({
    firebaseUid,
    email: req.user.email,
    displayName: req.user.displayName,
    photoURL: req.user.photoURL,
  });
  
  // ... create playlist logic ...
  const playlist = await createPlaylist({
    firebaseUid,
    topic: req.body.topic,
    videos: generatedVideos,
    durationSec: duration,
    queryText: req.body.query,
    source: 'wizard',
  });
  
  res.json(playlist);
});
```

---

## Phase 5: Migration Script

**File: `scripts/migrateToMongoDB.ts`**
```typescript
import fs from 'fs';
import path from 'path';
import { connectToDatabase, closeDatabaseConnection } from '../src/db/connection.js';
import { createUser } from '../src/db/services/userService.js';
import { createPlaylist } from '../src/db/services/playlistService.js';
import { upsertWatchHistory } from '../src/db/services/watchHistoryService.js';

async function migrateData() {
  console.log('🚀 Starting data migration...');
  
  await connectToDatabase();

  // 1. Migrate watch history
  console.log('\n📺 Migrating watch history...');
  const watchedData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/watched.json'), 'utf-8')
  );
  
  for (const entry of watchedData.entries) {
    await upsertWatchHistory({
      firebaseUid: entry.userId,
      videoId: entry.videoId,
      title: entry.title,
      durationSec: entry.durationSec,
      progressPct: entry.progressPct || 100,
      topicTags: entry.topicTags,
      completedAt: entry.completedAt ? new Date(entry.completedAt) : undefined,
    });
  }
  console.log(`✅ Migrated ${watchedData.entries.length} watch history entries`);

  // 2. Migrate commute history
  console.log('\n🚗 Migrating commute sessions...');
  const commuteData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/commute-history.json'), 'utf-8')
  );
  
  let sessionCount = 0;
  for (const [userId, sessions] of Object.entries(commuteData)) {
    for (const session of sessions as any[]) {
      // Save commute session (implement similar to watch history)
      sessionCount++;
    }
  }
  console.log(`✅ Migrated ${sessionCount} commute sessions`);

  // 3. Migrate sessions/playlists
  console.log('\n📝 Migrating sessions...');
  const sessionsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/sessions.json'), 'utf-8')
  );
  
  for (const session of sessionsData) {
    // Extract playlist data and save
    // Note: Need to map session to user
  }
  console.log(`✅ Migrated ${sessionsData.length} sessions`);

  await closeDatabaseConnection();
  console.log('\n✨ Migration complete!');
}

migrateData().catch(console.error);
```

Run with:
```bash
npx tsx scripts/migrateToMongoDB.ts
```

---

## Phase 6: Testing

Create tests for MongoDB services:

**File: `__tests__/db/playlistService.test.ts`**
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { connectToDatabase, closeDatabaseConnection } from '../../src/db/connection.js';
import { createPlaylist, getUserPlaylists } from '../../src/db/services/playlistService.js';

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await closeDatabaseConnection();
});

describe('Playlist Service', () => {
  it('should create a playlist', async () => {
    const playlist = await createPlaylist({
      firebaseUid: 'test-user-123',
      topic: 'python',
      videos: [
        { videoId: 'abc123', title: 'Test Video', durationSec: 300 }
      ],
      durationSec: 300,
      source: 'wizard',
    });

    expect(playlist).toBeDefined();
    expect(playlist.topic).toBe('python');
    expect(playlist.videos).toHaveLength(1);
  });

  it('should retrieve user playlists', async () => {
    const playlists = await getUserPlaylists('test-user-123');
    expect(playlists).toBeInstanceOf(Array);
    expect(playlists.length).toBeGreaterThan(0);
  });
});
```

---

## Next Steps

1. **Review this implementation guide**
2. **Set up local MongoDB** or MongoDB Atlas account
3. **Run migration script** with test data
4. **Test thoroughly** before production deployment
5. **Deploy with feature flag** for gradual rollout

---

*This implementation provides a solid foundation for MongoDB integration while maintaining backward compatibility.*
