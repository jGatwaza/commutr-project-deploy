import type { Level } from '../stubs/mastery';
import type { Candidate } from '../stubs/metadata';

export type BuildPackInput = {
  topic: string;
  minDurationSec: number;
  maxDurationSec: number;
  userMasteryLevel: Level;
  blockedChannelIds?: string[];
  seed?: number;
  candidates: Candidate[];
};
export type BuildPackOutput = {
  items: { videoId: string; durationSec: number; channelId: string }[];
  totalDurationSec: number;
  underFilled: boolean;
};

function rng(seed = 7) { let s = seed; return () => (s = (s*9301+49297)%233280)/233280; }
function levelScore(c: Candidate, target: Level) {
  const order: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };
  const diff = Math.abs(order[c.level] - (order[target] + 1)); // prefer +1 harder
  return -diff;
}

export function buildPack(input: BuildPackInput): BuildPackOutput {
  const { minDurationSec, maxDurationSec, blockedChannelIds = [], topic } = input;
  
  // Filter videos for the topic and remove blocked channels
  let pool = input.candidates
    .filter(c => c.topic === topic)
    .filter(c => !blockedChannelIds.includes(c.channelId));

  const out: BuildPackOutput = { items: [], totalDurationSec: 0, underFilled: false };
  
  // First, try to find a single video that fits perfectly
  const perfectFit = pool.find(c => c.durationSec >= minDurationSec && c.durationSec <= maxDurationSec);
  if (perfectFit) {
    out.items.push({ videoId: perfectFit.videoId, durationSec: perfectFit.durationSec, channelId: perfectFit.channelId });
    out.totalDurationSec = perfectFit.durationSec;
    return out;
  }

  // If no perfect fit, combine multiple videos
  // Sort by duration (shortest first) to build up gradually
  pool = pool.sort((a, b) => a.durationSec - b.durationSec);
  
  // Use a greedy approach to maximize duration within the time window
  const usedChannels = new Set<string>();
  
  // Continue adding videos until we can't fit any more (maximize duration)
  for (const video of pool) {
    // Skip if adding this video would exceed max duration
    if (out.totalDurationSec + video.durationSec > maxDurationSec) {
      continue;
    }
    
    // Skip if we already used this video
    if (out.items.some(item => item.videoId === video.videoId)) {
      continue;
    }
    
    // Add the video
    out.items.push({ videoId: video.videoId, durationSec: video.durationSec, channelId: video.channelId });
    out.totalDurationSec += video.durationSec;
    usedChannels.add(video.channelId);
  }
  
  // Try to optimize by replacing smaller videos with larger ones that still fit
  let improved = true;
  while (improved) {
    improved = false;
    
    for (let i = 0; i < out.items.length; i++) {
      const currentItem = out.items[i];
      const currentDuration = out.totalDurationSec;
      
      // Find a replacement video that would give us more total duration
      const betterVideo = pool.find(video => 
        !out.items.some(item => item.videoId === video.videoId) &&
        video.durationSec > currentItem.durationSec &&
        currentDuration - currentItem.durationSec + video.durationSec <= maxDurationSec
      );
      
      if (betterVideo) {
        // Replace the current video with the better one
        out.totalDurationSec = out.totalDurationSec - currentItem.durationSec + betterVideo.durationSec;
        out.items[i] = { videoId: betterVideo.videoId, durationSec: betterVideo.durationSec, channelId: betterVideo.channelId };
        improved = true;
        break; // Start over to check for more improvements
      }
    }
  }
  
  // Check if we couldn't fill the minimum time
  if (out.totalDurationSec < minDurationSec) {
    out.underFilled = true;
  }
  
  return out;
}
