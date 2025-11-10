import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * WatchedEntry represents a single watched video record.
 * Tracks user video completion with metadata for history display.
 */
export type WatchedEntry = {
  id: string;                 // unique, stable enough for UI keys
  userId: string;
  videoId: string;
  title: string;
  durationSec: number;
  topicTags?: string[];
  startedAt?: string;         // ISO
  completedAt?: string;       // ISO; used for recency sorting
  progressPct?: number;       // 0..100
  source?: string;            // e.g., "youtube"
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
};

export type WatchedEntryInput = Omit<WatchedEntry, 'id' | 'createdAt' | 'updatedAt'>;

type WatchedStore = {
  entries: WatchedEntry[];
};

// Storage path
const DATA_DIR = join(__dirname, '../../data');
const WATCHED_FILE = join(DATA_DIR, 'watched.json');

// Helper: Generate CUID-like ID
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `w${timestamp}${random}`;
}

/**
 * Load watched entries from file.
 * If file is malformed or missing, returns empty structure.
 * This ensures resilience against corrupted JSON.
 */
function loadWatched(): WatchedStore {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (!existsSync(WATCHED_FILE)) {
    return { entries: [] };
  }
  
  try {
    const data = readFileSync(WATCHED_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    // Malformed JSON: reset to empty structure with a warning
    console.error('Error loading watched.json (resetting to empty):', error);
    return { entries: [] };
  }
}

/**
 * Save watched entries to file.
 */
function saveWatched(store: WatchedStore): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  try {
    writeFileSync(WATCHED_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving watched.json:', error);
    throw new Error('Failed to save watched entries');
  }
}

/**
 * Helper: Clear all watched entries (for testing).
 */
export function clearWatched(): void {
  saveWatched({ entries: [] });
}

/**
 * Upsert a watched entry.
 * 
 * Deduplication rule:
 * - Two entries are "the same" if (userId, videoId) match.
 * - When a duplicate is found:
 *   1. Prefer whichever has the newer completedAt timestamp.
 *   2. If completedAt is missing on either side, tiebreak by newer updatedAt/createdAt.
 *   3. Never replace a newer completion with an older one.
 * 
 * This ensures that if a user re-watches a video, we keep the most recent completion.
 */
export function upsertWatched(input: WatchedEntryInput): WatchedEntry {
  const store = loadWatched();
  const now = new Date().toISOString();
  
  // Find existing entry with same (userId, videoId)
  const existingIndex = store.entries.findIndex(
    e => e.userId === input.userId && e.videoId === input.videoId
  );
  
  if (existingIndex === -1) {
    // No existing entry: create new
    const newEntry: WatchedEntry = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now
    };
    store.entries.push(newEntry);
    saveWatched(store);
    return newEntry;
  }
  
  // Existing entry found: apply dedup/recency rule
  const existing = store.entries[existingIndex]!;
  
  // Determine which entry is "newer" based on completedAt
  const existingCompleted = existing.completedAt ? new Date(existing.completedAt).getTime() : 0;
  const inputCompleted = input.completedAt ? new Date(input.completedAt).getTime() : 0;
  
  let shouldUpdate = false;
  
  if (inputCompleted > 0 && existingCompleted > 0) {
    // Both have completedAt: prefer newer
    shouldUpdate = inputCompleted >= existingCompleted;
  } else if (inputCompleted > 0 && existingCompleted === 0) {
    // Input has completedAt, existing doesn't: prefer input
    shouldUpdate = true;
  } else if (inputCompleted === 0 && existingCompleted > 0) {
    // Existing has completedAt, input doesn't: keep existing
    shouldUpdate = false;
  } else {
    // Neither has completedAt: tiebreak by updatedAt/createdAt
    const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
    const inputTime = Date.now(); // Current time for new input
    shouldUpdate = inputTime >= existingTime;
  }
  
  if (shouldUpdate) {
    // Update existing entry with new data
    const updatedEntry: WatchedEntry = {
      ...existing,
      ...input,
      id: existing.id,           // Keep original ID
      createdAt: existing.createdAt, // Keep original createdAt
      updatedAt: now
    };
    store.entries[existingIndex] = updatedEntry;
    saveWatched(store);
    return updatedEntry;
  } else {
    // Keep existing entry (newer completion already exists)
    return existing;
  }
}

/**
 * List watched entries with pagination and filtering.
 * 
 * Sorting order (stable for pagination):
 * 1. completedAt desc (if present)
 * 2. updatedAt desc
 * 3. createdAt desc
 * 
 * Pagination:
 * - Uses opaque cursor (base64-encoded offset) to continue paging.
 * - Guarantees no duplicates across pages for a static dataset.
 * - Cursor is stable as long as the filter set doesn't change.
 * 
 * Filters:
 * - userId: required, filters to specific user
 * - q: optional, case-insensitive substring match on title
 * - limit: 1-100, default 20
 * - cursor: opaque token to continue from previous page
 */
export function listWatched(options: {
  userId: string;
  limit?: number;
  cursor?: string;
  q?: string;
}): { items: WatchedEntry[]; nextCursor?: string } {
  const { userId, limit = 20, cursor, q } = options;
  const store = loadWatched();
  
  // Validate limit
  const validLimit = Math.max(1, Math.min(100, limit));
  
  // Filter by userId
  let filtered = store.entries.filter(e => e.userId === userId);
  
  // Filter by title search (case-insensitive)
  if (q && q.trim()) {
    const lowerQ = q.toLowerCase();
    filtered = filtered.filter(e => e.title.toLowerCase().includes(lowerQ));
  }
  
  // Sort by: completedAt desc, updatedAt desc, createdAt desc
  // This ensures stable ordering for pagination
  filtered.sort((a, b) => {
    // 1. completedAt desc (treat missing as epoch 0)
    const aCompleted = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bCompleted = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    if (bCompleted !== aCompleted) return bCompleted - aCompleted;
    
    // 2. updatedAt desc
    const aUpdated = new Date(a.updatedAt).getTime();
    const bUpdated = new Date(b.updatedAt).getTime();
    if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    
    // 3. createdAt desc
    const aCreated = new Date(a.createdAt).getTime();
    const bCreated = new Date(b.createdAt).getTime();
    return bCreated - aCreated;
  });
  
  // Decode cursor to get offset
  let offset = 0;
  if (cursor) {
    try {
      offset = parseInt(Buffer.from(cursor, 'base64').toString('utf-8'), 10);
      if (isNaN(offset) || offset < 0) offset = 0;
    } catch {
      offset = 0;
    }
  }
  
  // Paginate
  const items = filtered.slice(offset, offset + validLimit);
  
  // Generate next cursor if there are more items
  let nextCursor: string | undefined;
  if (offset + validLimit < filtered.length) {
    const nextOffset = offset + validLimit;
    nextCursor = Buffer.from(nextOffset.toString()).toString('base64');
  }
  
  return { items, nextCursor };
}

/**
 * Get list of video IDs watched by a user, optionally filtered by topic.
 */
export function getWatchedVideoIds(userId: string, topic?: string): string[] {
  const store = loadWatched();
  let entries = store.entries.filter(e => e.userId === userId);
  
  // Filter by topic if provided
  if (topic) {
    entries = entries.filter(e => 
      e.topicTags && e.topicTags.some(tag => 
        tag.toLowerCase() === topic.toLowerCase()
      )
    );
  }
  
  return entries.map(e => e.videoId);
}

/**
 * Analytics types
 */
export type TopicStat = {
  topic: string;
  videoCount: number;
  totalDuration: number;
  avgCompletion: number;
};

export type CommuteLengthStat = {
  commuteLength: string; // '5min', '10min', '15min'
  videoCount: number;
  totalDuration: number;
};

export type TimeOfDayStat = {
  timePeriod: string; // 'morning', 'afternoon', 'evening'
  videoCount: number;
  totalDuration: number;
};

export type WeeklyTrendStat = {
  week: string; // ISO date string
  videoCount: number;
  totalDuration: number;
};

export type AnalyticsData = {
  byTopic: TopicStat[];
  byCommuteLength: CommuteLengthStat[];
  byTimeOfDay: TimeOfDayStat[];
  completionRate: { completionRate: number; totalVideos: number };
  streak: number;
  weeklyTrend: WeeklyTrendStat[];
};

/**
 * Get analytics for a user's watch history.
 * Calculates aggregated statistics across multiple dimensions.
 */
export function getWatchAnalytics(userId: string, timeframe: 'week' | 'month' | 'all' = 'month'): AnalyticsData {
  const store = loadWatched();
  
  // Filter by userId and timeframe
  let entries = store.entries.filter(e => e.userId === userId);
  
  // Apply timeframe filter
  const now = new Date();
  if (timeframe === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    entries = entries.filter(e => {
      const completedAt = e.completedAt ? new Date(e.completedAt) : new Date(e.updatedAt);
      return completedAt >= weekAgo;
    });
  } else if (timeframe === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    entries = entries.filter(e => {
      const completedAt = e.completedAt ? new Date(e.completedAt) : new Date(e.updatedAt);
      return completedAt >= monthAgo;
    });
  }
  
  // 1. By Topic
  const topicMap = new Map<string, { count: number; duration: number; totalProgress: number }>();
  entries.forEach(entry => {
    if (entry.topicTags && entry.topicTags.length > 0) {
      entry.topicTags.forEach(topic => {
        const existing = topicMap.get(topic) || { count: 0, duration: 0, totalProgress: 0 };
        topicMap.set(topic, {
          count: existing.count + 1,
          duration: existing.duration + entry.durationSec,
          totalProgress: existing.totalProgress + (entry.progressPct || 0)
        });
      });
    }
  });
  
  const byTopic: TopicStat[] = Array.from(topicMap.entries())
    .map(([topic, stats]) => ({
      topic,
      videoCount: stats.count,
      totalDuration: stats.duration,
      avgCompletion: stats.count > 0 ? stats.totalProgress / stats.count : 0
    }))
    .sort((a, b) => b.totalDuration - a.totalDuration);
  
  // 2. By Commute Length
  const commuteLengthMap = new Map<string, { count: number; duration: number }>();
  entries.forEach(entry => {
    let bucket: string;
    if (entry.durationSec <= 300) bucket = '5min';
    else if (entry.durationSec <= 600) bucket = '10min';
    else bucket = '15min';
    
    const existing = commuteLengthMap.get(bucket) || { count: 0, duration: 0 };
    commuteLengthMap.set(bucket, {
      count: existing.count + 1,
      duration: existing.duration + entry.durationSec
    });
  });
  
  const byCommuteLength: CommuteLengthStat[] = Array.from(commuteLengthMap.entries())
    .map(([commuteLength, stats]) => ({
      commuteLength,
      videoCount: stats.count,
      totalDuration: stats.duration
    }))
    .sort((a, b) => {
      const order = { '5min': 1, '10min': 2, '15min': 3 };
      return order[a.commuteLength as keyof typeof order] - order[b.commuteLength as keyof typeof order];
    });
  
  // 3. By Time of Day
  const timeOfDayMap = new Map<string, { count: number; duration: number }>();
  entries.forEach(entry => {
    const timestamp = entry.completedAt || entry.updatedAt;
    const date = new Date(timestamp);
    const hour = date.getHours();
    
    let period: string;
    if (hour < 12) period = 'morning';
    else if (hour < 18) period = 'afternoon';
    else period = 'evening';
    
    const existing = timeOfDayMap.get(period) || { count: 0, duration: 0 };
    timeOfDayMap.set(period, {
      count: existing.count + 1,
      duration: existing.duration + entry.durationSec
    });
  });
  
  const byTimeOfDay: TimeOfDayStat[] = Array.from(timeOfDayMap.entries())
    .map(([timePeriod, stats]) => ({
      timePeriod,
      videoCount: stats.count,
      totalDuration: stats.duration
    }))
    .sort((a, b) => {
      const order = { 'morning': 1, 'afternoon': 2, 'evening': 3 };
      return order[a.timePeriod as keyof typeof order] - order[b.timePeriod as keyof typeof order];
    });
  
  // 4. Completion Rate
  const completedCount = entries.filter(e => (e.progressPct || 0) >= 90).length;
  const totalVideos = entries.length;
  const completionRate = totalVideos > 0 ? (completedCount / totalVideos) * 100 : 0;
  
  // 5. Learning Streak
  const streak = calculateStreak(userId);
  
  // 6. Weekly Trend (last 12 weeks)
  const weeklyMap = new Map<string, { count: number; duration: number }>();
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  
  store.entries
    .filter(e => e.userId === userId)
    .forEach(entry => {
      const timestamp = entry.completedAt || entry.updatedAt;
      const date = new Date(timestamp);
      
      if (date >= twelveWeeksAgo) {
        // Get start of week (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const existing = weeklyMap.get(weekKey) || { count: 0, duration: 0 };
        weeklyMap.set(weekKey, {
          count: existing.count + 1,
          duration: existing.duration + entry.durationSec
        });
      }
    });
  
  const weeklyTrend: WeeklyTrendStat[] = Array.from(weeklyMap.entries())
    .map(([week, stats]) => ({
      week,
      videoCount: stats.count,
      totalDuration: stats.duration
    }))
    .sort((a, b) => b.week.localeCompare(a.week)); // Most recent first
  
  return {
    byTopic,
    byCommuteLength,
    byTimeOfDay,
    completionRate: { completionRate, totalVideos },
    streak,
    weeklyTrend
  };
}

/**
 * Calculate learning streak (consecutive days with watch activity).
 */
function calculateStreak(userId: string): number {
  const store = loadWatched();
  const entries = store.entries.filter(e => e.userId === userId);
  
  if (entries.length === 0) return 0;
  
  // Get unique dates (YYYY-MM-DD) sorted descending
  const dates = Array.from(new Set(
    entries.map(e => {
      const timestamp = e.completedAt || e.updatedAt;
      return new Date(timestamp).toISOString().split('T')[0];
    })
  )).sort().reverse();
  
  if (dates.length === 0) return 0;
  
  // Check if today or yesterday has activity
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0; // Streak is broken
  }
  
  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const currentDate = new Date(dates[i - 1]);
    const prevDate = new Date(dates[i]);
    const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
}
