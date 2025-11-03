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

  // Try two greedy strategies: longest-first and shortest-first
  const longestFirst = greedyFill(
    [...filtered].sort((a, b) => b.durationSec - a.durationSec),
    maxDuration
  );
  const shortestFirst = greedyFill(
    [...filtered].sort((a, b) => a.durationSec - b.durationSec),
    maxDuration
  );

  // Pick the better fill
  let bestSelection = longestFirst;
  let strategy = 'longest-first';

  if (shortestFirst.totalSec > longestFirst.totalSec) {
    bestSelection = shortestFirst;
    strategy = 'shortest-first';
  } else if (shortestFirst.totalSec === longestFirst.totalSec) {
    // Tie-breaker: prefer more creator diversity
    const longestCreators = countUniqueCreators(longestFirst.items);
    const shortestCreators = countUniqueCreators(shortestFirst.items);

    if (shortestCreators > longestCreators) {
      bestSelection = shortestFirst;
      strategy = 'shortest-first-diversity';
    } else if (shortestCreators === longestCreators) {
      // Tie-breaker: prefer newer content
      const longestRecency = averageRecency(longestFirst.items);
      const shortestRecency = averageRecency(shortestFirst.items);

      if (shortestRecency > longestRecency) {
        bestSelection = shortestFirst;
        strategy = 'shortest-first-recency';
      }
    }
  }

  return bestSelection;
}

/**
 * Greedy fill: select videos until maxDuration is reached
 */
function greedyFill(
  sortedVideos: Video[],
  maxDuration: number
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
    strategy: 'greedy',
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
