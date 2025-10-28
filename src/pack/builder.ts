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
 * Build a deterministic playlist pack from candidates
 * @param cands - Array of video candidates
 * @param req - Pack requirements (topic, level, target duration)
 * @returns Pack with selected videos
 */
export function buildPack(cands: Candidate[], req: PackReq): Pack {
  const { topic, level, targetSeconds } = req;
  const minDuration = targetSeconds - 60;
  const maxDuration = targetSeconds + 60;

  // Step 1: Filter by topic and level
  const filtered = cands.filter((c) => {
    // Match level
    if (c.level !== level) return false;
    
    // Match topic: check if topicTags includes the topic
    if (c.topicTags && c.topicTags.includes(topic)) return true;
    
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
