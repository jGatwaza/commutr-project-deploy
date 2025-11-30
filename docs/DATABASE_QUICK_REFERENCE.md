# MongoDB Quick Reference Guide for Commutr

A cheat sheet for developers working with the Commutr MongoDB database.

---

## ⚠️ Important: Authentication

**Authentication is NOT in MongoDB:**
- ✅ Firebase Auth (Google OAuth only) handles all authentication
- ✅ Frontend uses Firebase SDK for sign-in
- ✅ Backend verifies Firebase ID tokens
- ✅ MongoDB stores user preferences/metadata only
- ❌ No passwords, tokens, or auth logic in MongoDB
- ❌ Do not migrate authentication to MongoDB

**User Flow:**
1. User signs in with Google → Firebase Auth
2. Firebase returns ID token → Frontend
3. Backend verifies token → Firebase Admin SDK
4. User auto-created in MongoDB on first use (preferences only)

---

## Connection

```typescript
import { getDatabase } from './db/connection.js';

const db = getDatabase();
const collection = db.collection('users');
```

---

## Collections Overview

| Collection | Purpose | Key Fields | Unique Index |
|------------|---------|------------|--------------|
| **users** | User profiles & preferences | `firebaseUid`, `email`, `preferences` | `firebaseUid` |
| **playlists** | Generated video playlists | `playlistId`, `videos[]`, `shareToken` | `playlistId` |
| **watch_history** | Individual video watches | `videoId`, `progressPct`, `completedAt` | `userId + videoId` |
| **commute_sessions** | Complete commute sessions | `topics[]`, `videosWatched[]`, `timestamp` | `sessionId` |
| **mastery** | Topic learning progress | `topic`, `level`, `videosWatched` | `userId + topic` |
| **achievements** | Badge progress | `badgeId`, `earned`, `progressCurrent` | `userId + badgeId` |

**Note**: Agent mode conversations are stored in client-side Redux state only.

---

## Common Queries

### Users

```typescript
// Create user
await db.collection('users').insertOne({
  _id: new ObjectId(),
  firebaseUid: 'xyz',
  email: 'user@example.com',
  preferences: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
});

// Find user by Firebase UID
const user = await db.collection('users').findOne({ firebaseUid: 'xyz' });

// Update preferences
await db.collection('users').updateOne(
  { firebaseUid: 'xyz' },
  { $set: { 'preferences.defaultCommuteDuration': 900 } }
);
```

### Playlists

```typescript
// Create playlist
await db.collection('playlists').insertOne({
  _id: new ObjectId(),
  playlistId: 'c123abc',
  userId: userObjectId,
  firebaseUid: 'xyz',
  topic: 'python',
  videos: [{ videoId: 'abc', title: 'Test', durationSec: 300, order: 0 }],
  totalVideos: 1,
  totalDurationSec: 300,
  isPublic: false,
  shareCount: 0,
  playCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Get user's playlists
const playlists = await db.collection('playlists')
  .find({ firebaseUid: 'xyz' })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();

// Get playlist by share token
const shared = await db.collection('playlists').findOne({ 
  shareToken: 'abc123', 
  isPublic: true 
});

// Increment play count
await db.collection('playlists').updateOne(
  { playlistId: 'c123abc' },
  { 
    $inc: { playCount: 1 },
    $set: { lastPlayedAt: new Date() }
  }
);
```

### Watch History

```typescript
// Record video watch (upsert pattern)
await db.collection('watch_history').updateOne(
  { userId: userObjectId, videoId: 'abc123' },
  {
    $set: {
      title: 'Video Title',
      durationSec: 300,
      progressPct: 100,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
    $setOnInsert: {
      _id: new ObjectId(),
      watchId: 'w123abc',
      firebaseUid: 'xyz',
      source: 'youtube',
      createdAt: new Date(),
    }
  },
  { upsert: true }
);

// Get user's watch history (paginated)
const history = await db.collection('watch_history')
  .find({ firebaseUid: 'xyz' })
  .sort({ completedAt: -1 })
  .skip(0)
  .limit(20)
  .toArray();

// Get watched video IDs for topic
const watchedIds = await db.collection('watch_history')
  .find({ firebaseUid: 'xyz', topicTags: 'python' })
  .project({ videoId: 1 })
  .toArray();
const idSet = new Set(watchedIds.map(w => w.videoId));
```

### Commute Sessions

```typescript
// Save commute session
await db.collection('commute_sessions').insertOne({
  _id: new ObjectId(),
  sessionId: 'commute-123456',
  userId: userObjectId,
  firebaseUid: 'xyz',
  topics: ['python', 'coding'],
  durationSec: 900,
  videosWatched: [
    { videoId: 'abc', title: 'Test', durationSec: 300, completedPct: 100 }
  ],
  totalVideosWatched: 1,
  totalTimeWatchedSec: 300,
  timestamp: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Get recent sessions
const sessions = await db.collection('commute_sessions')
  .find({ firebaseUid: 'xyz' })
  .sort({ timestamp: -1 })
  .limit(5)
  .toArray();
```

### Mastery

```typescript
// Update topic mastery
await db.collection('mastery').updateOne(
  { userId: userObjectId, topic: 'python' },
  {
    $set: {
      level: 'intermediate',
      lastWatchedAt: new Date(),
      updatedAt: new Date(),
    },
    $inc: {
      videosWatched: 1,
      totalTimeSec: 300,
      intermediateVideosWatched: 1,
    },
    $setOnInsert: {
      _id: new ObjectId(),
      firebaseUid: 'xyz',
      experiencePoints: 0,
      completionRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      beginnerVideosWatched: 0,
      advancedVideosWatched: 0,
      createdAt: new Date(),
    }
  },
  { upsert: true }
);

// Get user's mastery for topic
const mastery = await db.collection('mastery').findOne({
  firebaseUid: 'xyz',
  topic: 'python'
});
```

### Achievements

```typescript
// Update achievement progress
await db.collection('achievements').updateOne(
  { userId: userObjectId, badgeId: 'video-10' },
  {
    $set: {
      earned: true,
      earnedAt: new Date(),
      progressCurrent: 10,
      progressPct: 100,
      updatedAt: new Date(),
    },
    $setOnInsert: {
      _id: new ObjectId(),
      firebaseUid: 'xyz',
      type: 'videos',
      title: '10 Videos Watched',
      description: 'Watch 10 videos',
      icon: '🎥',
      progressTarget: 10,
      createdAt: new Date(),
    }
  },
  { upsert: true }
);

// Get earned badges
const badges = await db.collection('achievements')
  .find({ firebaseUid: 'xyz', earned: true })
  .sort({ earnedAt: -1 })
  .toArray();
```


---

## Aggregation Queries

### Topic Statistics

```typescript
// Get total watch time by topic
const topicStats = await db.collection('watch_history').aggregate([
  { $match: { firebaseUid: 'xyz' } },
  { $unwind: '$topicTags' },
  { $group: {
    _id: '$topicTags',
    totalVideos: { $sum: 1 },
    totalDuration: { $sum: '$durationSec' },
    avgCompletion: { $avg: '$progressPct' }
  }},
  { $sort: { totalDuration: -1 } }
]).toArray();
```

### Streak Calculation

```typescript
// Get unique watch dates for streak
const watchDates = await db.collection('watch_history').aggregate([
  { $match: { firebaseUid: 'xyz' } },
  { $group: {
    _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }
  }},
  { $sort: { _id: -1 } }
]).toArray();

// Calculate streak in application code
let streak = 0;
const today = new Date().toISOString().split('T')[0];
const dates = watchDates.map(d => d._id);

for (let i = 0; i < dates.length; i++) {
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() - i);
  const expected = expectedDate.toISOString().split('T')[0];
  
  if (dates.includes(expected)) {
    streak++;
  } else if (i > 0) {
    break;
  }
}
```

### Weekly Activity Trend

```typescript
// Get videos watched per week (last 12 weeks)
const weeklyTrend = await db.collection('watch_history').aggregate([
  { $match: {
    firebaseUid: 'xyz',
    completedAt: { $gte: new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000) }
  }},
  { $project: {
    week: { $dateToString: { format: '%Y-W%U', date: '$completedAt' } },
    durationSec: 1
  }},
  { $group: {
    _id: '$week',
    videoCount: { $sum: 1 },
    totalDuration: { $sum: '$durationSec' }
  }},
  { $sort: { _id: -1 } }
]).toArray();
```

---

## Indexes

### View existing indexes
```typescript
const indexes = await db.collection('users').indexes();
console.log(indexes);
```

### Create custom index
```typescript
await db.collection('playlists').createIndex(
  { topic: 1, createdAt: -1 },
  { name: 'topic_recent_playlists' }
);
```

### Drop index
```typescript
await db.collection('playlists').dropIndex('topic_recent_playlists');
```

---

## Transactions

For operations that need to update multiple collections atomically:

```typescript
const session = client.startSession();

try {
  await session.withTransaction(async () => {
    // Create playlist
    const result = await db.collection('playlists').insertOne(
      playlistDoc,
      { session }
    );

    // Update user stats
    await db.collection('users').updateOne(
      { _id: userId },
      { $inc: { 'stats.totalPlaylists': 1 } },
      { session }
    );

    // Additional updates can be added here
  });
} finally {
  await session.endSession();
}
```

---

## Error Handling

```typescript
try {
  await db.collection('users').insertOne(userData);
} catch (error) {
  if (error.code === 11000) {
    // Duplicate key error (unique constraint violation)
    console.error('User already exists');
  } else if (error.name === 'MongoNetworkError') {
    // Network/connection error
    console.error('Database connection failed');
  } else {
    console.error('Database error:', error);
  }
}
```

---

## Performance Tips

### Use Projections
Only fetch fields you need:
```typescript
const users = await db.collection('users')
  .find({ isActive: true })
  .project({ firebaseUid: 1, email: 1, displayName: 1 })
  .toArray();
```

### Limit Results
Always use `.limit()` for lists:
```typescript
const playlists = await db.collection('playlists')
  .find({ firebaseUid: 'xyz' })
  .limit(20)
  .toArray();
```

### Batch Operations
Use bulk writes for multiple updates:
```typescript
const bulkOps = [
  { updateOne: {
    filter: { userId: user1Id, badgeId: 'video-5' },
    update: { $set: { earned: true } },
    upsert: true
  }},
  { updateOne: {
    filter: { userId: user1Id, badgeId: 'video-10' },
    update: { $set: { progressCurrent: 7 } },
    upsert: true
  }}
];

await db.collection('achievements').bulkWrite(bulkOps);
```

### Connection Pooling
Reuse database connection:
```typescript
// ✅ Good: Reuse connection
const db = getDatabase();

// ❌ Bad: New connection every time
await connectToDatabase(); // Don't do this per request
```

---

## Debugging

### Enable Query Logging
```typescript
// In development
const db = getDatabase();
db.on('commandStarted', (event) => {
  console.log('Query:', event.commandName, JSON.stringify(event.command));
});
```

### Explain Query
```typescript
const explain = await db.collection('playlists')
  .find({ firebaseUid: 'xyz' })
  .explain();
console.log('Query plan:', explain);
```

### Check Database Stats
```typescript
const stats = await db.stats();
console.log('Database size:', stats.dataSize);
console.log('Documents:', stats.objects);
console.log('Collections:', stats.collections);
```

---

## Backup and Restore

### Export Collection
```bash
mongoexport --uri="mongodb://localhost:27017/commutr_db" \
  --collection=users \
  --out=users_backup.json
```

### Import Collection
```bash
mongoimport --uri="mongodb://localhost:27017/commutr_db" \
  --collection=users \
  --file=users_backup.json
```

### Full Database Backup
```bash
mongodump --uri="mongodb://localhost:27017/commutr_db" \
  --out=./backup
```

### Restore Database
```bash
mongorestore --uri="mongodb://localhost:27017/commutr_db" \
  ./backup/commutr_db
```

---

## Environment Variables

```bash
# Development
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=commutr_db_dev

# Production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true
MONGODB_DB_NAME=commutr_db

# Optional
MONGODB_POOL_SIZE=10
MONGODB_TIMEOUT_MS=5000
```

---

## Useful MongoDB Shell Commands

```bash
# Connect to database
mongosh "mongodb://localhost:27017/commutr_db"

# Show collections
show collections

# Count documents
db.users.countDocuments()

# Find one document
db.users.findOne({ firebaseUid: "xyz" })

# Delete all documents in collection (careful!)
db.test_data.deleteMany({})

# Drop collection
db.test_data.drop()

# Show indexes
db.playlists.getIndexes()

# Create index
db.playlists.createIndex({ topic: 1 })

# Database stats
db.stats()
```

---

## Testing

### Mock MongoDB in Tests

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await connectToDatabase();
});

afterAll(async () => {
  await closeDatabaseConnection();
  await mongoServer.stop();
});
```

---

## Migration Checklist

- [ ] Install `mongodb` package
- [ ] Set up `.env` with `MONGODB_URI`
- [ ] Create `src/db/connection.ts`
- [ ] Define types in `src/db/types.ts`
- [ ] Implement service layer
- [ ] Write migration script
- [ ] Run migration on development data
- [ ] Update API endpoints
- [ ] Write tests
- [ ] Deploy to staging
- [ ] Run production migration
- [ ] Monitor performance

---

*Quick reference guide for Commutr MongoDB integration | Last updated: 2025-11-30*
