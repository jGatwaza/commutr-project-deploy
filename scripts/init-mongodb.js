/**
 * MongoDB Initialization Script
 * Run with: mongosh < scripts/init-mongodb.js
 * 
 * This script:
 * 1. Creates the commutr_db database
 * 2. Creates all required collections
 * 3. Sets up indexes for optimal performance
 * 4. Inserts seed data (if needed)
 */

// Switch to commutr_db (creates if doesn't exist)
use('commutr_db');

print('📊 Creating Commutr Database Collections...\n');

// Drop existing collections (only in development)
const collections = ['users', 'playlists', 'watch_history', 'commute_sessions', 'mastery', 'achievements'];
collections.forEach(coll => {
  try {
    db.getCollection(coll).drop();
    print(`✓ Dropped existing ${coll} collection`);
  } catch (e) {
    // Collection doesn't exist, that's fine
  }
});

print('\n📦 Creating Collections...\n');

// 1. Users Collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['firebaseUid', 'email', 'createdAt', 'isActive'],
      properties: {
        firebaseUid: { bsonType: 'string', description: 'Firebase UID - PRIMARY IDENTIFIER' },
        email: { bsonType: 'string', description: 'User email from Firebase' },
        displayName: { bsonType: 'string' },
        photoURL: { bsonType: 'string' },
        preferences: { bsonType: 'object' },
        isActive: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        lastLoginAt: { bsonType: 'date' },
      }
    }
  }
});
print('✅ Created users collection');

// 2. Playlists Collection
db.createCollection('playlists', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['playlistId', 'firebaseUid', 'topic', 'videos', 'createdAt'],
      properties: {
        playlistId: { bsonType: 'string', description: 'Legacy cuid-format ID' },
        firebaseUid: { bsonType: 'string' },
        topic: { bsonType: 'string' },
        videos: { bsonType: 'array' },
        shareToken: { bsonType: 'string' },
        durationSec: { bsonType: 'number' },
        createdAt: { bsonType: 'date' },
      }
    }
  }
});
print('✅ Created playlists collection');

// 3. Watch History Collection
db.createCollection('watch_history', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['watchId', 'firebaseUid', 'videoId', 'createdAt'],
      properties: {
        watchId: { bsonType: 'string' },
        firebaseUid: { bsonType: 'string' },
        videoId: { bsonType: 'string' },
        progressPct: { bsonType: 'number', minimum: 0, maximum: 100 },
        createdAt: { bsonType: 'date' },
      }
    }
  }
});
print('✅ Created watch_history collection');

// 4. Commute Sessions Collection
db.createCollection('commute_sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'firebaseUid', 'topics', 'timestamp'],
      properties: {
        sessionId: { bsonType: 'string' },
        firebaseUid: { bsonType: 'string' },
        topics: { bsonType: 'array' },
        timestamp: { bsonType: 'date' },
      }
    }
  }
});
print('✅ Created commute_sessions collection');

// 5. Mastery Collection
db.createCollection('mastery', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['firebaseUid', 'topic', 'level', 'createdAt'],
      properties: {
        firebaseUid: { bsonType: 'string' },
        topic: { bsonType: 'string' },
        level: { enum: ['beginner', 'intermediate', 'advanced'] },
        videosWatched: { bsonType: 'number' },
        createdAt: { bsonType: 'date' },
      }
    }
  }
});
print('✅ Created mastery collection');

// 6. Achievements Collection
db.createCollection('achievements', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['firebaseUid', 'badgeId', 'type', 'earned'],
      properties: {
        firebaseUid: { bsonType: 'string' },
        badgeId: { bsonType: 'string' },
        type: { enum: ['minutes', 'streak', 'commute', 'videos'] },
        earned: { bsonType: 'bool' },
      }
    }
  }
});
print('✅ Created achievements collection');

print('\n📇 Creating Indexes...\n');

// Users Indexes
db.users.createIndex({ firebaseUid: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ lastLoginAt: -1 });
print('✅ Created users indexes');

// Playlists Indexes
db.playlists.createIndex({ playlistId: 1 }, { unique: true });
db.playlists.createIndex({ firebaseUid: 1, createdAt: -1 });
db.playlists.createIndex({ shareToken: 1 }, { unique: true, sparse: true });
db.playlists.createIndex({ topic: 1 });
print('✅ Created playlists indexes');

// Watch History Indexes
db.watch_history.createIndex({ watchId: 1 }, { unique: true });
db.watch_history.createIndex({ userId: 1, videoId: 1 }, { unique: true });
db.watch_history.createIndex({ firebaseUid: 1, completedAt: -1 });
db.watch_history.createIndex({ topicTags: 1 });
print('✅ Created watch_history indexes');

// Commute Sessions Indexes
db.commute_sessions.createIndex({ sessionId: 1 }, { unique: true });
db.commute_sessions.createIndex({ firebaseUid: 1, timestamp: -1 });
db.commute_sessions.createIndex({ topics: 1 });
print('✅ Created commute_sessions indexes');

// Mastery Indexes
db.mastery.createIndex({ userId: 1, topic: 1 }, { unique: true });
db.mastery.createIndex({ firebaseUid: 1, topic: 1 });
db.mastery.createIndex({ lastWatchedAt: -1 });
print('✅ Created mastery indexes');

// Achievements Indexes
db.achievements.createIndex({ userId: 1, badgeId: 1 }, { unique: true });
db.achievements.createIndex({ firebaseUid: 1, earned: 1 });
db.achievements.createIndex({ earnedAt: -1 });
print('✅ Created achievements indexes');

print('\n✨ Database initialization complete!\n');
print('Database: commutr_db');
print('Collections: ' + db.getCollectionNames().length);
print('\n📊 Collection Status:');

db.getCollectionNames().forEach(name => {
  const count = db.getCollection(name).countDocuments();
  print(`  - ${name}: ${count} documents`);
});

print('\n🎯 Ready for MongoDB integration!');
print('Note: Authentication stays on Firebase (Google Auth only)\n');
