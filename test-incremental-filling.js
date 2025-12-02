/**
 * Test Incremental Playlist Filling
 * Tests the new incremental fetching strategy
 */

const API_BASE = 'http://localhost:5173';
const AUTH_TOKEN = 'Bearer TEST';

const TEST_CASES = [
  { duration: 15, topic: 'Python' },
  { duration: 30, topic: 'JavaScript' },
  { duration: 45, topic: 'Cooking' },
  { duration: 60, topic: 'Spanish' },
  { duration: 82, topic: 'History' }
];

async function testPlaylist(durationMin, topic) {
  const durationSec = durationMin * 60;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${durationMin} min - ${topic}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/wizard/playlist`, {
      method: 'POST',
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user',
        topic: topic,
        commuteDurationSec: durationSec,
        vibe: 'focused',
        difficulty: 'beginner'
      })
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status} (${elapsed}s)`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();
    
    // Handle both response formats: {status, payload} and direct {playlist}
    const playlist = data.payload?.playlist || data.playlist;
    
    if (!playlist || !playlist.items || playlist.items.length === 0) {
      console.log(`❌ No playlist items (${elapsed}s)`);
      return null;
    }

    const totalDuration = playlist.items.reduce((sum, item) => sum + item.durationSec, 0);
    const fillRate = (totalDuration / durationSec) * 100;
    const videoCount = playlist.items.length;
    const diff = totalDuration - durationSec;
    const diffMin = Math.round(diff / 60);

    console.log(`\n✅ Success! (${elapsed}s)`);
    console.log(`   Videos: ${videoCount}`);
    console.log(`   Target: ${durationMin} min (${durationSec}s)`);
    console.log(`   Actual: ${Math.round(totalDuration / 60)} min (${totalDuration}s)`);
    console.log(`   Fill Rate: ${fillRate.toFixed(1)}%`);
    console.log(`   Difference: ${diffMin > 0 ? '+' : ''}${diffMin} min`);
    
    if (fillRate >= 95 && fillRate <= 105) {
      console.log(`   Status: 🎯 PERFECT`);
    } else if (fillRate >= 85) {
      console.log(`   Status: ⚠️  GOOD`);
    } else {
      console.log(`   Status: ❌ POOR`);
    }

    return {
      duration: durationMin,
      topic,
      fillRate,
      videoCount,
      totalDuration,
      elapsed: parseFloat(elapsed),
      success: true
    };
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`❌ Error: ${error.message} (${elapsed}s)`);
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 INCREMENTAL FETCHING TEST SUITE');
  console.log('Testing smart YouTube fetching with 95% fill target\n');

  const results = [];
  
  for (const testCase of TEST_CASES) {
    const result = await testPlaylist(testCase.duration, testCase.topic);
    if (result) {
      results.push(result);
    }
    
    // Wait between tests to avoid overwhelming API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));

  if (results.length === 0) {
    console.log('\n❌ All tests failed!');
    console.log('Make sure server is running on http://localhost:5173');
    return;
  }

  const avgFillRate = results.reduce((sum, r) => sum + r.fillRate, 0) / results.length;
  const avgTime = results.reduce((sum, r) => sum + r.elapsed, 0) / results.length;
  const perfect = results.filter(r => r.fillRate >= 95 && r.fillRate <= 105).length;
  const good = results.filter(r => r.fillRate >= 85 && r.fillRate < 95).length;
  const poor = results.filter(r => r.fillRate < 85).length;

  console.log(`\nTests Run: ${results.length}/${TEST_CASES.length}`);
  console.log(`Average Fill Rate: ${avgFillRate.toFixed(1)}%`);
  console.log(`Average Time: ${avgTime.toFixed(1)}s`);
  console.log(`\nFill Rate Distribution:`);
  console.log(`  🎯 Perfect (95-105%): ${perfect}`);
  console.log(`  ⚠️  Good (85-95%):    ${good}`);
  console.log(`  ❌ Poor (<85%):       ${poor}`);

  console.log(`\nDetailed Breakdown:`);
  results.forEach(r => {
    const status = r.fillRate >= 95 && r.fillRate <= 105 ? '🎯' : r.fillRate >= 85 ? '⚠️ ' : '❌';
    console.log(`  ${status} ${r.duration}min ${r.topic}: ${r.fillRate.toFixed(1)}% (${r.videoCount} videos, ${r.elapsed}s)`);
  });

  console.log(`\n${'='.repeat(60)}\n`);
}

runTests().catch(console.error);
