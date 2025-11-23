/**
 * Deterministic Playlist Pack Builder
 * 
 * Algorithm: Greedy knapsack with deterministic pre-sort
 * 1. Filter candidates by topic (tag match: topicTags includes topic) and level
 * 2. Sort deterministically: durationSec ASC, then videoId ASC
 * 3. Greedy select: iterate sorted list, add if fits within [target-60, target+60]
 * 4. Enforce upper bound (target+60), no duplicates
 * 5. Mark underFilled if totalDurationSec < target-60
 * 
 * Time Complexity: O(n log n) for sort + O(n) for greedy = O(n log n)
 * Space Complexity: O(n) for filtered/sorted array
 */

// ============================================================================
// NEW API (for new pack builder requirements)
// ============================================================================

export type Candidate = {
  videoId: string;
  durationSec: number;
  title?: string;
  channelTitle?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  topicTags?: string[];
};

export type PackReq = {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  targetSeconds: number;
};

export type Pack = {
  totalDurationSec: number;
  underFilled: boolean;
  items: Array<{ videoId: string; durationSec: number }>;
};

/**
 * Build a deterministic playlist pack from candidates (NEW API)
 * @param cands - Array of video candidates
 * @param req - Pack requirements (topic, level, target duration)
 * @returns Pack with selected videos
 */
export function buildPackV2(cands: Candidate[], req: PackReq): Pack {
  const { topic, level, targetSeconds } = req;
  const minDuration = targetSeconds - 60;
  const maxDuration = targetSeconds + 60;

  // Step 1: Filter by topic and level
  const filtered = cands.filter((c) => {
    // Match level
    if (c.level !== level) return false;
    
    // Match topic: check if topicTags includes the topic (case-insensitive)
    const topicLower = topic.toLowerCase();
    if (c.topicTags && c.topicTags.some(tag => tag.toLowerCase() === topicLower)) return true;
    
    return false;
  });

  // Step 2: Deterministic sort (durationSec ASC, videoId ASC)
  const sorted = filtered.slice().sort((a, b) => {
    if (a.durationSec !== b.durationSec) {
      return a.durationSec - b.durationSec;
    }
    return a.videoId.localeCompare(b.videoId);
  });

  // Step 3: Greedy selection
  const selected: Array<{ videoId: string; durationSec: number }> = [];
  const usedIds = new Set<string>();
  let totalDurationSec = 0;

  for (const candidate of sorted) {
    // Skip duplicates
    if (usedIds.has(candidate.videoId)) continue;

    // Check if adding this video would exceed max duration
    if (totalDurationSec + candidate.durationSec <= maxDuration) {
      selected.push({
        videoId: candidate.videoId,
        durationSec: candidate.durationSec,
      });
      usedIds.add(candidate.videoId);
      totalDurationSec += candidate.durationSec;
    }
  }

  // Step 4: Determine if underFilled
  const underFilled = totalDurationSec < minDuration;

  return {
    totalDurationSec,
    underFilled,
    items: selected,
  };
}

// ============================================================================
// OLD API (for backward compatibility with existing playlist router)
// ============================================================================

import type { Level } from '../stubs/mastery.js';
import type { Candidate as OldCandidate } from '../stubs/metadata.js';

export type BuildPackInput = {
  topic: string;
  minDurationSec: number;
  maxDurationSec: number;
  userMasteryLevel: Level;
  blockedChannelIds?: string[];
  seed?: number;
  candidates: OldCandidate[];
};

export type BuildPackOutput = {
  items: { videoId: string; durationSec: number; channelId: string }[];
  totalDurationSec: number;
  underFilled: boolean;
};

/**
 * Legacy buildPack function for backward compatibility
 * Used by playlist router
 */
export function buildPack(input: BuildPackInput): BuildPackOutput {
  const { minDurationSec, maxDurationSec, blockedChannelIds = [], topic } = input;
  
  // Filter videos for the topic and remove blocked channels
  let pool = input.candidates
    .filter(c => c.topic === topic)
    .filter(c => !blockedChannelIds.includes(c.channelId));

  const out: BuildPackOutput = { items: [], totalDurationSec: 0, underFilled: false };
  
  // Sort by duration (shortest first) to build up gradually
  pool = pool.sort((a, b) => a.durationSec - b.durationSec);
  
  for (const video of pool) {
    // Skip if adding this video would exceed max duration
    if (out.totalDurationSec + video.durationSec > maxDurationSec) {
      continue;
    }
    
    // Add the video
    out.items.push({ videoId: video.videoId, durationSec: video.durationSec, channelId: video.channelId });
    out.totalDurationSec += video.durationSec;
    
    // Continue adding videos to fill closer to target (don't stop at minimum)
    // Only stop if we're close to max duration
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
      break;
    }
  }
  
  // Check if we couldn't fill the minimum time
  if (out.totalDurationSec < minDurationSec) {
    out.underFilled = true;
  }
  
  return out;
}
