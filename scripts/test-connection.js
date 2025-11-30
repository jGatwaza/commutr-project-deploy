/**
 * Test MongoDB Atlas Connection
 * Run with: node -r dotenv/config scripts/test-connection.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'commutr_db';

async function testConnection() {
  console.log('\n🔍 Testing MongoDB Connection...\n');
  console.log(`Database: ${DB_NAME}`);
  console.log(`URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n`);

  let client;

  try {
    // Create client
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('⏳ Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Test database access
    const db = client.db(DB_NAME);
    console.log('📊 Testing database operations...');

    // Ping database
    await db.admin().ping();
    console.log('✅ Database ping successful!');

    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Get database stats
    const stats = await db.stats();
    console.log(`\n📈 Database Statistics:`);
    console.log(`   - Collections: ${stats.collections}`);
    console.log(`   - Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`   - Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log(`   - Indexes: ${stats.indexes}`);

    // Test write operation
    console.log(`\n🧪 Testing write operation...`);
    const testCollection = db.collection('_connection_test');
    await testCollection.insertOne({
      test: true,
      timestamp: new Date(),
      message: 'Connection test successful'
    });
    console.log('✅ Write operation successful!');

    // Clean up test collection
    await testCollection.drop();
    console.log('✅ Cleanup successful!');

    console.log('\n🎉 All tests passed! MongoDB Atlas is ready to use.\n');

  } catch (error) {
    console.error('\n❌ Connection failed!\n');
    console.error('Error:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check your username and password in .env');
      console.error('   2. Verify database user exists in Atlas');
      console.error('   3. Ensure user has correct permissions');
    } else if (error.message.includes('timed out')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check Network Access whitelist in Atlas');
      console.error('   2. Verify your IP is allowed (or use 0.0.0.0/0 for development)');
      console.error('   3. Check your internet connection');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed.\n');
    }
  }
}

testConnection();
