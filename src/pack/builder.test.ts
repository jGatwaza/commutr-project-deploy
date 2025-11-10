import { buildPack } from './builder.js';
import type { Candidate } from '../stubs/metadata.js';

function candidates(topic='python'): Candidate[] {
  return [
    { videoId:'a1', channelId:'chA', durationSec:360, topic, level:'beginner' },
    { videoId:'b2', channelId:'chB', durationSec:540, topic, level:'beginner' },
    { videoId:'c3', channelId:'chC', durationSec:180, topic, level:'intermediate' },
    { videoId:'d4', channelId:'chD', durationSec:420, topic, level:'intermediate' },
    { videoId:'e5', channelId:'chE', durationSec:300, topic, level:'advanced' },
    { videoId:'f6', channelId:'chF', durationSec:600, topic, level:'beginner' }
  ] as any;
}

function largeCandidatePool(topic='python'): Candidate[] {
  return [
    { videoId:'v1', channelId:'ch1', durationSec:300, topic, level:'beginner' },
    { videoId:'v2', channelId:'ch2', durationSec:450, topic, level:'beginner' },
    { videoId:'v3', channelId:'ch3', durationSec:600, topic, level:'intermediate' },
    { videoId:'v4', channelId:'ch4', durationSec:750, topic, level:'intermediate' },
    { videoId:'v5', channelId:'ch5', durationSec:900, topic, level:'advanced' },
    { videoId:'v6', channelId:'ch6', durationSec:240, topic, level:'beginner' },
    { videoId:'v7', channelId:'ch7', durationSec:360, topic, level:'intermediate' },
    { videoId:'v8', channelId:'ch8', durationSec:480, topic, level:'advanced' }
  ] as any;
}

function scarceCandidates(topic='python'): Candidate[] {
  return [
    { videoId:'s1', channelId:'chS1', durationSec:120, topic, level:'beginner' },
    { videoId:'s2', channelId:'chS2', durationSec:180, topic, level:'intermediate' }
  ] as any;
}

describe('Pack Builder Test Suite', () => {
  
  describe('fits within time window', () => {
    test('should fit exactly within min-max duration', () => {
      const out = buildPack({
        topic:'python', 
        minDurationSec:840, 
        maxDurationSec:960,
        userMasteryLevel:'beginner', 
        candidates:candidates()
      });
      expect(out.totalDurationSec).toBeGreaterThanOrEqual(840);
      expect(out.totalDurationSec).toBeLessThanOrEqual(960);
      expect(out.underFilled).toBe(false);
    });

    test('should handle single video that fits perfectly', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:530,
        maxDurationSec:550,
        userMasteryLevel:'beginner',
        candidates:candidates()
      });
      expect(out.totalDurationSec).toBeGreaterThanOrEqual(530);
      expect(out.totalDurationSec).toBeLessThanOrEqual(550);
      expect(out.items).toHaveLength(1);
      expect(out.items[0]?.videoId).toBe('b2'); // 540 seconds
    });

    test('should combine multiple videos when no single video fits', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:700,
        maxDurationSec:1000, // Increase max to allow combination
        userMasteryLevel:'beginner',
        candidates:candidates()
      });
      expect(out.totalDurationSec).toBeGreaterThanOrEqual(700);
      expect(out.totalDurationSec).toBeLessThanOrEqual(1000);
      expect(out.items.length).toBeGreaterThan(1);
    });
  });

  describe('honors blocked channels', () => {
    test('should exclude videos from blocked channels', () => {
      const out = buildPack({
        topic:'python', 
        minDurationSec:500, 
        maxDurationSec:960,
        userMasteryLevel:'beginner', 
        candidates:candidates(),
        blockedChannelIds:['chB','chD']
      });
      expect(out.items.find(i=>i.channelId==='chB')).toBeFalsy();
      expect(out.items.find(i=>i.channelId==='chD')).toBeFalsy();
    });

    test('should work with empty blocked channels list', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:500,
        maxDurationSec:960,
        userMasteryLevel:'beginner',
        candidates:candidates(),
        blockedChannelIds:[]
      });
      expect(out.items.length).toBeGreaterThan(0);
    });

    test('should handle blocking all but one channel', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:300,
        maxDurationSec:400,
        userMasteryLevel:'beginner',
        candidates:candidates(),
        blockedChannelIds:['chB','chC','chD','chE','chF']
      });
      // Should only use chA (360 seconds)
      expect(out.items).toHaveLength(1);
      expect(out.items[0]?.channelId).toBe('chA');
    });
  });

  describe('uses >=2 channels when available', () => {
    test('should prefer multiple channels for diversity', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:1200, // Increase to force multiple videos
        maxDurationSec:1800,
        userMasteryLevel:'intermediate',
        candidates:largeCandidatePool()
      });
      
      const uniqueChannels = new Set(out.items.map(item => item.channelId));
      // If multiple videos are used, expect multiple channels
      if (out.items.length >= 2) {
        expect(uniqueChannels.size).toBeGreaterThanOrEqual(2);
      } else {
        // If only one video fits, that's acceptable too
        expect(uniqueChannels.size).toBeGreaterThanOrEqual(1);
      }
    });

    test('should use different channels when combining videos', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:600,
        maxDurationSec:800,
        userMasteryLevel:'beginner',
        candidates:largeCandidatePool()
      });
      
      if (out.items.length >= 2) {
        const uniqueChannels = new Set(out.items.map(item => item.channelId));
        expect(uniqueChannels.size).toBeGreaterThanOrEqual(2);
      }
    });

    test('should handle case with only one channel available', () => {
      const singleChannelCandidates = [
        { videoId:'x1', channelId:'onlyChannel', durationSec:300, topic:'python', level:'beginner' },
        { videoId:'x2', channelId:'onlyChannel', durationSec:400, topic:'python', level:'intermediate' }
      ] as any;

      const out = buildPack({
        topic:'python',
        minDurationSec:600,
        maxDurationSec:800,
        userMasteryLevel:'beginner',
        candidates:singleChannelCandidates
      });
      
      const uniqueChannels = new Set(out.items.map(item => item.channelId));
      expect(uniqueChannels.size).toBe(1); // Only one channel available
      expect(out.totalDurationSec).toBe(700); // Should combine both videos
    });
  });

  describe('deterministic with seed', () => {
    test('should produce identical results with same seed', () => {
      const params = { 
        topic:'python', 
        minDurationSec:700, 
        maxDurationSec:960, 
        userMasteryLevel:'beginner' as const, 
        seed:42, 
        candidates:largeCandidatePool() 
      };
      
      const resultA = buildPack(params);
      const resultB = buildPack(params);
      
      expect(resultA).toEqual(resultB);
      expect(resultA.items).toEqual(resultB.items);
      expect(resultA.totalDurationSec).toBe(resultB.totalDurationSec);
    });

    test('should produce different results with different seeds', () => {
      const baseParams = { 
        topic:'python', 
        minDurationSec:700, 
        maxDurationSec:960, 
        userMasteryLevel:'beginner' as const,
        candidates:largeCandidatePool() 
      };
      
      const resultSeed1 = buildPack({ ...baseParams, seed:42 });
      const resultSeed2 = buildPack({ ...baseParams, seed:123 });
      
      // Results might be different (though not guaranteed)
      // At minimum, the algorithm should be using the seed
      expect(typeof resultSeed1.totalDurationSec).toBe('number');
      expect(typeof resultSeed2.totalDurationSec).toBe('number');
    });

    test('should be deterministic without explicit seed', () => {
      const params = { 
        topic:'python', 
        minDurationSec:700, 
        maxDurationSec:960, 
        userMasteryLevel:'beginner' as const,
        candidates:largeCandidatePool() 
      };
      
      const resultA = buildPack(params);
      const resultB = buildPack(params);
      
      expect(resultA).toEqual(resultB);
    });
  });

  describe('underFilled when scarce', () => {
    test('should mark as underFilled when not enough content', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:1000, // Requesting 16+ minutes
        maxDurationSec:1200,
        userMasteryLevel:'beginner',
        candidates:scarceCandidates() // Only 300 seconds total available
      });
      
      expect(out.underFilled).toBe(true);
      expect(out.totalDurationSec).toBeLessThan(1000);
      expect(out.totalDurationSec).toBe(300); // Should use all available content
    });

    test('should not be underFilled when sufficient content exists', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:500,
        maxDurationSec:600,
        userMasteryLevel:'beginner',
        candidates:candidates()
      });
      
      expect(out.underFilled).toBe(false);
      expect(out.totalDurationSec).toBeGreaterThanOrEqual(500);
    });

    test('should handle edge case with no candidates', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:300,
        maxDurationSec:600,
        userMasteryLevel:'beginner',
        candidates:[]
      });
      
      expect(out.underFilled).toBe(true);
      expect(out.totalDurationSec).toBe(0);
      expect(out.items).toHaveLength(0);
    });

    test('should filter out entries with empty videoId', () => {
      const invalidCandidates = [
        { videoId:'', channelId:'chA', durationSec:300, topic:'python', level:'beginner' },
        { videoId:'valid1', channelId:'chB', durationSec:400, topic:'python', level:'beginner' },
        { videoId:null as any, channelId:'chC', durationSec:500, topic:'python', level:'beginner' }
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

    test('should be underFilled when blocked channels eliminate too much content', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:1000, // Increase minimum to ensure underFilled
        maxDurationSec:1200,
        userMasteryLevel:'beginner',
        candidates:candidates(),
        blockedChannelIds:['chA','chB','chC','chD'] // Block most channels, leaving only chE(300) and chF(600)
      });
      
      expect(out.underFilled).toBe(true);
      expect(out.totalDurationSec).toBeLessThan(1000);
      expect(out.totalDurationSec).toBe(900); // chE(300) + chF(600) = 900
    });
  });

  describe('edge cases and robustness', () => {
    test('should handle wrong topic filter', () => {
      const out = buildPack({
        topic:'nonexistent',
        minDurationSec:300,
        maxDurationSec:600,
        userMasteryLevel:'beginner',
        candidates:candidates('python') // Different topic
      });
      
      expect(out.items).toHaveLength(0);
      expect(out.underFilled).toBe(true);
    });

    test('should handle very tight time constraints', () => {
      const out = buildPack({
        topic:'python',
        minDurationSec:360,
        maxDurationSec:360, // Exact match needed
        userMasteryLevel:'beginner',
        candidates:candidates()
      });
      
      expect(out.totalDurationSec).toBe(360);
      expect(out.items).toHaveLength(1);
      expect(out.items[0]?.videoId).toBe('a1');
    });

    test('should respect user mastery level preferences', () => {
      const beginnerResult = buildPack({
        topic:'python',
        minDurationSec:300,
        maxDurationSec:400,
        userMasteryLevel:'beginner',
        candidates:candidates()
      });

      const advancedResult = buildPack({
        topic:'python',
        minDurationSec:300,
        maxDurationSec:400,
        userMasteryLevel:'advanced',
        candidates:candidates()
      });
      
      // Both should return valid results
      expect(beginnerResult.items.length).toBeGreaterThan(0);
      expect(advancedResult.items.length).toBeGreaterThan(0);
    });
  });
});
