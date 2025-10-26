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
