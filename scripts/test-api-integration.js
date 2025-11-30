/**
 * Test API Integration with MongoDB
 * Run with: node scripts/test-api-integration.js
 * 
 * Prerequisites: Server must be running on port 5173
 */

const BASE_URL = 'http://localhost:5173';
const AUTH_TOKEN = 'Bearer TEST';

async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': AUTH_TOKEN,
      'X-User-Id': 'test-user-123'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);
  
  return { status: response.status, data };
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  const { status, data } = await request('GET', '/health');
  
  if (status === 200 && data.database === 'connected') {
    console.log('✅ Health check passed');
    console.log(`   Status: ${data.status}`);
    console.log(`   Database: ${data.database}`);
    return true;
  } else {
    console.log('❌ Health check failed');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return false;
  }
}

async function testCreatePlaylist() {
  console.log('\n📝 Testing Create Playlist (POST /api/history)...');
  
  const playlist = {
    queryText: 'Learn JavaScript basics',
    intent: { topic: 'javascript', duration: 600 },
    playlist: {
      topic: 'javascript',
      items: [
        {
          videoId: 'test-video-1',
          title: 'JavaScript Tutorial for Beginners',
          channelTitle: 'Code Academy',
          thumbnail: 'https://img.youtube.com/vi/test-video-1/mqdefault.jpg',
          durationSec: 300
        },
        {
          videoId: 'test-video-2',
          title: 'Variables and Data Types',
          channelTitle: 'Code Academy',
          thumbnail: 'https://img.youtube.com/vi/test-video-2/mqdefault.jpg',
          durationSec: 300
        }
      ]
    },
    durationMs: 600000
  };

  const { status, data } = await request('POST', '/api/history', playlist);
  
  if (status === 200 && data.id && data.shareToken) {
    console.log('✅ Playlist created successfully');
    console.log(`   Playlist ID: ${data.id}`);
    console.log(`   Share Token: ${data.shareToken}`);
    return data;
  } else {
    console.log('❌ Failed to create playlist');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return null;
  }
}

async function testListPlaylists() {
  console.log('\n📋 Testing List Playlists (GET /api/history)...');
  
  const { status, data } = await request('GET', '/api/history?limit=10');
  
  if (status === 200 && Array.isArray(data)) {
    console.log(`✅ Retrieved ${data.length} playlists`);
    if (data.length > 0) {
      console.log(`   First playlist: ${data[0].queryText}`);
    }
    return data;
  } else {
    console.log('❌ Failed to list playlists');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return [];
  }
}

async function testGetPlaylist(playlistId) {
  console.log(`\n🔍 Testing Get Playlist (GET /api/history/${playlistId})...`);
  
  const { status, data } = await request('GET', `/api/history/${playlistId}`);
  
  if (status === 200 && data.id === playlistId) {
    console.log('✅ Retrieved playlist successfully');
    console.log(`   Topic: ${data.queryText}`);
    console.log(`   Videos: ${data.playlist?.items?.length || 0}`);
    return data;
  } else {
    console.log('❌ Failed to get playlist');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return null;
  }
}

async function testRecordWatchHistory() {
  console.log('\n👁️  Testing Record Watch History (POST /api/history/watch)...');
  
  const watchEntry = {
    userId: 'test-user-123',
    videoId: 'test-video-1',
    title: 'JavaScript Tutorial for Beginners',
    durationSec: 300,
    topicTags: ['javascript', 'programming'],
    progressPct: 100,
    completedAt: new Date().toISOString(),
    source: 'test'
  };

  const { status, data } = await request('POST', '/api/history/watch', watchEntry);
  
  if (status === 201 && data.id) {
    console.log('✅ Watch history recorded successfully');
    console.log(`   Watch ID: ${data.id}`);
    console.log(`   Video: ${data.title}`);
    console.log(`   Progress: ${data.progressPct}%`);
    return data;
  } else {
    console.log('❌ Failed to record watch history');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return null;
  }
}

async function testGetWatchHistory() {
  console.log('\n📊 Testing Get Watch History (GET /api/history/watch)...');
  
  const { status, data } = await request('GET', '/api/history/watch?userId=test-user-123&limit=10');
  
  if (status === 200 && data.items) {
    console.log(`✅ Retrieved ${data.items.length} watch entries`);
    if (data.items.length > 0) {
      console.log(`   Recent: ${data.items[0].title}`);
    }
    return data.items;
  } else {
    console.log('❌ Failed to get watch history');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return [];
  }
}

async function testSaveCommuteSession() {
  console.log('\n🚗 Testing Save Commute Session (POST /api/commute-history)...');
  
  const commuteSession = {
    userId: 'test-user-123',
    session: {
      id: `commute-${Date.now()}`,
      timestamp: new Date().toISOString(),
      topics: ['javascript'],
      durationSec: 600,
      videosWatched: [
        {
          videoId: 'test-video-1',
          title: 'JavaScript Tutorial',
          thumbnail: 'https://img.youtube.com/vi/test-video-1/mqdefault.jpg',
          channelTitle: 'Code Academy',
          durationSec: 300
        }
      ]
    }
  };

  const { status, data } = await request('POST', '/api/commute-history', commuteSession);
  
  if (status === 200 && data.success) {
    console.log('✅ Commute session saved successfully');
    console.log(`   Session ID: ${data.id}`);
    return data;
  } else {
    console.log('❌ Failed to save commute session');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return null;
  }
}

async function testGetCommuteHistory() {
  console.log('\n🚙 Testing Get Commute History (GET /api/commute-history/:userId)...');
  
  const { status, data } = await request('GET', '/api/commute-history/test-user-123');
  
  if (status === 200 && data.history) {
    console.log(`✅ Retrieved ${data.history.length} commute sessions`);
    if (data.history.length > 0) {
      console.log(`   Recent: ${data.history[0].topics.join(', ')}`);
    }
    return data.history;
  } else {
    console.log('❌ Failed to get commute history');
    console.log(`   Status: ${status}`);
    console.log(`   Response:`, data);
    return [];
  }
}

async function runAllTests() {
  console.log('🧪 Starting API Integration Tests with MongoDB');
  console.log('=' .repeat(60));
  
  let passedTests = 0;
  let failedTests = 0;

  try {
    // Test 1: Health Check
    const healthOk = await testHealthCheck();
    if (healthOk) passedTests++; else failedTests++;

    // Test 2: Create Playlist
    const playlist = await testCreatePlaylist();
    if (playlist) passedTests++; else failedTests++;

    // Test 3: List Playlists
    const playlists = await testListPlaylists();
    if (playlists.length > 0) passedTests++; else failedTests++;

    // Test 4: Get Playlist (if we have one)
    if (playlist) {
      const retrievedPlaylist = await testGetPlaylist(playlist.id);
      if (retrievedPlaylist) passedTests++; else failedTests++;
    }

    // Test 5: Record Watch History
    const watchEntry = await testRecordWatchHistory();
    if (watchEntry) passedTests++; else failedTests++;

    // Test 6: Get Watch History
    const watchHistory = await testGetWatchHistory();
    if (watchHistory.length > 0) passedTests++; else failedTests++;

    // Test 7: Save Commute Session
    const commuteSession = await testSaveCommuteSession();
    if (commuteSession) passedTests++; else failedTests++;

    // Test 8: Get Commute History
    const commuteHistory = await testGetCommuteHistory();
    if (commuteHistory.length > 0) passedTests++; else failedTests++;

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    failedTests++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! MongoDB integration is working correctly!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
