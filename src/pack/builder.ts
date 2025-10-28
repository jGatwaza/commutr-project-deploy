import type { Level } from '../stubs/mastery.js';
import type { Candidate } from '../stubs/metadata.js';

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
  
  // Use a greedy approach to fill the time slot
  const usedChannels = new Set<string>();
  
  for (const video of pool) {
    // Skip if adding this video would exceed max duration
    if (out.totalDurationSec + video.durationSec > maxDurationSec) {
      continue;
    }
    
    // Add the video
    out.items.push({ videoId: video.videoId, durationSec: video.durationSec, channelId: video.channelId });
    out.totalDurationSec += video.durationSec;
    usedChannels.add(video.channelId);
    
    // Stop if we've reached or exceeded the minimum duration
    if (out.totalDurationSec >= minDurationSec) {
      break;
    }
  }
  
  // Keep trying to add more videos until we reach minimum duration or can't fit any more
  while (out.totalDurationSec < minDurationSec) {
    const additionalVideo = pool.find(video => 
      out.totalDurationSec + video.durationSec <= maxDurationSec &&
      !out.items.some(item => item.videoId === video.videoId)
    );
    
    if (additionalVideo) {
      out.items.push({ videoId: additionalVideo.videoId, durationSec: additionalVideo.durationSec, channelId: additionalVideo.channelId });
      out.totalDurationSec += additionalVideo.durationSec;
    } else {
      // No more videos can fit, break out of the loop
      break;
    }
  }
  
  // Check if we couldn't fill the minimum time
  if (out.totalDurationSec < minDurationSec) {
    out.underFilled = true;
  }
  
  return out;
}
