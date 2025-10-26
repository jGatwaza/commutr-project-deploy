import { buildPack } from './builder';
import type { Candidate } from '../stubs/metadata';

function candidates(topic='python'): Candidate[] {
  return [
    { videoId:'a1', channelId:'chA', durationSec:360, topic, level:'beginner' },
    { videoId:'b2', channelId:'chB', durationSec:540, topic, level:'beginner' },
    { videoId:'c3', channelId:'chC', durationSec:180, topic, level:'intermediate' },
    { videoId:'d4', channelId:'chD', durationSec:420, topic, level:'intermediate' }
  ] as any;
}

test('fits within time window', () => {
  const out = buildPack({
    topic:'python', minDurationSec:840, maxDurationSec:960,
    userMasteryLevel:'beginner', candidates:candidates()
  });
  expect(out.totalDurationSec).toBeGreaterThanOrEqual(840);
  expect(out.totalDurationSec).toBeLessThanOrEqual(960);
});

test('should filter out entries with durationSec <= 0', () => {
  const invalidCandidates = [
    { videoId:'invalid1', channelId:'chA', durationSec:0, topic:'python', level:'beginner' },
    { videoId:'invalid2', channelId:'chB', durationSec:-100, topic:'python', level:'beginner' },
    { videoId:'valid1', channelId:'chC', durationSec:400, topic:'python', level:'beginner' }
  ] as any;

  const out = buildPack({
    topic:'python',
    minDurationSec:350,
    maxDurationSec:450,
    userMasteryLevel:'beginner',
    candidates:invalidCandidates
  });
  
  // Should only include the valid video
  expect(out.items).toHaveLength(1);
  expect(out.items[0]?.videoId).toBe('valid1');
  expect(out.items[0]?.durationSec).toBe(400);
});

test('should maximize duration within time window', () => {
  const testCandidates = [
    { videoId:'v1', channelId:'chA', durationSec:300, topic:'test', level:'beginner' },
    { videoId:'v2', channelId:'chB', durationSec:400, topic:'test', level:'beginner' },
    { videoId:'v3', channelId:'chC', durationSec:500, topic:'test', level:'intermediate' }
  ] as any;

  const out = buildPack({
    topic:'test',
    minDurationSec:600,
    maxDurationSec:800,
    userMasteryLevel:'beginner',
    candidates:testCandidates
  });
  
  // Should pick v1(300) + v3(500) = 800 (perfect fit) instead of v1(300) + v2(400) = 700
  expect(out.totalDurationSec).toBe(800);
  expect(out.underFilled).toBe(false);
  expect(out.items).toHaveLength(2);
  
  const videoIds = out.items.map(item => item.videoId).sort();
  expect(videoIds).toEqual(['v1', 'v3']);
});

test('should optimize by replacing smaller videos with larger ones', () => {
  const testCandidates = [
    { videoId:'small1', channelId:'chA', durationSec:100, topic:'test', level:'beginner' },
    { videoId:'small2', channelId:'chB', durationSec:150, topic:'test', level:'beginner' },
    { videoId:'large1', channelId:'chC', durationSec:400, topic:'test', level:'intermediate' }
  ] as any;

  const out = buildPack({
    topic:'test',
    minDurationSec:300,
    maxDurationSec:450,
    userMasteryLevel:'beginner',
    candidates:testCandidates
  });
  
  // Should pick large1(400) instead of small1(100) + small2(150) = 250
  expect(out.totalDurationSec).toBe(400);
  expect(out.underFilled).toBe(false);
  expect(out.items).toHaveLength(1);
  expect(out.items[0]?.videoId).toBe('large1');
});

test('should handle edge case where optimization creates perfect fit', () => {
  const testCandidates = [
    { videoId:'v1', channelId:'chA', durationSec:200, topic:'test', level:'beginner' },
    { videoId:'v2', channelId:'chB', durationSec:300, topic:'test', level:'beginner' },
    { videoId:'v3', channelId:'chC', durationSec:600, topic:'test', level:'intermediate' }
  ] as any;

  const out = buildPack({
    topic:'test',
    minDurationSec:550,
    maxDurationSec:600,
    userMasteryLevel:'beginner',
    candidates:testCandidates
  });
  
  // Should pick v3(600) which is perfect fit, instead of v1(200) + v2(300) = 500
  expect(out.totalDurationSec).toBe(600);
  expect(out.underFilled).toBe(false);
  expect(out.items).toHaveLength(1);
  expect(out.items[0]?.videoId).toBe('v3');
});

test('honors blocked channels', () => {
  const out = buildPack({
    topic:'python', minDurationSec:500, maxDurationSec:960,
    userMasteryLevel:'beginner', candidates:candidates(),
    blockedChannelIds:['chB','chD']
  });
  expect(out.items.find(i=>i.channelId==='chB')).toBeFalsy();
  expect(out.items.find(i=>i.channelId==='chD')).toBeFalsy();
});

test('deterministic with seed', () => {
  const a = buildPack({ topic:'python', minDurationSec:700, maxDurationSec:960, userMasteryLevel:'beginner', seed:42, candidates:candidates() });
  const b = buildPack({ topic:'python', minDurationSec:700, maxDurationSec:960, userMasteryLevel:'beginner', seed:42, candidates:candidates() });
  expect(a).toEqual(b);
});
