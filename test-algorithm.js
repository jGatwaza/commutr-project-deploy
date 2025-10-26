const { buildPack } = require('./src/pack/builder.ts');

// Mock video candidates (no external API needed!)
const mockCandidates = [
  { videoId: 'vid1', channelId: 'chA', durationSec: 300, topic: 'javascript', level: 'beginner' },
  { videoId: 'vid2', channelId: 'chB', durationSec: 400, topic: 'javascript', level: 'beginner' },
  { videoId: 'vid3', channelId: 'chC', durationSec: 500, topic: 'javascript', level: 'intermediate' },
  { videoId: 'vid4', channelId: 'chA', durationSec: 600, topic: 'javascript', level: 'advanced' }
];

console.log('🧪 Testing Pack Builder Algorithm (No External APIs)');
console.log('================================================');

// Test 1: Basic time fitting
console.log('\n📋 Test 1: Fit videos into 15-minute window');
const result1 = buildPack({
  topic: 'javascript',
  minDurationSec: 840,  // 14 minutes
  maxDurationSec: 960,  // 16 minutes  
  userMasteryLevel: 'beginner',
  candidates: mockCandidates
});

console.log('Result:', result1);
console.log('✅ Total duration:', result1.totalDurationSec, 'seconds');
console.log('✅ Within window?', result1.totalDurationSec >= 840 && result1.totalDurationSec <= 960);

// Test 2: Blocked channels
console.log('\n📋 Test 2: Block channel A');
const result2 = buildPack({
  topic: 'javascript',
  minDurationSec: 840,
  maxDurationSec: 960,
  userMasteryLevel: 'beginner',
  candidates: mockCandidates,
  blockedChannelIds: ['chA']  // Block channel A
});

console.log('Result:', result2);
console.log('✅ No channel A videos?', !result2.items.some(item => item.channelId === 'chA'));

// Test 3: Deterministic with seed
console.log('\n📋 Test 3: Deterministic behavior');
const result3a = buildPack({
  topic: 'javascript',
  minDurationSec: 840,
  maxDurationSec: 960,
  userMasteryLevel: 'beginner',
  candidates: mockCandidates,
  seed: 12345
});

const result3b = buildPack({
  topic: 'javascript',
  minDurationSec: 840,
  maxDurationSec: 960,
  userMasteryLevel: 'beginner',
  candidates: mockCandidates,
  seed: 12345  // Same seed
});

console.log('✅ Same results with same seed?', JSON.stringify(result3a) === JSON.stringify(result3b));

console.log('\n🎉 Algorithm works without any external APIs!');
