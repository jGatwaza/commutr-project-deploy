// Your personal test file - modify as you want!
const { buildPack } = require('./src/pack/builder.ts');

// Create your own video candidates
const candidates = [
  { videoId: 'python1', channelId: 'freeCodeCamp', durationSec: 300, topic: 'python', level: 'beginner' },
  { videoId: 'python2', channelId: 'techWithTim', durationSec: 400, topic: 'python', level: 'beginner' },
  { videoId: 'python3', channelId: 'coreySchafer', durationSec: 500, topic: 'python', level: 'intermediate' },
  { videoId: 'python4', channelId: 'freeCodeCamp', durationSec: 350, topic: 'python', level: 'advanced' }
];

console.log('🧪 My Personal Algorithm Test');
console.log('============================');

// Test 1: Try to fit a 15-minute commute
console.log('\n📋 Test: 15-minute commute window');
const result = buildPack({
  topic: 'python',
  minDurationSec: 840,  // 14 minutes minimum
  maxDurationSec: 960,  // 16 minutes maximum
  userMasteryLevel: 'beginner',
  candidates: candidates
});

console.log('Videos selected:', result.items);
console.log('Total duration:', result.totalDurationSec, 'seconds');
console.log('Is underFilled?', result.underFilled);

// TODO: Add your own tests here!
// Try different time windows, blocked channels, etc.
