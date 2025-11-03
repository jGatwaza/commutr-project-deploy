/**
 * Duration-fit video selector with de-duplication and topic filtering
 * 
 * Selects videos that fit within a time budget while applying:
 * - De-duplication by canonical ID
 * - Exclusion of specified IDs
 * - Topic filtering (case-insensitive)
 * - Tie-breaking by creator diversity and recency
 */

export interface Video {
  id: string;
  url: string;
  title: string;
  durationSec: number;
  topicTags?: string[];
  creatorId?: string;
  publishedAt?: string; // ISO 8601
}

export interface SelectVideosOptions {
  /** Candidate videos to select from */
  candidates: Video[];
  /** Target duration in seconds */
  remainingSeconds: number;
  /** IDs to exclude from selection */
  excludeIds?: string[];
  /** Topic to filter by (case-insensitive) */
  topic?: string;
  /** Overbook percentage (default 0.03 = 3%) */
  overbookPct?: number;
}

export interface SelectVideosResult {
  /** Selected videos */
  items: Video[];
  /** Total duration of selected videos */
  totalSec: number;
  /** Strategy used for selection */
  strategy: string;
}

/**
 * Selects videos that fit within remainingSeconds while respecting constraints
 * 
 * @param options - Selection options
 * @returns Selected videos with metadata
 */
export function selectVideos(options: SelectVideosOptions): SelectVideosResult {
  const {
    candidates,
    remainingSeconds,
    excludeIds = [],
    topic,
    overbookPct = 0.03,
  } = options;

  // Handle invalid inputs
  if (remainingSeconds <= 0 || candidates.length === 0) {
    return { items: [], totalSec: 0, strategy: 'empty' };
  }

  const maxDuration = remainingSeconds * (1 + overbookPct);

  // Apply filters
  let filtered = candidates;

  // Topic filter (case-insensitive)
  if (topic) {
    const topicLower = topic.toLowerCase();
    filtered = filtered.filter((video) =>
      video.topicTags?.some((tag) => tag.toLowerCase() === topicLower)
    );
  }

  // Exclude IDs
  if (excludeIds.length > 0) {
    const excludeSet = new Set(excludeIds);
    filtered = filtered.filter((video) => !excludeSet.has(video.id));
  }

  // De-duplicate by canonical ID (keep first occurrence)
  const seenIds = new Set<string>();
  filtered = filtered.filter((video) => {
    if (seenIds.has(video.id)) {
      return false;
    }
    seenIds.add(video.id);
    return true;
  });

  if (filtered.length === 0) {
    return { items: [], totalSec: 0, strategy: 'no-matches' };
  }

  // Try multiple greedy strategies
  const candidateResults: SelectVideosResult[] = [];
  
  // Strategy 1: Longest-first
  candidateResults.push(greedyFill(
    [...filtered].sort((a, b) => b.durationSec - a.durationSec),
    maxDuration,
    'longest-first'
  ));
  
  // Strategy 2: Shortest-first
  candidateResults.push(greedyFill(
    [...filtered].sort((a, b) => a.durationSec - b.durationSec),
    maxDuration,
    'shortest-first'
  ));
  
  // Strategy 3: Sort by creator diversity (different creators first)
  candidateResults.push(greedyFill(
    [...filtered].sort((a, b) => {
      // Prioritize videos with creatorIds
      const aHasCreator = a.creatorId ? 1 : 0;
      const bHasCreator = b.creatorId ? 1 : 0;
      if (aHasCreator !== bHasCreator) return bHasCreator - aHasCreator;
      // Then by duration descending
      return b.durationSec - a.durationSec;
    }),
    maxDuration,
    'creator-aware'
  ));
  
  // Strategy 4: Sort by recency (newer first)
  candidateResults.push(greedyFill(
    [...filtered].sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return b.durationSec - a.durationSec;
    }),
    maxDuration,
    'recency-first'
  ));

  // Pick the best selection using tie-breakers
  return selectBest(candidateResults);
}

/**
 * Select best result from candidates using tie-breakers
 */
function selectBest(candidates: SelectVideosResult[]): SelectVideosResult {
  if (candidates.length === 0) {
    return { items: [], totalSec: 0, strategy: 'empty' };
  }
  
  // Sort by: 1) total duration (desc), 2) creator diversity (desc), 3) recency (desc)
  const sorted = [...candidates].sort((a, b) => {
    // Primary: maximize total duration
    if (a.totalSec !== b.totalSec) {
      return b.totalSec - a.totalSec;
    }
    
    // Tie-breaker 1: maximize creator diversity
    const aCreators = countUniqueCreators(a.items);
    const bCreators = countUniqueCreators(b.items);
    if (aCreators !== bCreators) {
      return bCreators - aCreators;
    }
    
    // Tie-breaker 2: maximize recency
    const aRecency = averageRecency(a.items);
    const bRecency = averageRecency(b.items);
    return bRecency - aRecency;
  });
  
  return sorted[0]!;
}

/**
 * Greedy fill: select videos until maxDuration is reached
 */
function greedyFill(
  sortedVideos: Video[],
  maxDuration: number,
  strategy: string
): SelectVideosResult {
  const items: Video[] = [];
  let totalSec = 0;

  for (const video of sortedVideos) {
    if (totalSec + video.durationSec <= maxDuration) {
      items.push(video);
      totalSec += video.durationSec;
    }
  }

  return {
    items,
    totalSec,
    strategy,
  };
}

/**
 * Count unique creators in selection
 */
function countUniqueCreators(videos: Video[]): number {
  const creators = new Set<string>();
  for (const video of videos) {
    if (video.creatorId) {
      creators.add(video.creatorId);
    }
  }
  return creators.size;
}

/**
 * Calculate average recency (higher = newer)
 */
function averageRecency(videos: Video[]): number {
  if (videos.length === 0) return 0;

  let totalTime = 0;
  let count = 0;

  for (const video of videos) {
    if (video.publishedAt) {
      totalTime += new Date(video.publishedAt).getTime();
      count++;
    }
  }

  return count > 0 ? totalTime / count : 0;
}
