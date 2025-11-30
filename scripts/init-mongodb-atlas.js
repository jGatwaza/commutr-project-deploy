/**
 * MongoDB Atlas Initialization Script
 * Run with: node -r dotenv/config scripts/init-mongodb-atlas.js
 * 
 * This script:
 * 1. Connects to MongoDB Atlas
 * 2. Creates all required collections
 * 3. Sets up indexes for optimal performance
 * 4. Optionally drops existing collections (for development)
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'commutr_db';
const DROP_EXISTING = process.env.DROP_EXISTING === 'true'; // Set to 'true' to drop existing collections

async function initializeDatabase() {
  console.log('\n📊 Initializing MongoDB Atlas Database...\n');
  console.log(`Database: ${DB_NAME}`);
  console.log(`Drop existing: ${DROP_EXISTING}\n`);

  let client;

  try {
    // Connect to MongoDB Atlas
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('⏳ Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const db = client.db(DB_NAME);

    // Drop existing collections if requested
    if (DROP_EXISTING) {
      console.log('🗑️  Dropping existing collections...');
      const collections = ['users', 'playlists', 'watch_history', 'commute_sessions', 'mastery', 'achievements'];
      
      for (const collName of collections) {
        try {
          await db.collection(collName).drop();
          console.log(`   ✓ Dropped ${collName}`);
        } catch (e) {
          // Collection doesn't exist, that's fine
        }
      }
      console.log('');
    }

    console.log('📦 Creating Collections...\n');

    // 1. Users Collection
    await db.createCollection('users', {
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
    console.log('✅ Created users collection');

    // 2. Playlists Collection
    await db.createCollection('playlists', {
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
    console.log('✅ Created playlists collection');

    // 3. Watch History Collection
    await db.createCollection('watch_history', {
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
    console.log('✅ Created watch_history collection');

    // 4. Commute Sessions Collection
    await db.createCollection('commute_sessions', {
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
    console.log('✅ Created commute_sessions collection');

    // 5. Mastery Collection
    await db.createCollection('mastery', {
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
    console.log('✅ Created mastery collection');

    // 6. Achievements Collection
    await db.createCollection('achievements', {
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
    console.log('✅ Created achievements collection');

    console.log('\n📇 Creating Indexes...\n');

    // Users Indexes
    await db.collection('users').createIndex({ firebaseUid: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: -1 });
    await db.collection('users').createIndex({ lastLoginAt: -1 });
    console.log('✅ Created users indexes');

    // Playlists Indexes
    await db.collection('playlists').createIndex({ playlistId: 1 }, { unique: true });
    await db.collection('playlists').createIndex({ firebaseUid: 1, createdAt: -1 });
    await db.collection('playlists').createIndex({ shareToken: 1 }, { unique: true, sparse: true });
    await db.collection('playlists').createIndex({ topic: 1 });
    console.log('✅ Created playlists indexes');

    // Watch History Indexes
    await db.collection('watch_history').createIndex({ watchId: 1 }, { unique: true });
    await db.collection('watch_history').createIndex({ userId: 1, videoId: 1 }, { unique: true });
    await db.collection('watch_history').createIndex({ firebaseUid: 1, completedAt: -1 });
    await db.collection('watch_history').createIndex({ topicTags: 1 });
    console.log('✅ Created watch_history indexes');

    // Commute Sessions Indexes
    await db.collection('commute_sessions').createIndex({ sessionId: 1 }, { unique: true });
    await db.collection('commute_sessions').createIndex({ firebaseUid: 1, timestamp: -1 });
    await db.collection('commute_sessions').createIndex({ topics: 1 });
    console.log('✅ Created commute_sessions indexes');

    // Mastery Indexes
    await db.collection('mastery').createIndex({ userId: 1, topic: 1 }, { unique: true });
    await db.collection('mastery').createIndex({ firebaseUid: 1, topic: 1 });
    await db.collection('mastery').createIndex({ lastWatchedAt: -1 });
    console.log('✅ Created mastery indexes');

    // Achievements Indexes
    await db.collection('achievements').createIndex({ userId: 1, badgeId: 1 }, { unique: true });
    await db.collection('achievements').createIndex({ firebaseUid: 1, earned: 1 });
    await db.collection('achievements').createIndex({ earnedAt: -1 });
    console.log('✅ Created achievements indexes');

    console.log('\n✨ Database initialization complete!\n');
    console.log(`Database: ${DB_NAME}`);
    
    const collections = await db.listCollections().toArray();
    console.log(`Collections: ${collections.length}`);
    console.log('\n📊 Collection Status:');

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }

    console.log('\n🎯 MongoDB Atlas is ready for Commutr!');
    console.log('Note: Authentication stays on Firebase (Google Auth only)\n');

  } catch (error) {
    console.error('\n❌ Initialization failed!\n');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed.\n');
    }
  }
}

initializeDatabase();
