# Commutr Database Relationships

## Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│     USERS       │
│─────────────────│
│ _id (PK)        │◄──┐
│ firebaseUid     │   │
│ email           │   │
│ preferences     │   │
│ createdAt       │   │
└─────────────────┘   │
                      │
                      │ 1:N
                      │
        ┌─────────────┼────────────────┬──────────────┬────────────────┬─────────────┐
        │             │                │              │                │
        │             │                │              │                │
        ▼             ▼                ▼              ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│  PLAYLISTS   │ │WATCH_HISTORY │ │COMMUTE_     │ │  MASTERY    │ │ACHIEVEMENTS  │
│──────────────│ │──────────────│ │SESSIONS     │ │─────────────│ │──────────────│
│ _id (PK)     │ │ _id (PK)     │ │─────────────│ │ _id (PK)    │ │ _id (PK)     │
│ userId (FK)  │ │ userId (FK)  │ │ _id (PK)    │ │ userId (FK) │ │ userId (FK)  │
│ videos[]     │ │ videoId      │ │ userId (FK) │ │ topic       │ │ badgeId      │
│ shareToken   │ │ progressPct  │ │ topics[]    │ │ level       │ │ earned       │
│ topic        │ │ completedAt  │ │ playlistId  │ │ videosWatched│ │ progressCur │
└──────────────┘ └──────────────┘ └─────────────┘ └─────────────┘ └──────────────┘
       │                │                │
       │                │                │
       │                └────────────────┤
       │                                 │
       │         References (nullable)   │
       └─────────────────────────────────┘
```

## Collection Relationships

### Important: Authentication Architecture
**Firebase Auth is the single source of truth for authentication:**
- All authentication handled by Firebase (Google OAuth only)
- `firebaseUid` is the primary user identifier across all collections
- Users collection stores preferences/metadata only (no auth credentials)
- Users auto-created in MongoDB on first app usage

---

### 1. **users → playlists** (1:N)
- One user can have many playlists
- `playlists.userId` references `users._id`
- `playlists.firebaseUid` duplicates `users.firebaseUid` for faster lookups
- **Cascade behavior**: When user is deleted, optionally soft-delete or archive playlists
- **Note**: User authentication managed by Firebase, not MongoDB

### 2. **users → watch_history** (1:N)
- One user can have many watch history entries
- `watch_history.userId` references `users._id`
- Unique constraint on `(userId, videoId)` prevents duplicate entries
- **Cascade behavior**: Archive watch history when user is deleted

### 3. **users → commute_sessions** (1:N)
- One user can have many commute sessions
- `commute_sessions.userId` references `users._id`
- Sessions are time-ordered for history display
- **Cascade behavior**: Archive sessions when user is deleted

### 4. **users → mastery** (1:N)
- One user can have mastery records for multiple topics
- `mastery.userId` references `users._id`
- Unique constraint on `(userId, topic)` ensures one record per topic
- **Update behavior**: Real-time updates as user watches videos

### 5. **users → achievements** (1:N)
- One user can have multiple achievement records
- `achievements.userId` references `users._id`
- Unique constraint on `(userId, badgeId)` ensures one badge per user
- **Update behavior**: Calculated and updated after each session

### 6. **playlists ← watch_history** (N:1, optional)
- A watch history entry may belong to a playlist
- `watch_history.playlistId` references `playlists._id` (nullable)
- Tracks which videos were watched from which playlists

### 7. **playlists ← commute_sessions** (N:1, optional)
- A commute session may use a specific playlist
- `commute_sessions.playlistId` references `playlists._id` (nullable)
- Links sessions to the playlist they used

---

**Note**: Agent mode conversations are stored in client-side Redux state only and are not persisted to the database.

---

## Data Flow Diagrams

### A. Playlist Creation Flow

```
User Input (Wizard/Agent)
         │
         ▼
   ┌──────────┐
   │  Intent  │
   │ Parsing  │
   └────┬─────┘
        │
        ▼
   ┌────────────┐         ┌──────────────┐
   │  YouTube   │────────▶│  PLAYLISTS   │
   │   Search   │         │  Collection  │
   └────────────┘         └──────┬───────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │    Return    │
                         │ Playlist ID  │
                         └──────────────┘
```

### B. Video Watch Flow

```
User Watches Video
         │
         ▼
   ┌─────────────────┐
   │  WATCH_HISTORY  │◄──── Update progress
   │    upsert       │
   └────────┬────────┘
            │
            ├──────────────────┬───────────────┬────────────────┐
            ▼                  ▼               ▼                ▼
      ┌──────────┐       ┌─────────┐   ┌─────────────┐  ┌────────────┐
      │ MASTERY  │       │COMMUTE_ │   │ACHIEVEMENTS │  │ PLAYLISTS  │
      │  update  │       │SESSIONS │   │   update    │  │ stats      │
      └──────────┘       └─────────┘   └─────────────┘  └────────────┘
           │                   │               │               │
           └───────────────────┴───────────────┴───────────────┘
                                   │
                                   ▼
                            Streak Calculation
```

### C. Achievement Calculation Flow

```
User Completes Action (Watch/Session)
              │
              ▼
      ┌───────────────┐
      │ Load All Data │
      │ for User      │
      └───────┬───────┘
              │
              ├─────────────┬─────────────┐
              ▼             ▼             ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │  WATCH_  │   │ COMMUTE_ │   │ MASTERY  │
      │ HISTORY  │   │ SESSIONS │   │          │
      └────┬─────┘   └────┬─────┘   └────┬─────┘
           │              │              │
           └──────────────┴──────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Calculate:     │
              │ - Total mins   │
              │ - Streak       │
              │ - Video count  │
              │ - Session count│
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  ACHIEVEMENTS  │
              │    update      │
              └────────────────┘
```

---

## Indexing Strategy

### Primary Indexes (for uniqueness)
```javascript
users: { firebaseUid: 1 } (unique)
playlists: { playlistId: 1 } (unique)
watch_history: { userId: 1, videoId: 1 } (unique compound)
commute_sessions: { sessionId: 1 } (unique)
mastery: { userId: 1, topic: 1 } (unique compound)
achievements: { userId: 1, badgeId: 1 } (unique compound)
```

### Query Optimization Indexes
```javascript
// User data lookups
playlists: { firebaseUid: 1, createdAt: -1 }
watch_history: { firebaseUid: 1, completedAt: -1 }
commute_sessions: { firebaseUid: 1, timestamp: -1 }

// Topic-based queries
watch_history: { topicTags: 1 }
playlists: { topic: 1 }
commute_sessions: { topics: 1 }

// Time-based analytics
watch_history: { completedAt: -1 }
commute_sessions: { timestamp: -1 }
achievements: { earnedAt: -1 }

// Sharing features
playlists: { shareToken: 1 } (unique, sparse)
```

---

## Referential Integrity

MongoDB doesn't enforce foreign key constraints like SQL databases, so we need to handle referential integrity at the application level:

### Strategy 1: Embed userId and firebaseUid
- Store both `userId` (ObjectId) and `firebaseUid` (String) in child documents
- Allows direct lookups without joining
- Slight data duplication for performance

### Strategy 2: Use Application-Level Validation
- Validate references exist before creating documents
- Use transactions for multi-document operations
- Implement cascade delete logic in service layer

### Strategy 3: Denormalize When Beneficial
- Store essential playlist data in `commute_sessions.videosWatched`
- Reduces need for joins when displaying history
- Accept eventual consistency for historical data

---

## Data Consistency Patterns

### Pattern 1: Read-Your-Writes
When a user creates a playlist and immediately views it:
```javascript
// Use same MongoDB connection/session
const playlist = await createPlaylist(data);
const retrieved = await getPlaylist(playlist._id); // Guaranteed to see it
```

### Pattern 2: Eventual Consistency for Stats
Achievement and mastery calculations can be eventually consistent:
```javascript
// Fire-and-forget achievement recalculation
await saveWatchHistory(entry);
recalculateAchievements(userId).catch(err => log.error(err)); // async
```

### Pattern 3: Transactions for Critical Paths
Use transactions when data integrity is critical:
```javascript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await playlists.insertOne(playlistDoc, { session });
    await users.updateOne(
      { _id: userId },
      { $inc: { 'stats.playlistsCreated': 1 } },
      { session }
    );
  });
} finally {
  await session.endSession();
}
```

---

## Backup and Recovery Strategy

### Daily Backups
- Automated daily backups of entire database
- Retention: 30 days for daily, 12 months for monthly
- Use MongoDB Atlas automated backups or `mongodump`

### Point-in-Time Recovery
- Enable oplog for point-in-time restores
- Useful for recovering from data corruption

### Export Critical Collections
- Weekly exports of `users` and `playlists` collections
- Store in S3 or external backup service
- Enable quick data recovery for auditing

---

## Performance Considerations

### Read Optimization
- Use indexes for all query patterns
- Consider read replicas for heavy read workloads
- Implement caching for frequently accessed data (e.g., user preferences)

### Write Optimization
- Batch writes when possible (e.g., bulk achievement updates)
- Use unordered bulk operations for non-critical writes
- Minimize transaction scope to reduce lock time

### Sharding Strategy (Future)
If the application scales to millions of users:
```javascript
// Shard key: firebaseUid (ensures user data stays together)
sh.shardCollection("commutr_db.playlists", { firebaseUid: "hashed" })
sh.shardCollection("commutr_db.watch_history", { firebaseUid: "hashed" })
```

---

## Migration Rollback Plan

If issues arise during migration:

1. **Keep JSON files as backup** during migration period
2. **Dual-read capability**: Read from MongoDB, fallback to JSON
3. **Feature flags**: Control which users use MongoDB vs. JSON
4. **Rollback script**: Export MongoDB data back to JSON format
5. **Monitoring**: Track error rates and performance metrics

---

*This document provides the architectural foundation for a scalable, performant MongoDB integration.*
