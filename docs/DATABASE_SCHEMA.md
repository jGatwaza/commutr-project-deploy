# Commutr MongoDB Database Schema Proposal

## Overview

This document proposes a MongoDB database schema to replace the current JSON file-based storage system. The schema is designed to support all existing features while enabling scalability, efficient querying, and future enhancements.

## Database: `commutr_db`

---

## Collections

**Total: 7 collections** (replacing JSON file storage)

### 1. **users**
Stores user preferences and profile metadata. **Authentication is handled entirely by Firebase (Google Auth only).**

```javascript
{
  _id: ObjectId,
  firebaseUid: String,           // Firebase UID (unique, indexed) - PRIMARY IDENTIFIER
  email: String,                  // User email (from Firebase)
  displayName: String,            // User's display name (from Firebase)
  photoURL: String,               // Profile photo URL (from Firebase)
  
  // Preferences
  preferences: {
    defaultCommuteDuration: Number,  // Default commute duration in seconds
    preferredTopics: [String],       // List of preferred topics
    difficultyLevel: String,         // 'beginner' | 'intermediate' | 'advanced' | null
    autoplayEnabled: Boolean,
    notificationsEnabled: Boolean,
    theme: String,                   // 'light' | 'dark'
  },
  
  // Metadata
  createdAt: Date,                 // Account creation timestamp
  updatedAt: Date,                 // Last profile update timestamp
  lastLoginAt: Date,               // Last login timestamp
  isActive: Boolean,               // Account active status
}
```

**Indexes:**
- `firebaseUid` (unique) - **This is the primary lookup key**
- `createdAt`
- `lastLoginAt`

**Important Notes:**
- **Authentication is NOT migrated to MongoDB** - Firebase Auth remains the source of truth
- Users are created in MongoDB on first app usage (after Firebase authentication)
- Firebase UID is used for all user lookups
- No passwords or authentication tokens stored in MongoDB

---

### 2. **playlists**
Stores generated playlists with full metadata and video information.

```javascript
{
  _id: ObjectId,
  playlistId: String,              // Legacy ID format (cuid-like), indexed
  userId: ObjectId,                // Reference to users._id (indexed)
  firebaseUid: String,             // Firebase UID for direct lookup (indexed)
  
  // Playlist Metadata
  topic: String,                   // Primary topic
  topics: [String],                // All topics (for multi-topic playlists)
  durationSec: Number,             // Target duration in seconds
  mood: String,                    // 'chill' | 'energetic' | 'focused' | null
  difficultyLevel: String,         // 'beginner' | 'intermediate' | 'advanced'
  
  // Videos
  videos: [{
    videoId: String,               // YouTube video ID
    title: String,
    channelTitle: String,
    thumbnail: String,             // Thumbnail URL
    durationSec: Number,
    difficulty: String,            // 'beginner' | 'intermediate' | 'advanced'
    topicTags: [String],
    order: Number,                 // Position in playlist
  }],
  
  totalVideos: Number,             // Count of videos
  totalDurationSec: Number,        // Actual playlist duration
  
  // Sharing
  shareToken: String,              // 22-char random token (unique, indexed)
  isPublic: Boolean,               // Whether playlist is publicly accessible
  shareCount: Number,              // Number of times shared
  
  // Usage Stats
  playCount: Number,               // Number of times playlist was played
  completionRate: Number,          // Average completion rate (0-100)
  
  // Intent/Query (from agent mode or wizard)
  queryText: String,               // Original user query
  intentJSON: Object,              // Parsed user intent
  source: String,                  // 'wizard' | 'agent' | 'share'
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastPlayedAt: Date,
}
```

**Indexes:**
- `playlistId` (unique)
- `userId` (compound with createdAt for user queries)
- `firebaseUid` (compound with createdAt)
- `shareToken` (unique, sparse)
- `topic` (for topic-based queries)
- `createdAt` (for time-based queries)

---

### 3. **watch_history**
Tracks individual video watches with progress and completion data.

```javascript
{
  _id: ObjectId,
  watchId: String,                 // Legacy ID format (w + timestamp), indexed
  userId: ObjectId,                // Reference to users._id (indexed)
  firebaseUid: String,             // Firebase UID for direct lookup (indexed)
  
  // Video Information
  videoId: String,                 // YouTube video ID (indexed with userId)
  title: String,
  channelTitle: String,
  thumbnail: String,
  durationSec: Number,
  topicTags: [String],
  difficulty: String,              // 'beginner' | 'intermediate' | 'advanced'
  
  // Watch Progress
  progressPct: Number,             // 0-100 (percentage watched)
  startedAt: Date,                 // When user started watching
  completedAt: Date,               // When user finished/marked complete (indexed)
  
  // Context
  playlistId: ObjectId,            // Reference to playlists._id (nullable)
  commuteSessionId: ObjectId,      // Reference to commute_sessions._id (nullable)
  source: String,                  // 'youtube' | 'playlist' | 'recommendation'
  
  // Metadata
  createdAt: Date,                 // First watch timestamp
  updatedAt: Date,                 // Last update (for re-watches)
}
```

**Indexes:**
- `watchId` (unique)
- `userId` + `videoId` (compound, unique for deduplication)
- `firebaseUid` + `completedAt` (for user history queries)
- `userId` + `completedAt` (for analytics)
- `topicTags` (for topic-based queries)
- `createdAt`

---

### 4. **commute_sessions**
Tracks complete commute sessions with videos watched and metadata.

```javascript
{
  _id: ObjectId,
  sessionId: String,               // Legacy ID format (commute-timestamp), indexed
  userId: ObjectId,                // Reference to users._id (indexed)
  firebaseUid: String,             // Firebase UID for direct lookup (indexed)
  
  // Session Information
  topics: [String],                // Topics covered in this session
  durationSec: Number,             // Planned commute duration
  actualDurationSec: Number,       // Actual time spent (nullable)
  
  // Playlist Reference
  playlistId: ObjectId,            // Reference to playlists._id (nullable)
  
  // Videos Watched
  videosWatched: [{
    videoId: String,
    title: String,
    channelTitle: String,
    thumbnail: String,
    durationSec: Number,
    watchedAt: Date,
    completedPct: Number,          // 0-100
  }],
  
  totalVideosWatched: Number,      // Count of videos
  totalTimeWatchedSec: Number,     // Sum of video durations
  
  // Session Metrics
  completionRate: Number,          // Percentage of playlist completed (0-100)
  satisfactionRating: Number,      // Optional user rating (1-5)
  
  // Metadata
  timestamp: Date,                 // Session start timestamp (indexed)
  startedAt: Date,                 // When session actually started
  completedAt: Date,               // When session ended
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
- `sessionId` (unique)
- `userId` + `timestamp` (compound for user queries)
- `firebaseUid` + `timestamp`
- `timestamp` (for time-based analytics)
- `topics` (for topic-based queries)

---

### 5. **mastery**
Tracks user learning progress and mastery levels for different topics.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                // Reference to users._id
  firebaseUid: String,             // Firebase UID (indexed)
  topic: String,                   // Topic name (indexed with userId)
  
  // Mastery Level
  level: String,                   // 'beginner' | 'intermediate' | 'advanced'
  experiencePoints: Number,        // XP earned for this topic
  
  // Progress Tracking
  videosWatched: Number,           // Total videos watched for this topic
  totalTimeSec: Number,            // Total time spent on this topic
  completionRate: Number,          // Average completion rate (0-100)
  
  // Streak Information
  currentStreak: Number,           // Current consecutive days
  longestStreak: Number,           // Best streak ever
  lastWatchedAt: Date,             // Last time user watched this topic
  
  // Difficulty Progression
  beginnerVideosWatched: Number,
  intermediateVideosWatched: Number,
  advancedVideosWatched: Number,
  
  // Recommendations
  recommendedDifficulty: String,   // Next suggested difficulty level
  
  // Metadata
  createdAt: Date,                 // When user first watched this topic
  updatedAt: Date,                 // Last mastery update
}
```

**Indexes:**
- `userId` + `topic` (compound, unique)
- `firebaseUid` + `topic` (compound)
- `level` (for analytics)
- `lastWatchedAt` (for streak calculations)

---

### 6. **achievements**
Tracks user achievements and badge progress.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                // Reference to users._id (indexed)
  firebaseUid: String,             // Firebase UID (indexed)
  
  // Achievement Information
  badgeId: String,                 // Badge identifier (e.g., 'video-10')
  type: String,                    // 'minutes' | 'streak' | 'commute' | 'videos'
  
  // Badge Metadata
  title: String,                   // "10 Videos Watched"
  description: String,
  icon: String,                    // Emoji or icon code
  
  // Progress
  earned: Boolean,                 // Whether badge has been earned
  earnedAt: Date,                  // When badge was earned (nullable, indexed)
  progressCurrent: Number,         // Current progress value
  progressTarget: Number,          // Target value to earn badge
  progressPct: Number,             // Calculated progress percentage
  
  // Metadata
  createdAt: Date,                 // When badge tracking started
  updatedAt: Date,                 // Last progress update
}
```

**Indexes:**
- `userId` + `badgeId` (compound, unique)
- `firebaseUid` + `earned` (for user achievements)
- `earnedAt` (for recent achievements)
- `type` (for badge category queries)

---

### 7. **sessions** (Legacy Support)
Optional collection for backward compatibility with existing session data.

```javascript
{
  _id: ObjectId,
  sessionId: String,               // cuid format (indexed)
  userId: ObjectId,                // Reference to users._id
  
  // Session Data
  queryText: String,
  intentJSON: Object,
  playlistJSON: Object,            // Full playlist data (legacy)
  durationMs: Number,
  shareToken: String,              // 22-char token
  
  // Metadata
  createdAt: Date,
}
```

**Indexes:**
- `sessionId` (unique)
- `shareToken` (unique, sparse)
- `userId` + `createdAt`

---

## Data Migration Strategy

### Phase 1: Schema Implementation
1. Create MongoDB database `commutr_db`
2. Define collections with validation schemas
3. Set up indexes for optimal query performance
4. Create database access layer with TypeScript types

### Phase 2: Dual-Write Period
1. Implement MongoDB service layer alongside existing JSON storage
2. Write to both systems simultaneously
3. Validate data consistency
4. Monitor performance metrics

### Phase 3: Migration Script
1. Read all data from JSON files:
   - `data/sessions.json`
   - `data/watched.json`
   - `data/commute-history.json`
2. Transform and insert into MongoDB collections
3. Verify data integrity
4. Create seed users for existing Firebase UIDs

### Phase 4: Cutover
1. Switch all reads to MongoDB (except authentication - stays on Firebase)
2. Remove JSON file dependencies
3. Archive old JSON files
4. Monitor application performance

**Authentication Flow (Unchanged):**
1. User signs in with Google via Firebase Auth
2. Frontend receives Firebase ID token
3. Backend verifies token with Firebase Admin SDK
4. User record created/updated in MongoDB if needed (preferences only)

### Phase 5: Cleanup
1. Remove legacy JSON read/write code
2. Update tests to use MongoDB
3. Remove `data/*.json` files from repository
4. Update documentation

---

## Query Patterns

### Common Queries

**Get user playlists (most recent first):**
```javascript
db.playlists.find({ firebaseUid: "xxx" })
  .sort({ createdAt: -1 })
  .limit(20)
```

**Get user watch history (paginated):**
```javascript
db.watch_history.find({ firebaseUid: "xxx" })
  .sort({ completedAt: -1 })
  .skip(offset)
  .limit(20)
```

**Get topic mastery:**
```javascript
db.mastery.findOne({ 
  firebaseUid: "xxx", 
  topic: "python" 
})
```

**Get earned badges:**
```javascript
db.achievements.find({ 
  firebaseUid: "xxx", 
  earned: true 
})
.sort({ earnedAt: -1 })
```

**Get recent commutes:**
```javascript
db.commute_sessions.find({ firebaseUid: "xxx" })
  .sort({ timestamp: -1 })
  .limit(5)
```

**Calculate user streak:**
```javascript
db.commute_sessions.aggregate([
  { $match: { firebaseUid: "xxx" } },
  { $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
  }},
  { $sort: { _id: -1 } }
])
```

**Topic analytics:**
```javascript
db.watch_history.aggregate([
  { $match: { firebaseUid: "xxx" } },
  { $unwind: "$topicTags" },
  { $group: {
    _id: "$topicTags",
    count: { $sum: 1 },
    totalDuration: { $sum: "$durationSec" }
  }},
  { $sort: { totalDuration: -1 } }
])
```

**Note**: Agent mode conversations are stored in Redux client-side state only, not persisted to database.

---

## Benefits Over JSON Files

1. **Scalability**: Handle thousands of users and millions of records
2. **Performance**: Indexed queries vs. full file scans
3. **Concurrency**: Multiple users can read/write simultaneously
4. **Atomicity**: ACID transactions for data integrity
5. **Flexibility**: Easy schema evolution and complex queries
6. **Analytics**: Powerful aggregation pipeline for insights
7. **Backup**: Built-in replication and backup strategies
8. **Security**: Role-based access control and encryption

---

## Technology Stack

- **Database**: MongoDB Atlas (cloud) or self-hosted
- **Driver**: `mongodb` npm package (official Node.js driver)
- **ODM** (optional): Mongoose for schema validation
- **Connection Pooling**: Built-in with mongodb driver
- **Environment**: MongoDB URI in `.env` file

---

## Environment Configuration

```bash
# .env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/commutr_db
MONGODB_DB_NAME=commutr_db
```

---

## Next Steps

1. **Review and approve this schema design**
2. **Decide on MongoDB hosting** (Atlas free tier or self-hosted)
3. **Install MongoDB dependencies**
4. **Create database service layer**
5. **Implement migration script**
6. **Test with development data**
7. **Deploy to production**

---

## Questions for Consideration

1. Should we keep the `sessions` collection for backward compatibility?
2. Do we want to implement soft deletes (isDeleted flag) or hard deletes?
3. Do we need multi-region replication for global users?
4. Should we implement a caching layer (Redis) for frequently accessed data?
5. How should we handle users who exist in Firebase but not in MongoDB yet?

---

*This schema is designed to be production-ready while maintaining backward compatibility with existing features.*
