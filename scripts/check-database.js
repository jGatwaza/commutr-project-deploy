/**
 * Quick script to check what's in the MongoDB database
 * Run with: node -r dotenv/config scripts/check-database.js
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'commutr_db';

async function checkDatabase() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas\n');
    
    const db = client.db(dbName);
    
    // Check users collection
    console.log('📊 USERS COLLECTION:');
    const users = await db.collection('users').find({}).toArray();
    console.log(`   Total users: ${users.length}`);
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.firebaseUid})`);
        console.log(`     Created: ${user.createdAt}`);
        console.log(`     Last login: ${user.lastLogin || 'Never'}\n`);
      });
    } else {
      console.log('   ⚠️  No users found. Users are created automatically on first API call.\n');
    }
    
    // Check playlists collection
    console.log('📊 PLAYLISTS COLLECTION:');
    const playlists = await db.collection('playlists').find({}).limit(5).toArray();
    console.log(`   Total playlists: ${await db.collection('playlists').countDocuments()}`);
    if (playlists.length > 0) {
      playlists.forEach(playlist => {
        console.log(`   - ${playlist.topic} (${playlist.playlistId})`);
        console.log(`     User: ${playlist.firebaseUid}`);
        console.log(`     Created: ${playlist.createdAt}`);
        console.log(`     Videos: ${playlist.videos?.length || 0}\n`);
      });
    } else {
      console.log('   ⚠️  No playlists found.\n');
    }
    
    // Check watch_history collection
    console.log('📊 WATCH HISTORY COLLECTION:');
    const watchHistory = await db.collection('watch_history').find({}).limit(5).toArray();
    console.log(`   Total watch entries: ${await db.collection('watch_history').countDocuments()}`);
    if (watchHistory.length > 0) {
      watchHistory.forEach(watch => {
        console.log(`   - ${watch.title} (${watch.videoId})`);
        console.log(`     User: ${watch.firebaseUid}`);
        console.log(`     Progress: ${watch.progressPct}%`);
        console.log(`     Completed: ${watch.completedAt || 'Not yet'}\n`);
      });
    } else {
      console.log('   ⚠️  No watch history found.\n');
    }
    
    // Check commute_sessions collection
    console.log('📊 COMMUTE SESSIONS COLLECTION:');
    const commutes = await db.collection('commute_sessions').find({}).limit(5).toArray();
    console.log(`   Total commute sessions: ${await db.collection('commute_sessions').countDocuments()}`);
    if (commutes.length > 0) {
      commutes.forEach(commute => {
        console.log(`   - Session ${commute.sessionId}`);
        console.log(`     User: ${commute.firebaseUid}`);
        console.log(`     Topics: ${commute.topics.join(', ')}`);
        console.log(`     Duration: ${Math.floor(commute.durationSec / 60)}min`);
        console.log(`     Videos watched: ${commute.videosWatched?.length || 0}\n`);
      });
    } else {
      console.log('   ⚠️  No commute sessions found.\n');
    }
    
    // Check mastery collection
    console.log('📊 MASTERY COLLECTION:');
    const mastery = await db.collection('mastery').find({}).limit(5).toArray();
    console.log(`   Total mastery records: ${await db.collection('mastery').countDocuments()}`);
    if (mastery.length > 0) {
      mastery.forEach(m => {
        console.log(`   - ${m.topic}`);
        console.log(`     User: ${m.firebaseUid}`);
        console.log(`     Level: ${m.level} (${m.xp} XP)`);
        console.log(`     Videos watched: ${m.videosWatched}\n`);
      });
    } else {
      console.log('   ⚠️  No mastery records found.\n');
    }
    
    // Check achievements collection
    console.log('📊 ACHIEVEMENTS COLLECTION:');
    const achievements = await db.collection('achievements').find({}).limit(3).toArray();
    console.log(`   Total achievement records: ${await db.collection('achievements').countDocuments()}`);
    if (achievements.length > 0) {
      achievements.forEach(a => {
        console.log(`   - User: ${a.firebaseUid}`);
        console.log(`     Earned badges: ${a.earnedBadges?.length || 0}`);
        console.log(`     Total videos: ${a.totalVideosWatched}`);
        console.log(`     Total watch time: ${Math.floor((a.totalWatchTimeMin || 0) / 60)}hr ${(a.totalWatchTimeMin || 0) % 60}min\n`);
      });
    } else {
      console.log('   ⚠️  No achievement records found.\n');
    }
    
    console.log('='.repeat(60));
    console.log('\n💡 TIP: If collections are empty, sign in to the app and:');
    console.log('   1. Create a playlist');
    console.log('   2. Watch a video');
    console.log('   3. Complete a commute');
    console.log('   Then run this script again to see the data!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkDatabase();
