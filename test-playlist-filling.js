/**
 * Playlist Fill Rate Test Script
 * Tests various commute durations and reports fill percentages
 */

const API_BASE = 'http://localhost:5173';
const AUTH_TOKEN = 'Bearer TEST';

const TEST_CASES = [
  { duration: 5, topic: 'Python' },
  { duration: 10, topic: 'JavaScript' },
  { duration: 15, topic: 'Cooking' },
  { duration: 20, topic: 'Spanish' },
  { duration: 25, topic: 'Photography' },
  { duration: 30, topic: 'Fitness' },
  { duration: 35, topic: 'History' },
  { duration: 40, topic: 'Music Theory' },
  { duration: 45, topic: 'React' },
  { duration: 50, topic: 'Machine Learning' },
  { duration: 60, topic: 'Web Development' },
  { duration: 75, topic: 'Data Science' },
  { duration: 82, topic: 'Quantum Physics' },
  { duration: 90, topic: 'Biology' },
  { duration: 120, topic: 'Economics' }
];

async function testPlaylistFilling(durationMin, topic) {
  const durationSec = durationMin * 60;
  
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

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        fillRate: 0
      };
    }

    const data = await response.json();
    
    if (!data.playlist || !data.playlist.items || data.playlist.items.length === 0) {
      return {
        success: false,
        error: 'No playlist items',
        fillRate: 0
      };
    }

    const totalDuration = data.playlist.items.reduce((sum, item) => sum + item.durationSec, 0);
    const fillRate = (totalDuration / durationSec) * 100;
    const videoCount = data.playlist.items.length;

    return {
      success: true,
      totalDuration,
      videoCount,
      fillRate,
      targetDuration: durationSec,
      difference: totalDuration - durationSec
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fillRate: 0
    };
  }
}

async function runAllTests() {
  console.log('🧪 PLAYLIST FILL RATE TEST SUITE\n');
  console.log('=' .repeat(80));
  console.log('Testing various commute durations...\n');

  const results = [];
  
  for (const testCase of TEST_CASES) {
    process.stdout.write(`Testing ${testCase.duration} min (${testCase.topic})... `);
    
    const result = await testPlaylistFilling(testCase.duration, testCase.topic);
    results.push({
      duration: testCase.duration,
      topic: testCase.topic,
      ...result
    });

    if (result.success) {
      const fillRateStr = result.fillRate.toFixed(1);
      const status = result.fillRate >= 95 ? '✅' : result.fillRate >= 85 ? '⚠️' : '❌';
      console.log(`${status} ${fillRateStr}% (${result.videoCount} videos, ${Math.round(result.totalDuration / 60)} min)`);
    } else {
      console.log(`❌ FAILED: ${result.error}`);
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY REPORT\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    const avgFillRate = successful.reduce((sum, r) => sum + r.fillRate, 0) / successful.length;
    const perfect = successful.filter(r => r.fillRate >= 95 && r.fillRate <= 105).length;
    const good = successful.filter(r => r.fillRate >= 85 && r.fillRate < 95).length;
    const poor = successful.filter(r => r.fillRate < 85).length;

    console.log(`Total Tests: ${TEST_CASES.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}\n`);

    console.log(`Average Fill Rate: ${avgFillRate.toFixed(1)}%\n`);

    console.log('Fill Rate Distribution:');
    console.log(`  ✅ Perfect (95-105%): ${perfect} tests`);
    console.log(`  ⚠️  Good (85-95%):    ${good} tests`);
    console.log(`  ❌ Poor (<85%):       ${poor} tests\n`);

    console.log('Detailed Results:');
    console.log('-'.repeat(80));
    console.log('Duration | Topic              | Fill Rate | Videos | Total Time | Diff');
    console.log('-'.repeat(80));
    
    successful.forEach(r => {
      const durationStr = `${r.duration} min`.padEnd(8);
      const topicStr = r.topic.padEnd(18);
      const fillRateStr = `${r.fillRate.toFixed(1)}%`.padEnd(9);
      const videoStr = `${r.videoCount}`.padEnd(6);
      const totalStr = `${Math.round(r.totalDuration / 60)} min`.padEnd(10);
      const diffStr = `${r.difference > 0 ? '+' : ''}${Math.round(r.difference / 60)} min`;
      
      console.log(`${durationStr} | ${topicStr} | ${fillRateStr} | ${videoStr} | ${totalStr} | ${diffStr}`);
    });

    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(r => {
        console.log(`  ${r.duration} min (${r.topic}): ${r.error}`);
      });
    }
  } else {
    console.log('❌ All tests failed!');
    console.log('\nMake sure:');
    console.log('  1. Server is running on http://localhost:5173');
    console.log('  2. YouTube API key is configured');
    console.log('  3. Database is accessible');
  }

  console.log('\n' + '='.repeat(80));
}

// Run the tests
runAllTests().catch(console.error);
